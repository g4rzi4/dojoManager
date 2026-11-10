import { Router } from "express";

import { familyStudentIds } from "../lib/access";
import { prisma } from "../lib/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Discipline, Level, Role } from "../generated/prisma/enums";

const router = Router();

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * GET /classes — el horario de clases.
 *
 * Reusa los permisos de eventos: el horario es parte del calendario, y le
 * importa a los cuatro roles. El admin y los profesores ven el del dojo
 * completo; un alumno o un tutor, solo las clases de los profesores de sus
 * alumnos, que son las que le sirven.
 */
router.get("/", requireAuth, requirePermission("events:read"), async (req, res) => {
  const user = req.user!;
  let soloDeProfesores: number[] | null = null;

  if (user.role === Role.TUTOR || user.role === Role.ALUMNO) {
    const propios = await familyStudentIds(user);

    const alumnos = await prisma.student.findMany({
      where: { id: { in: propios } },
      select: { teacherId: true },
    });

    soloDeProfesores = [
      ...new Set(alumnos.flatMap((a) => (a.teacherId === null ? [] : [a.teacherId]))),
    ];
  }

  const classes = await prisma.dojoClass.findMany({
    // Una lista vacía no encuentra nada: sin profesor asignado, no hay horario.
    where: soloDeProfesores === null ? undefined : { teacherId: { in: soloDeProfesores } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { teacher: { select: { name: true } } },
  });

  return res.json({
    success: true,
    classes: classes.map(({ teacher, createdAt: _c, updatedAt: _u, ...c }) => ({
      ...c,
      instructor: teacher?.name ?? "Sin asignar",
    })),
  });
});

/** POST /classes — un profesor agrega las suyas; el admin elige de quién es. */
router.post("/", requireAuth, requirePermission("events:write"), async (req, res) => {
  const user = req.user!;
  const { title, discipline, dayOfWeek, startTime, endTime, location, level, capacity, teacherId } =
    req.body ?? {};

  const titulo = typeof title === "string" ? title.trim() : "";
  const lugar = typeof location === "string" ? location.trim() : "";

  if (titulo.length === 0 || titulo.length > 100) {
    return res.status(400).json({ success: false, message: "Escribe el nombre de la clase." });
  }

  if (lugar.length === 0 || lugar.length > 60) {
    return res.status(400).json({ success: false, message: "Indica dónde es la clase." });
  }

  if (
    !Object.values(Discipline).includes(discipline) ||
    !Object.values(Level).includes(level)
  ) {
    return res.status(400).json({ success: false, message: "Elige una disciplina y un nivel válidos." });
  }

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ success: false, message: "El día no es válido." });
  }

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !HORA.test(startTime) ||
    !HORA.test(endTime) ||
    endTime <= startTime
  ) {
    return res.status(400).json({
      success: false,
      message: "La hora de fin debe ser posterior a la de inicio.",
    });
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
    return res.status(400).json({ success: false, message: "La capacidad no es válida." });
  }

  // Un profesor no puede agendar clases a nombre de otro.
  let profesorId = user.id;

  if (user.role === Role.ADMIN) {
    const profesor = Number.isInteger(teacherId)
      ? await prisma.user.findFirst({
          where: { id: teacherId, role: Role.PROFESOR, active: true },
          select: { id: true },
        })
      : null;

    if (!profesor) {
      return res.status(400).json({ success: false, message: "Elige un profesor." });
    }

    profesorId = profesor.id;
  }

  const clase = await prisma.dojoClass.create({
    data: {
      title: titulo,
      discipline,
      dayOfWeek,
      startTime,
      endTime,
      location: lugar,
      level,
      capacity,
      teacherId: profesorId,
    },
    include: { teacher: { select: { name: true } } },
  });

  const { teacher, createdAt: _c, updatedAt: _u, ...datos } = clase;

  return res.status(201).json({
    success: true,
    class: { ...datos, instructor: teacher?.name ?? "Sin asignar" },
  });
});

/** DELETE /classes/:id — el profesor quita las suyas; el admin, cualquiera. */
router.delete("/:id", requireAuth, requirePermission("events:write"), async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "La clase indicada no es válida." });
  }

  const clase = await prisma.dojoClass.findUnique({ where: { id }, select: { teacherId: true } });

  if (!clase) {
    return res.status(404).json({ success: false, message: "No existe esa clase." });
  }

  if (req.user!.role !== Role.ADMIN && clase.teacherId !== req.user!.id) {
    return res.status(403).json({ success: false, message: "Esa clase no es tuya." });
  }

  await prisma.dojoClass.delete({ where: { id } });

  return res.json({ success: true });
});

export default router;
