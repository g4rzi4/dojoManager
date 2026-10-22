import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";

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

export default router;
