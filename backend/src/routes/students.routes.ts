import { Router } from "express";

import { prisma } from "../lib/prisma";
import type {
  StudentGetPayload,
  StudentInclude,
} from "../generated/prisma/models/Student";
import {
  canManageStudent,
  canViewStudent,
  familyStudentIds,
  scopeToStudentFilter,
  visibleStudentIds,
} from "../lib/access";
import { normalizeTeacherCode } from "../lib/teacherCode";
import { Role } from "../generated/prisma/enums";
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
  async (req, res) => {
    // El permiso deja leer alumnos; el alcance decide CUÁLES. Un profesor
    // solo ve los que tiene asignados.
    const scope = await visibleStudentIds(req.user!);

    const students = await prisma.student.findMany({
      where: scopeToStudentFilter(scope),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentBelt: true,
        active: true,
        enrolledAt: true,
        teacher: { select: { id: true, name: true, teacherCode: true } },
      },
    });

    return res.json({
      success: true,
      alcance: scope === "todos" ? "todos" : "asignados",
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        currentBelt: s.currentBelt,
        active: s.active,
        enrolledAt: dateOnly(s.enrolledAt),
        teacherName: s.teacher?.name ?? null,
        teacherCode: s.teacher?.teacherCode ?? null,
      })),
    });
  }
);

/**
 * POST /students
 *
 * Registra un alumno. Lo pueden hacer el ADMIN y los PROFESOR.
 *
 * La clave del profesor (`teacherCode`) decide a quién queda asignado:
 *
 *   - Si la manda un PROFESOR y la omite, se asigna a sí mismo.
 *   - Un PROFESOR solo puede usar SU propia clave: si manda la de otro,
 *     estaría dando de alta alumnos en el grupo ajeno.
 *   - El ADMIN puede usar la clave de cualquier profesor, o ninguna.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const {
      firstName,
      lastName,
      birthDate,
      phone,
      guardianName,
      guardianPhone,
      medicalNotes,
      teacherCode,
    } = req.body ?? {};

    if (
      typeof firstName !== "string" ||
      firstName.trim().length === 0 ||
      typeof lastName !== "string" ||
      lastName.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "El alumno necesita nombre y apellido.",
      });
    }

    const autor = req.user!;
    let teacherId: number | null = null;

    if (typeof teacherCode === "string" && teacherCode.trim().length > 0) {
      const code = normalizeTeacherCode(teacherCode);

      const teacher = await prisma.user.findUnique({
        where: { teacherCode: code },
        select: { id: true, active: true },
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: `No existe un profesor con la clave ${code}.`,
        });
      }

      if (!teacher.active) {
        return res.status(400).json({
          success: false,
          message: "Ese profesor está dado de baja.",
        });
      }

      if (autor.role === Role.PROFESOR && teacher.id !== autor.id) {
        return res.status(403).json({
          success: false,
          message:
            "Solo puedes registrar alumnos con tu propia clave de profesor.",
        });
      }

      teacherId = teacher.id;
    } else if (autor.role === Role.PROFESOR) {
      // Un profesor que no indica clave se asigna el alumno a sí mismo.
      teacherId = autor.id;
    }

    // Fecha de nacimiento: aceptamos YYYY-MM-DD y la guardamos como fecha
    // UTC sin hora, igual que las demás columnas @db.Date.
    let fechaNacimiento: Date | null = null;

    if (typeof birthDate === "string" && birthDate.trim().length > 0) {
      const partes = birthDate.trim().split("-").map(Number);

      if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) {
        return res.status(400).json({
          success: false,
          message: "La fecha de nacimiento debe venir como AAAA-MM-DD.",
        });
      }

      fechaNacimiento = new Date(
        Date.UTC(partes[0], partes[1] - 1, partes[2])
      );
    }

    const student = await prisma.student.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: fechaNacimiento,
        phone: typeof phone === "string" ? phone.trim() || null : null,
        guardianName:
          typeof guardianName === "string" ? guardianName.trim() || null : null,
        guardianPhone:
          typeof guardianPhone === "string"
            ? guardianPhone.trim() || null
            : null,
        medicalNotes:
          typeof medicalNotes === "string" ? medicalNotes.trim() || null : null,
        teacherId,
      },
      select: { id: true, firstName: true, lastName: true, teacherId: true },
    });

    return res.status(201).json({ success: true, student });
  }
);

/**
 * DELETE /students/:id
 *
 * Da de baja a un alumno. Es baja LÓGICA: lo marca inactivo en lugar de
 * borrarlo, para no perder su historial de pagos y graduaciones.
 *
 * Un profesor solo puede dar de baja a los alumnos que tiene asignados.
 */
router.delete(
  "/:id",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del alumno no es válido.",
      });
    }

    if (!(await canManageStudent(req.user!, id))) {
      return res.status(403).json({
        success: false,
        message: "Este alumno no está en tu grupo.",
      });
    }

    await prisma.student.update({
      where: { id },
      data: { active: false },
    });

    return res.json({ success: true, message: "Alumno dado de baja." });
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
  const ids = await familyStudentIds(req.user!);

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
