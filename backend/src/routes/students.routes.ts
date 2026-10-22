import { Router } from "express";

import { prisma } from "../lib/prisma";
import type {
  StudentGetPayload,
  StudentInclude,
} from "../generated/prisma/models/Student";
import { canViewStudent, ownStudentIds } from "../lib/access";
import { requireAuth, requirePermission } from "../middleware/auth";

const router = Router();

/**
 * Las columnas declaradas @db.Date las devuelve Prisma como medianoche UTC.
 * Por eso aquí leemos en UTC y no con getFullYear() local: en México (UTC-6)
 * lo local daría el día anterior.
 */
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cuántos registros de historial devolvemos por sección. */
const LIMITE_HISTORIAL = 50;

/**
 * Qué historial trae la tarjeta. Sin `as const`: eso lo volvería readonly y
 * Prisma espera tipos mutables. `satisfies` da la validación de tipos sin
 * perder la forma exacta, que es la que necesita StudentGetPayload.
 */
const CARD_INCLUDE = {
  promotions: {
    orderBy: { promotedAt: "desc" },
    take: LIMITE_HISTORIAL,
    include: { evaluatedBy: { select: { id: true, name: true } } },
  },
  attendance: {
    orderBy: { date: "desc" },
    take: LIMITE_HISTORIAL,
  },
  payments: {
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: LIMITE_HISTORIAL,
  },
  notes: {
    orderBy: { createdAt: "desc" },
    take: LIMITE_HISTORIAL,
    include: { author: { select: { id: true, name: true } } },
  },
  guardians: {
    include: { guardian: { select: { id: true, name: true, email: true } } },
  },
} satisfies StudentInclude;

type StudentWithHistory = StudentGetPayload<{
  include: typeof CARD_INCLUDE;
}>;

/** Arma la tarjeta de información que consume el frontend. */
function buildCard(student: StudentWithHistory) {
  const presentes = student.attendance.filter((a) => a.present).length;

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    birthDate: student.birthDate ? dateOnly(student.birthDate) : null,
    phone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    medicalNotes: student.medicalNotes,
    currentBelt: student.currentBelt,
    enrolledAt: dateOnly(student.enrolledAt),
    active: student.active,
    hasLogin: student.userId !== null,

    /// Tutores con cuenta que pueden consultar este expediente.
    tutores: student.guardians.map((g) => ({
      id: g.guardian.id,
      name: g.guardian.name,
      email: g.guardian.email,
      relationship: g.relationship,
      isPrimary: g.isPrimary,
    })),

    resumen: {
      graduaciones: student.promotions.length,
      asistenciasRegistradas: student.attendance.length,
      asistenciasPresente: presentes,
      pagosPendientes: student.payments.filter((p) => p.status !== "PAGADO")
        .length,
      observaciones: student.notes.length,
    },

    historial: {
      graduaciones: student.promotions.map((p) => ({
        id: p.id,
        belt: p.belt,
        promotedAt: dateOnly(p.promotedAt),
        notes: p.notes,
        evaluatedBy: p.evaluatedBy?.name ?? null,
      })),

      asistencia: student.attendance.map((a) => ({
        id: a.id,
        date: dateOnly(a.date),
        present: a.present,
      })),

      pagos: student.payments.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        periodYear: p.periodYear,
        periodMonth: p.periodMonth,
        status: p.status,
        paidAt: p.paidAt ? dateOnly(p.paidAt) : null,
        note: p.note,
      })),

      observaciones: student.notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        author: n.author?.name ?? null,
      })),
    },
  };
}

/**
 * GET /students
 *
 * Listado para administración. Solo datos de cabecera, sin historial.
 */
router.get(
  "/",
  requireAuth,
  requirePermission("students:read"),
  async (_req, res) => {
    const students = await prisma.student.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentBelt: true,
        active: true,
        enrolledAt: true,
      },
    });

    return res.json({
      success: true,
      students: students.map((s) => ({
        ...s,
        enrolledAt: dateOnly(s.enrolledAt),
      })),
    });
  }
);

/**
 * GET /students/mine
 *
 * Los alumnos que este usuario puede consultar por relación propia: su
 * propio expediente si es ALUMNO, sus hijos si es TUTOR.
 *
 * Es lo que alimenta el panel del tutor con dos o más hijos.
 *
 * Va antes de /:id, igual que /me, para que Express no tome "mine" por un id.
 */
router.get("/mine", requireAuth, async (req, res) => {
  const ids = await ownStudentIds(req.user!);

  if (ids.length === 0) {
    return res.json({ success: true, students: [] });
  }

  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    orderBy: [{ firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      currentBelt: true,
      active: true,
      enrolledAt: true,
      payments: {
        where: { status: { in: ["PENDIENTE", "VENCIDO"] } },
        select: { amountCents: true },
      },
      _count: { select: { promotions: true, attendance: true } },
    },
  });

  return res.json({
    success: true,
    students: students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      currentBelt: s.currentBelt,
      active: s.active,
      enrolledAt: dateOnly(s.enrolledAt),
      graduaciones: s._count.promotions,
      asistencias: s._count.attendance,
      pagosPendientes: s.payments.length,
      totalPendienteCents: s.payments.reduce(
        (suma, p) => suma + p.amountCents,
        0
      ),
    })),
  });
});

/**
 * GET /students/me
 *
 * La tarjeta del alumno que tiene la sesión abierta.
 *
 * IMPORTANTE: va declarada ANTES de /:id. Si estuviera después, Express
 * tomaría "me" como un id y la ruta nunca se alcanzaría.
 */
router.get("/me", requireAuth, async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { userId: req.user!.id },
    include: CARD_INCLUDE,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Tu cuenta no tiene un expediente de alumno asociado.",
    });
  }

  return res.json({ success: true, student: buildCard(student) });
});

/**
 * GET /students/:id
 *
 * La tarjeta completa de un alumno.
 *
 * La ve quien tenga students:read (admin y profesores) y además el propio
 * alumno sobre su expediente, aunque no tenga ese permiso.
 */
router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "El id del alumno no es válido.",
    });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: CARD_INCLUDE,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "No existe ese alumno.",
    });
  }

  // Admin y profesor pasan por el permiso; el alumno y el tutor, por la
  // relación: su propio expediente o el de los alumnos a su cargo.
  const permitido = await canViewStudent(req.user!, student.id);

  if (!permitido) {
    return res.status(403).json({
      success: false,
      message: "No tienes permiso para ver este expediente.",
    });
  }

  return res.json({ success: true, student: buildCard(student) });
});

export default router;
