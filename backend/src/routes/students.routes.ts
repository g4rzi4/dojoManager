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
import { hoyEnElDojo, parseDateOnly } from "../lib/dates";
import { marcarMensualidadesVencidas } from "../lib/mensualidades";
import { notifyBeltPromotion } from "../lib/notifications";
import {
  crearEnlaceDeRestablecimiento,
  HORAS_ENLACE_COMPARTIDO,
} from "../lib/passwordReset";
import { normalizeTeacherCode } from "../lib/teacherCode";
import { Belt, Role } from "../generated/prisma/enums";
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
  user: { select: { id: true, email: true } },
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
    /// Cuenta propia del alumno, si la tiene.
    cuenta: student.user,

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
 * PATCH /students/:id
 *
 * Edita la ficha de un alumno. Lo hacen el ADMIN y los PROFESOR, pero un
 * profesor solo sobre los alumnos de SU grupo.
 *
 * Solo se tocan los campos que llegan: mandar `{ phone: "..." }` cambia el
 * teléfono y deja todo lo demás como estaba.
 */
router.patch(
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
        message: "Ese alumno no está en tu grupo.",
      });
    }

    const {
      firstName,
      lastName,
      birthDate,
      phone,
      guardianName,
      guardianPhone,
      medicalNotes,
      currentBelt,
      active,
      teacherCode,
    } = req.body ?? {};

    const datos: Record<string, unknown> = {};

    // Nombre y apellido: si vienen, no pueden quedar vacíos.
    for (const [campo, valor] of [
      ["firstName", firstName],
      ["lastName", lastName],
    ] as const) {
      if (valor !== undefined) {
        if (typeof valor !== "string" || valor.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: "El nombre y el apellido no pueden quedar vacíos.",
          });
        }
        datos[campo] = valor.trim();
      }
    }

    // Campos de texto opcionales: cadena vacía los deja en null.
    for (const [campo, valor] of [
      ["phone", phone],
      ["guardianName", guardianName],
      ["guardianPhone", guardianPhone],
      ["medicalNotes", medicalNotes],
    ] as const) {
      if (valor !== undefined) {
        datos[campo] =
          typeof valor === "string" ? valor.trim() || null : null;
      }
    }

    if (birthDate !== undefined) {
      if (birthDate === null || birthDate === "") {
        datos.birthDate = null;
      } else if (
        typeof birthDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(birthDate)
      ) {
        const [y, m, d] = birthDate.split("-").map(Number);
        datos.birthDate = new Date(Date.UTC(y, m - 1, d));
      } else {
        return res.status(400).json({
          success: false,
          message: "La fecha de nacimiento debe venir como AAAA-MM-DD.",
        });
      }
    }

    if (currentBelt !== undefined) {
      if (!Object.values(Belt).includes(currentBelt as Belt)) {
        return res.status(400).json({
          success: false,
          message: `Cinta no válida. Opciones: ${Object.values(Belt).join(", ")}.`,
        });
      }

      // Nota: esto corrige la cinta VIGENTE sin agregar una graduación al
      // historial. Las graduaciones van por POST /students/:id/promotions.
      datos.currentBelt = currentBelt as Belt;
    }

    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Indica si el alumno queda activo o inactivo.",
        });
      }
      datos.active = active;
    }

    // Reasignar de profesor. Un profesor solo puede usar SU clave: pasarle
    // un alumno a otro profesor es decisión del administrador.
    if (teacherCode !== undefined) {
      if (teacherCode === null || teacherCode === "") {
        if (req.user!.role !== Role.ADMIN) {
          return res.status(403).json({
            success: false,
            message: "Solo el administrador puede dejar a un alumno sin profesor.",
          });
        }
        datos.teacherId = null;
      } else {
        const code = normalizeTeacherCode(String(teacherCode));

        const teacher = await prisma.user.findUnique({
          where: { teacherCode: code },
          select: { id: true, active: true },
        });

        if (!teacher || !teacher.active) {
          return res.status(400).json({
            success: false,
            message: `No existe un profesor activo con la clave ${code}.`,
          });
        }

        if (req.user!.role === Role.PROFESOR && teacher.id !== req.user!.id) {
          return res.status(403).json({
            success: false,
            message:
              "Solo el administrador puede pasar un alumno a otro profesor.",
          });
        }

        datos.teacherId = teacher.id;
      }
    }

    if (Object.keys(datos).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No mandaste ningún cambio.",
      });
    }

    await prisma.student.update({ where: { id }, data: datos });

    return res.json({ success: true, message: "Ficha actualizada." });
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
  await marcarMensualidadesVencidas();

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
  await marcarMensualidadesVencidas();

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
  await marcarMensualidadesVencidas();

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

/** Del blanco al negro, en el orden en que se declaró el enum. */
const ORDEN_DE_CINTAS = Object.values(Belt);

function rangoDeCinta(belt: Belt): number {
  return ORDEN_DE_CINTAS.indexOf(belt);
}

/** La graduación que define la cinta vigente va primero. */
const MAS_RECIENTE_PRIMERO = [
  { promotedAt: "desc" as const },
  { id: "desc" as const },
];

/**
 * POST /students/:id/promotions  { belt, promotedAt, notes }
 *
 * Registra una graduación. Si es la más reciente, también cambia la cinta
 * vigente y avisa a la familia. Una fecha anterior solo completa el historial.
 */
router.post(
  "/:id/promotions",
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
        message: "Ese alumno no está en tu grupo.",
      });
    }

    const { belt, promotedAt, notes } = req.body ?? {};

    if (!Object.values(Belt).includes(belt as Belt)) {
      return res.status(400).json({
        success: false,
        message: "Elige una cinta válida.",
      });
    }

    const fecha = parseDateOnly(promotedAt);

    if (!fecha || promotedAt > hoyEnElDojo()) {
      return res.status(400).json({
        success: false,
        message: "Indica una fecha válida que no sea futura.",
      });
    }

    const cinta = belt as Belt;

    const resultado = await prisma.$transaction(async (tx) => {
      const alumno = await tx.student.findUniqueOrThrow({
        where: { id },
        select: { currentBelt: true },
      });

      const ultima = await tx.beltPromotion.findFirst({
        where: { studentId: id },
        orderBy: MAS_RECIENTE_PRIMERO,
        select: { promotedAt: true },
      });

      const esLaMasReciente = !ultima || fecha >= ultima.promotedAt;

      if (
        esLaMasReciente &&
        rangoDeCinta(cinta) <= rangoDeCinta(alumno.currentBelt)
      ) {
        return null;
      }

      const promocion = await tx.beltPromotion.create({
        data: {
          studentId: id,
          belt: cinta,
          promotedAt: fecha,
          notes: typeof notes === "string" ? notes.trim() || null : null,
          evaluatedById: req.user!.id,
          previousBelt: esLaMasReciente ? alumno.currentBelt : null,
        },
        select: { id: true },
      });

      if (esLaMasReciente) {
        await tx.student.update({
          where: { id },
          data: { currentBelt: cinta },
        });
      }

      return { promocionId: promocion.id, esLaMasReciente };
    });

    if (!resultado) {
      return res.status(409).json({
        success: false,
        message: "La nueva cinta debe ser superior a la cinta actual del alumno.",
      });
    }

    if (resultado.esLaMasReciente) {
      try {
        await notifyBeltPromotion(resultado.promocionId, id, cinta);
      } catch (error) {
        console.error("[graduaciones] no se pudo notificar", error);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Graduación registrada.",
    });
  }
);

/**
 * DELETE /students/:id/promotions/:promotionId
 *
 * Quita una graduación capturada por error. Si era la más reciente, el alumno
 * regresa a la cinta que tenía antes.
 */
router.delete(
  "/:id/promotions/:promotionId",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const promotionId = Number(req.params.promotionId);

    if (!Number.isInteger(id) || !Number.isInteger(promotionId)) {
      return res.status(400).json({
        success: false,
        message: "La graduación indicada no es válida.",
      });
    }

    if (!(await canManageStudent(req.user!, id))) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está en tu grupo.",
      });
    }

    const borrada = await prisma.$transaction(async (tx) => {
      const historial = await tx.beltPromotion.findMany({
        where: { studentId: id },
        orderBy: MAS_RECIENTE_PRIMERO,
        select: { id: true, belt: true, previousBelt: true },
      });

      const indice = historial.findIndex((p) => p.id === promotionId);

      if (indice === -1) return false;

      await tx.beltPromotion.delete({ where: { id: promotionId } });

      if (indice === 0) {
        const quitada = historial[0];

        await tx.student.update({
          where: { id },
          data: {
            // previousBelt es la cinta exacta de antes; las graduaciones
            // anteriores a esta columna no la tienen.
            currentBelt:
              quitada.previousBelt ?? historial[1]?.belt ?? Belt.BLANCO,
          },
        });
      }

      return true;
    });

    if (!borrada) {
      return res.status(404).json({
        success: false,
        message: "No existe esa graduación.",
      });
    }

    return res.json({ success: true, message: "Graduación eliminada." });
  }
);

/**
 * POST /students/:id/reset-link  { userId }
 *
 * Genera un enlace para que el alumno o uno de sus tutores elija otra
 * contraseña. Funciona sin servicio de correo: se comparte como un QR.
 */
router.post(
  "/:id/reset-link",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const userId = Number(req.body?.userId);

    if (!Number.isInteger(id) || !Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "La cuenta indicada no es válida.",
      });
    }

    if (!(await canManageStudent(req.user!, id))) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está en tu grupo.",
      });
    }

    // Solo cuentas ligadas a ESTE alumno: un profesor no debe poder generar
    // el enlace de cualquier usuario, y menos el de otro profesor.
    const cuenta = await prisma.user.findFirst({
      where: {
        id: userId,
        active: true,
        role: { in: [Role.ALUMNO, Role.TUTOR] },
        OR: [
          { student: { id } },
          { guardianOf: { some: { studentId: id } } },
        ],
      },
      select: { id: true },
    });

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: "Esa cuenta no está ligada a este alumno.",
      });
    }

    const enlace = await crearEnlaceDeRestablecimiento(
      cuenta.id,
      HORAS_ENLACE_COMPARTIDO
    );

    return res.status(201).json({ success: true, ...enlace });
  }
);

export default router;
