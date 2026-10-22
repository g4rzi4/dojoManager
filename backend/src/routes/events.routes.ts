import { Router } from "express";

import { prisma } from "../lib/prisma";
import { notifyNewEvent } from "../lib/notifications";
import { requireAuth, requirePermission } from "../middleware/auth";
import { EventCategory, Role } from "../generated/prisma/enums";

const router = Router();

/**
 * GET /events
 *
 * El calendario del dojo. Lo ven todos los roles, porque las clases,
 * exámenes y torneos son información que alumnos y tutores necesitan.
 *
 * Solo lectura: crear, editar y borrar eventos es del módulo feature/events,
 * que debe protegerlo con requirePermission("events:write").
 */
router.get(
  "/",
  requireAuth,
  requirePermission("events:read"),
  async (_req, res) => {
    const events = await prisma.event.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: { createdBy: { select: { name: true } } },
    });

    return res.json({
      success: true,
      events: events.map((e) => ({
        id: String(e.id),
        title: e.title,
        // Las columnas @db.Date vienen como medianoche UTC: leer en UTC da
        // la fecha correcta. Con getters locales, en México daría un día menos.
        date: e.date.toISOString().slice(0, 10),
        time: e.time ?? undefined,
        category: e.category,
        createdBy: e.createdBy?.name ?? null,
      })),
    });
  }
);

/** Las categorías válidas, para validar lo que llega del cliente. */
const CATEGORIAS = Object.values(EventCategory) as string[];

/**
 * POST /events
 *
 * Agrega un evento al calendario. Admin y profesores (events:write).
 *
 * Avisa por notificación a alumnos y tutores activos, porque un examen o un
 * torneo nuevo es justo lo que la familia necesita saber.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("events:write"),
  async (req, res) => {
    const { title, date, time, category } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "El evento necesita un título.",
      });
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return res.status(400).json({
        success: false,
        message: "La fecha debe venir como AAAA-MM-DD.",
      });
    }

    if (typeof category !== "string" || !CATEGORIAS.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Categoría no válida. Opciones: ${CATEGORIAS.join(", ")}.`,
      });
    }

    // La hora es opcional: sin ella, el evento dura todo el día.
    let hora: string | null = null;

    if (typeof time === "string" && time.trim().length > 0) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
        return res.status(400).json({
          success: false,
          message: "La hora debe venir como HH:MM, de 00:00 a 23:59.",
        });
      }

      hora = time.trim();
    }

    const [year, month, day] = date.trim().split("-").map(Number);

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        // UTC sin hora, igual que el resto de columnas @db.Date.
        date: new Date(Date.UTC(year, month - 1, day)),
        time: hora,
        category: category as EventCategory,
        createdById: req.user!.id,
      },
    });

    // Avisa a las familias. Si falla, el evento ya quedó creado: no tiene
    // sentido deshacerlo porque no se pudo notificar.
    try {
      const familias = await prisma.user.findMany({
        where: { role: { in: [Role.ALUMNO, Role.TUTOR] }, active: true },
        select: { id: true },
      });

      await notifyNewEvent(
        event.id,
        event.title,
        date.trim(),
        familias.map((u) => u.id)
      );
    } catch (error) {
      console.error("[events] no se pudo notificar el evento nuevo", error);
    }

    return res.status(201).json({
      success: true,
      event: {
        id: String(event.id),
        title: event.title,
        date: event.date.toISOString().slice(0, 10),
        time: event.time ?? undefined,
        category: event.category,
      },
    });
  }
);

/**
 * DELETE /events/:id
 *
 * Quita un evento del calendario. Admin y profesores (events:write).
 *
 * Borrado real, no lógico: un evento cancelado no aporta nada al historial,
 * a diferencia de un alumno dado de baja.
 */
router.delete(
  "/:id",
  requireAuth,
  requirePermission("events:write"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del evento no es válido.",
      });
    }

    const result = await prisma.event.deleteMany({ where: { id } });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "No existe ese evento.",
      });
    }

    return res.json({ success: true });
  }
);

export default router;
