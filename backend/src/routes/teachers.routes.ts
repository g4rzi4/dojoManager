import { Router } from "express";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import {
  crearEnlaceDeRestablecimiento,
  HORAS_ENLACE_COMPARTIDO,
} from "../lib/passwordReset";
import { generateTeacherCode } from "../lib/teacherCode";
import { requireAuth, requirePermission } from "../middleware/auth";
import { can } from "../permissions";
import {
  Belt,
  EventPaymentStatus,
  PaymentStatus,
  Role,
} from "../generated/prisma/enums";

const router = Router();

/** Mínimo de la contraseña. Corta y obligatoria es peor que ninguna regla. */
const MIN_PASSWORD = 8;

/** Las columnas @db.Date vienen como medianoche UTC: se leen en UTC. */
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * GET /teachers
 *
 * Lista de profesores con su clave y cuántos alumnos tiene cada uno.
 * Solo el administrador: teachers:read no lo tiene nadie más.
 */
router.get(
  "/",
  requireAuth,
  requirePermission("teachers:read"),
  async (_req, res) => {
    const teachers = await prisma.user.findMany({
      where: { role: Role.PROFESOR },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        teacherCode: true,
        active: true,
        createdAt: true,
        _count: { select: { studentsTaught: true } },
      },
    });

    return res.json({
      success: true,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        teacherCode: t.teacherCode,
        active: t.active,
        alumnos: t._count.studentsTaught,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  }
);

/**
 * GET /teachers/:id
 *
 * La ficha del profesor: sus datos, sus alumnos y lo que ha recaudado.
 *
 * La ve el ADMIN de cualquier profesor, y cada PROFESOR la suya. Un profesor
 * NO puede ver la ficha de otro: ahí van las notas del administrador y el
 * dinero que maneja.
 */
router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "El id del profesor no es válido.",
    });
  }

  const esAdmin = can(req.user!.role, "teachers:read");
  const esSuPropiaFicha = req.user!.id === id;

  if (!esAdmin && !esSuPropiaFicha) {
    return res.status(403).json({
      success: false,
      message: "No tienes permiso para ver esta ficha.",
    });
  }

  const teacher = await prisma.user.findFirst({
    where: { id, role: Role.PROFESOR },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      teacherCode: true,
      belt: true,
      specialty: true,
      hiredAt: true,
      adminNotes: true,
      active: true,
      createdAt: true,
      studentsTaught: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          currentBelt: true,
          active: true,
        },
      },
      _count: { select: { eventsCreated: true } },
    },
  });

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "No existe ese profesor.",
    });
  }

  // -------------------------------------------------------------------------
  // Historial de cobros: mensualidades de sus alumnos + cobros de eventos
  // acreditados a su clave.
  // -------------------------------------------------------------------------
  const alumnoIds = teacher.studentsTaught.map((s) => s.id);

  const [mensualidades, cobrosEvento] = await Promise.all([
    alumnoIds.length === 0
      ? []
      : prisma.payment.findMany({
          where: { studentId: { in: alumnoIds }, status: PaymentStatus.PAGADO },
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 100,
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        }),
    prisma.eventEnrollment.findMany({
      where: {
        creditedToId: teacher.id,
        status: EventPaymentStatus.CONFIRMADO,
      },
      orderBy: { confirmedAt: "desc" },
      take: 100,
      include: {
        student: { select: { firstName: true, lastName: true } },
        event: { select: { title: true, date: true, category: true } },
      },
    }),
  ]);

  const totalMensualidades = mensualidades.reduce(
    (suma, p) => suma + p.amountCents,
    0
  );
  const totalEventos = cobrosEvento.reduce(
    (suma, e) => suma + e.amountCents,
    0
  );

  return res.json({
    success: true,
    /** El admin ve las notas internas; el profesor, no. */
    puedeVerNotasAdmin: esAdmin,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      teacherCode: teacher.teacherCode,
      belt: teacher.belt,
      specialty: teacher.specialty,
      hiredAt: teacher.hiredAt ? dateOnly(teacher.hiredAt) : null,
      adminNotes: esAdmin ? teacher.adminNotes : null,
      active: teacher.active,
      createdAt: teacher.createdAt.toISOString(),

      resumen: {
        alumnos: teacher.studentsTaught.length,
        alumnosActivos: teacher.studentsTaught.filter((s) => s.active).length,
        eventosCreados: teacher._count.eventsCreated,
        cobrosEvento: cobrosEvento.length,
        mensualidadesCobradas: mensualidades.length,
        totalEventosCents: totalEventos,
        totalMensualidadesCents: totalMensualidades,
        totalRecaudadoCents: totalEventos + totalMensualidades,
      },

      alumnos: teacher.studentsTaught,

      historialCobros: {
        eventos: cobrosEvento.map((e) => ({
          id: e.id,
          alumno: `${e.student.firstName} ${e.student.lastName}`,
          evento: e.event.title,
          categoria: e.event.category,
          fechaEvento: dateOnly(e.event.date),
          amountCents: e.amountCents,
          method: e.method,
          confirmadoEn: e.confirmedAt?.toISOString() ?? null,
        })),
        mensualidades: mensualidades.map((p) => ({
          id: p.id,
          alumno: `${p.student.firstName} ${p.student.lastName}`,
          periodYear: p.periodYear,
          periodMonth: p.periodMonth,
          amountCents: p.amountCents,
          method: p.method,
          paidAt: p.paidAt ? dateOnly(p.paidAt) : null,
        })),
      },
    },
  });
});

/**
 * PATCH /teachers/:id
 *
 * Actualiza la ficha. El ADMIN puede todo; el PROFESOR solo sus propios
 * datos de contacto, y nunca las notas del administrador.
 */
router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "El id del profesor no es válido.",
    });
  }

  const esAdmin = can(req.user!.role, "teachers:write");
  const esSuPropiaFicha =
    req.user!.id === id && req.user!.role === Role.PROFESOR;

  if (!esAdmin && !esSuPropiaFicha) {
    return res.status(403).json({
      success: false,
      message: "No tienes permiso para editar esta ficha.",
    });
  }

  const teacher = await prisma.user.findFirst({
    where: { id, role: Role.PROFESOR },
    select: { id: true },
  });

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "No existe ese profesor.",
    });
  }

  const { name, email, phone, belt, specialty, hiredAt, adminNotes } =
    req.body ?? {};

  const datos: {
    name?: string;
    email?: string;
    phone?: string | null;
    belt?: Belt | null;
    specialty?: string | null;
    hiredAt?: Date | null;
    adminNotes?: string | null;
  } = {};

  // Nombre y correo identifican la cuenta: solo los cambia el administrador.
  if ((name !== undefined || email !== undefined) && !esAdmin) {
    return res.status(403).json({
      success: false,
      message: "Solo el administrador puede cambiar el nombre o el correo.",
    });
  }

  if (name !== undefined) {
    const nombre = typeof name === "string" ? name.trim() : "";

    if (nombre.length < 2 || nombre.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Escribe el nombre del profesor.",
      });
    }

    datos.name = nombre;
  }

  // Un correo repetido lo rechaza la base, y el manejador de errores responde
  // 409 con un mensaje claro.
  if (email !== undefined) {
    const correo = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+$/.test(correo)) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico no es válido.",
      });
    }

    datos.email = correo;
  }

  if (phone !== undefined) {
    datos.phone = typeof phone === "string" ? phone.trim() || null : null;
  }

  if (specialty !== undefined) {
    datos.specialty =
      typeof specialty === "string" ? specialty.trim() || null : null;
  }

  if (belt !== undefined) {
    if (belt === null || belt === "") {
      datos.belt = null;
    } else if (Object.values(Belt).includes(belt as Belt)) {
      datos.belt = belt as Belt;
    } else {
      return res.status(400).json({
        success: false,
        message: `Grado no válido. Opciones: ${Object.values(Belt).join(", ")}.`,
      });
    }
  }

  if (hiredAt !== undefined) {
    if (hiredAt === null || hiredAt === "") {
      datos.hiredAt = null;
    } else if (
      typeof hiredAt === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(hiredAt)
    ) {
      const [y, m, d] = hiredAt.split("-").map(Number);
      datos.hiredAt = new Date(Date.UTC(y, m - 1, d));
    } else {
      return res.status(400).json({
        success: false,
        message: "La fecha de ingreso debe venir como AAAA-MM-DD.",
      });
    }
  }

  // Las notas del administrador solo las toca el administrador.
  if (adminNotes !== undefined) {
    if (!esAdmin) {
      return res.status(403).json({
        success: false,
        message: "Solo el administrador puede editar las notas internas.",
      });
    }

    datos.adminNotes =
      typeof adminNotes === "string" ? adminNotes.trim() || null : null;
  }

  if (Object.keys(datos).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No mandaste ningún cambio.",
    });
  }

  await prisma.user.update({ where: { id }, data: datos });

  return res.json({ success: true });
});

/**
 * POST /teachers
 *
 * Registra un profesor y le genera su clave única.
 *
 * Solo el ADMIN. El permiso teachers:write no lo tiene ningún otro rol, así
 * que un profesor no puede crear más profesores.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("teachers:write"),
  async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length === 0 ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan el nombre, el correo o la contraseña.",
      });
    }

    const correo = email.trim().toLowerCase();

    if (!correo.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "El correo no es válido.",
      });
    }

    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      });
    }

    const yaExiste = await prisma.user.findUnique({
      where: { email: correo },
      select: { id: true },
    });

    if (yaExiste) {
      // 409 y no 400: la petición es correcta, el conflicto es de estado.
      return res.status(409).json({
        success: false,
        message: "Ya hay una cuenta con ese correo.",
      });
    }

    const [hash, teacherCode] = await Promise.all([
      hashPassword(password),
      generateTeacherCode(),
    ]);

    const teacher = await prisma.user.create({
      data: {
        name: name.trim(),
        email: correo,
        password: hash,
        role: Role.PROFESOR,
        teacherCode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacherCode: true,
        active: true,
      },
    });

    return res.status(201).json({ success: true, teacher });
  }
);

/**
 * PATCH /teachers/:id/active
 *
 * Da de alta o de baja a un profesor. Baja lógica: desactivar le impide
 * iniciar sesión, pero conserva su rastro en el historial de los alumnos
 * (quién evaluó cada graduación, quién registró cada pago).
 */
router.patch(
  "/:id/active",
  requireAuth,
  requirePermission("teachers:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { active } = req.body ?? {};

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del profesor no es válido.",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Indica si la cuenta queda activa o inactiva.",
      });
    }

    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes desactivar tu propia cuenta.",
      });
    }

    const teacher = await prisma.user.findFirst({
      where: { id, role: Role.PROFESOR },
      select: { id: true },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No existe ese profesor.",
      });
    }

    await prisma.user.update({ where: { id }, data: { active } });

    return res.json({ success: true });
  }
);

/**
 * POST /teachers/:id/reset-link
 *
 * El administrador genera un enlace para que el profesor elija otra contraseña.
 */
router.post(
  "/:id/reset-link",
  requireAuth,
  requirePermission("teachers:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const profesor = Number.isInteger(id)
      ? await prisma.user.findUnique({
          where: { id },
          select: { id: true, role: true, active: true },
        })
      : null;

    if (!profesor || profesor.role !== Role.PROFESOR) {
      return res.status(404).json({
        success: false,
        message: "No existe ese profesor.",
      });
    }

    if (!profesor.active) {
      return res.status(409).json({
        success: false,
        message: "Ese profesor está dado de baja.",
      });
    }

    const enlace = await crearEnlaceDeRestablecimiento(
      profesor.id,
      HORAS_ENLACE_COMPARTIDO
    );

    return res.status(201).json({ success: true, ...enlace });
  }
);

export default router;
