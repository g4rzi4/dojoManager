import { Router } from "express";

import { prisma } from "../lib/prisma";
import { ownStudentIds } from "../lib/access";
import { sendAnnouncement, syncPaymentNotifications } from "../lib/notifications";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Role } from "../generated/prisma/enums";

const router = Router();

/** Cuántas notificaciones devolvemos como máximo. */
const LIMITE = 50;

/**
 * GET /notifications
 *
 * La bandeja del usuario con la sesión abierta. Nunca recibe un id de
 * usuario: se resuelve desde el token, así nadie puede leer la bandeja ajena.
 */
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;

  // Antes de listar, genera las notificaciones automáticas de pagos que
  // falten. Es idempotente, así que recargar no duplica nada.
  if (user.role === Role.ALUMNO || user.role === Role.TUTOR) {
    const propios = await ownStudentIds(user);
    await syncPaymentNotifications(propios);
  }

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: LIMITE,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return res.json({
    success: true,
    unread,
    notifications: notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      topic: n.topic,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
      author: n.createdBy?.name ?? null,
    })),
  });
});

/**
 * PATCH /notifications/:id/read
 *
 * Marca una notificación como leída.
 */
router.patch("/:id/read", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "El id de la notificación no es válido.",
    });
  }

  // updateMany con userId en el where: así una notificación de otro usuario
  // simplemente no coincide, en lugar de necesitar una consulta aparte para
  // comprobar de quién es.
  const result = await prisma.notification.updateMany({
    where: { id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });

  return res.json({ success: true, actualizadas: result.count });
});

/**
 * POST /notifications/read-all
 *
 * Marca toda la bandeja como leída.
 */
router.post("/read-all", requireAuth, async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });

  return res.json({ success: true, actualizadas: result.count });
});

/**
 * POST /notifications/announcements
 *
 * Avisos que redacta el dojo. Solo ADMIN y PROFESOR.
 */
router.post(
  "/announcements",
  requireAuth,
  requirePermission("notifications:send"),
  async (req, res) => {
    const { title, body, audience } = req.body ?? {};

    if (
      typeof title !== "string" ||
      title.trim().length === 0 ||
      typeof body !== "string" ||
      body.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "El aviso necesita título y mensaje.",
      });
    }

    if (title.length > 120) {
      return res.status(400).json({
        success: false,
        message: "El título no puede pasar de 120 caracteres.",
      });
    }

    /** A quiénes va dirigido. */
    const audiencias: Record<string, Role[]> = {
      todos: [Role.ADMIN, Role.PROFESOR, Role.TUTOR, Role.ALUMNO],
      alumnos: [Role.ALUMNO],
      tutores: [Role.TUTOR],
      "alumnos-y-tutores": [Role.ALUMNO, Role.TUTOR],
      profesores: [Role.PROFESOR],
    };

    const roles = audiencias[audience as string];

    if (!roles) {
      return res.status(400).json({
        success: false,
        message: `Destinatarios no válidos. Opciones: ${Object.keys(audiencias).join(", ")}.`,
      });
    }

    const destinatarios = await prisma.user.findMany({
      where: { role: { in: roles }, active: true },
      select: { id: true },
    });

    const enviadas = await sendAnnouncement({
      authorId: req.user!.id,
      title: title.trim(),
      body: body.trim(),
      recipientIds: destinatarios.map((u) => u.id),
    });

    return res.status(201).json({ success: true, enviadas });
  }
);

export default router;
