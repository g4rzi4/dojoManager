import { Router } from "express";

import { prisma } from "../lib/prisma";
import { familyStudentIds } from "../lib/access";
import {
  notifyEventPaymentReported,
  notifyEventPaymentResolved,
  notifyNewEvent,
} from "../lib/notifications";
import { normalizeTeacherCode } from "../lib/teacherCode";
import { requireAuth, requirePermission } from "../middleware/auth";
import { can } from "../permissions";
import {
  EventCategory,
  EventDivision,
  EventPaymentStatus,
  PaymentMethod,
  Role,
} from "../generated/prisma/enums";

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
  async (req, res) => {
    // Alumnos a cargo de quien consulta: con eso sabemos en qué eventos ya
    // reportó pago, para no ofrecerle reportarlo otra vez.
    const propios = await familyStudentIds(req.user!);

    const [events, misInscripciones] = await Promise.all([
      prisma.event.findMany({
        orderBy: [{ date: "asc" }, { time: "asc" }],
        include: {
          createdBy: { select: { name: true } },
          modalities: { orderBy: { id: "asc" } },
          _count: { select: { enrollments: true } },
        },
      }),
      propios.length === 0
        ? []
        : prisma.eventEnrollment.findMany({
            where: { studentId: { in: propios } },
            select: {
              eventId: true,
              studentId: true,
              status: true,
              enrolled: true,
            },
          }),
    ]);

    return res.json({
      success: true,
      events: events.map((e) => {
        const mias = misInscripciones.filter((i) => i.eventId === e.id);

        return {
          id: String(e.id),
          title: e.title,
          // Las columnas @db.Date vienen como medianoche UTC: leer en UTC da
          // la fecha correcta. Con getters locales, en México daría un día menos.
          date: e.date.toISOString().slice(0, 10),
          time: e.time ?? undefined,
          category: e.category,
          createdBy: e.createdBy?.name ?? null,
          requiresPayment: e.requiresPayment,
          priceCents: e.priceCents,
          modalities: e.modalities.map((m) => ({
            id: m.id,
            name: m.name,
            priceCents: m.priceCents,
          })),
          /** Cuántos reportes de pago lleva, para admin y profesores. */
          reportes: e._count.enrollments,
          /** Estado de los alumnos a cargo de quien consulta. */
          misAlumnos: mias.map((i) => ({
            studentId: i.studentId,
            status: i.status,
            enrolled: i.enrolled,
          })),
        };
      }),
    });
  }
);

/** Las categorías válidas, para validar lo que llega del cliente. */
const CATEGORIAS = Object.values(EventCategory) as string[];

// ---------------------------------------------------------------------------
// Pago e inscripción a eventos
//
// El flujo: el profesor comparte su clave, el alumno reporta el pago
// escribiéndola, y el profesor confirma. Al confirmar queda inscrito, y el
// cobro aparece en el historial de ESE profesor.
// ---------------------------------------------------------------------------

/**
 * POST /events/:id/report-payment
 *
 * El alumno o su tutor reportan que ya pagaron, con la clave del profesor.
 *
 * El alumno NO elige a quién se le acredita por id: escribe la clave, y el
 * servidor la resuelve. Si pudiera mandar un id, cualquiera podría acreditar
 * cobros a un profesor que nunca vio el dinero.
 */
router.post("/:id/report-payment", requireAuth, async (req, res) => {
  const eventId = Number(req.params.id);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return res.status(400).json({
      success: false,
      message: "El id del evento no es válido.",
    });
  }

  const { teacherCode, studentId, method, note, modalityIds, division } =
    req.body ?? {};

  if (typeof teacherCode !== "string" || teacherCode.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Escribe la clave que te dio tu profesor.",
    });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      requiresPayment: true,
      priceCents: true,
      title: true,
      modalities: { select: { id: true, name: true, priceCents: true } },
    },
  });

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "No existe ese evento.",
    });
  }

  if (!event.requiresPayment) {
    return res.status(400).json({
      success: false,
      message: "Este evento no requiere pago.",
    });
  }

  const tieneModalidades = event.modalities.length > 0;

  if (!tieneModalidades && event.priceCents === null) {
    return res.status(400).json({
      success: false,
      message: "Este evento no tiene costo configurado. Avísale al dojo.",
    });
  }

  /**
   * Cuánto se cobra y por qué conceptos.
   *
   * Con modalidades, el total es la SUMA de las elegidas: hay padres que
   * inscriben a su hijo en kata y kumite y pagan las dos. Sin modalidades,
   * es el precio único del evento.
   *
   * Los precios se copian aquí y se guardan en la inscripción, para poder
   * reconstruir el desglose aunque el evento cambie de precio después.
   */
  const elegidas: { id: number; priceCents: number }[] = [];
  let total: number;

  if (tieneModalidades) {
    if (!Array.isArray(modalityIds) || modalityIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Elige al menos una modalidad: ${event.modalities
          .map((m) => m.name)
          .join(", ")}.`,
      });
    }

    const vistos = new Set<number>();

    for (const raw of modalityIds) {
      const mid = Number(raw);
      const modalidad = event.modalities.find((m) => m.id === mid);

      if (!modalidad) {
        return res.status(400).json({
          success: false,
          message: "Una de las modalidades no pertenece a este evento.",
        });
      }

      // Elegir la misma dos veces no debe cobrarse doble.
      if (vistos.has(mid)) continue;
      vistos.add(mid);

      elegidas.push({ id: mid, priceCents: modalidad.priceCents });
    }

    total = elegidas.reduce((suma, m) => suma + m.priceCents, 0);
  } else {
    total = event.priceCents!;
  }

  // División: opcional, y puede no coincidir con la edad del alumno a
  // propósito, porque hay quien compite con adultos para foguearse.
  const divisiones = Object.values(EventDivision) as string[];

  if (
    division !== undefined &&
    division !== null &&
    division !== "" &&
    !divisiones.includes(division)
  ) {
    return res.status(400).json({
      success: false,
      message: `División no válida. Opciones: ${divisiones.join(", ")}.`,
    });
  }

  // Qué alumno. Un alumno solo puede reportar por sí mismo; un tutor tiene
  // que decir cuál de sus hijos, y solo puede elegir entre los suyos.
  const propios = await familyStudentIds(req.user!);

  if (propios.length === 0) {
    return res.status(403).json({
      success: false,
      message: "Tu cuenta no tiene alumnos a su cargo.",
    });
  }

  let alumnoId: number;

  if (studentId === undefined || studentId === null) {
    if (propios.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Indica a cuál de tus hijos corresponde el pago.",
      });
    }

    alumnoId = propios[0];
  } else {
    const pedido = Number(studentId);

    if (!propios.includes(pedido)) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está a tu cargo.",
      });
    }

    alumnoId = pedido;
  }

  // Resolver la clave del profesor.
  const code = normalizeTeacherCode(teacherCode);

  const teacher = await prisma.user.findUnique({
    where: { teacherCode: code },
    select: { id: true, active: true, name: true },
  });

  if (!teacher || !teacher.active) {
    return res.status(400).json({
      success: false,
      message: `No encontramos un profesor activo con la clave ${code}. Revísala con tu profesor.`,
    });
  }

  const yaReportado = await prisma.eventEnrollment.findUnique({
    where: { eventId_studentId: { eventId, studentId: alumnoId } },
    select: { id: true, status: true },
  });

  if (yaReportado) {
    return res.status(409).json({
      success: false,
      message:
        yaReportado.status === EventPaymentStatus.CONFIRMADO
          ? "Ese pago ya está confirmado y el alumno quedó inscrito."
          : "Ya reportaste este pago. Espera a que tu profesor lo confirme.",
    });
  }

  const enrollment = await prisma.eventEnrollment.create({
    data: {
      eventId,
      studentId: alumnoId,
      creditedToId: teacher.id,
      // El monto se congela al reportar: si el dojo cambia el precio
      // después, los cobros ya hechos no se alteran.
      amountCents: total,
      division:
        typeof division === "string" && divisiones.includes(division)
          ? (division as EventDivision)
          : null,
      method:
        typeof method === "string" &&
        Object.values(PaymentMethod).includes(method as PaymentMethod)
          ? (method as PaymentMethod)
          : null,
      note: typeof note === "string" ? note.trim() || null : null,
      modalities:
        elegidas.length > 0
          ? {
              create: elegidas.map((m) => ({
                modalityId: m.id,
                priceCents: m.priceCents,
              })),
            }
          : undefined,
    },
    select: { id: true },
  });

  // Avisarle al profesor que tiene un pago por confirmar.
  try {
    await notifyEventPaymentReported(
      enrollment.id,
      teacher.id,
      event.title,
      total
    );
  } catch (error) {
    console.error("[events] no se pudo notificar el pago reportado", error);
  }

  return res.status(201).json({
    success: true,
    message: `Listo. Le avisamos a ${teacher.name} para que confirme tu pago.`,
  });
});

/**
 * GET /events/:id/enrollments
 *
 * Quién reportó pago y quién está inscrito.
 *
 * El ADMIN ve todos. Un PROFESOR ve solo los acreditados a su clave: son los
 * que a él le toca confirmar.
 */
router.get(
  "/:id/enrollments",
  requireAuth,
  requirePermission("events:write"),
  async (req, res) => {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del evento no es válido.",
      });
    }

    const esAdmin = req.user!.role === Role.ADMIN;

    const enrollments = await prisma.eventEnrollment.findMany({
      where: {
        eventId,
        ...(esAdmin ? {} : { creditedToId: req.user!.id }),
      },
      orderBy: { reportedAt: "asc" },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        creditedTo: { select: { id: true, name: true } },
        modalities: { include: { modality: { select: { name: true } } } },
      },
    });

    return res.json({
      success: true,
      alcance: esAdmin ? "todos" : "mi-clave",
      enrollments: enrollments.map((e) => ({
        id: e.id,
        studentId: e.student.id,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        amountCents: e.amountCents,
        status: e.status,
        enrolled: e.enrolled,
        division: e.division,
        /** Desglose: qué modalidades y cuánto costó cada una. */
        modalidades: e.modalities.map((m) => ({
          name: m.modality.name,
          priceCents: m.priceCents,
        })),
        method: e.method,
        note: e.note,
        acreditadoA: e.creditedTo?.name ?? null,
        reportedAt: e.reportedAt.toISOString(),
        confirmedAt: e.confirmedAt?.toISOString() ?? null,
      })),
    });
  }
);

/**
 * PATCH /events/:eventId/enrollments/:id
 *
 * El profesor confirma o rechaza el pago reportado.
 *
 * Al CONFIRMAR, el alumno queda inscrito en el mismo movimiento: no hay un
 * paso aparte de "inscribir".
 *
 * Solo lo resuelve el profesor al que se acreditó el cobro, o el admin. Si
 * un alumno escribió por error la clave de otro profesor, ese profesor verá
 * el reporte y podrá rechazarlo.
 */
router.patch(
  "/:eventId/enrollments/:id",
  requireAuth,
  requirePermission("events:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { confirmar } = req.body ?? {};

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del registro no es válido.",
      });
    }

    if (typeof confirmar !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Indica si confirmas o rechazas el pago.",
      });
    }

    const enrollment = await prisma.eventEnrollment.findUnique({
      where: { id },
      select: { id: true, creditedToId: true, status: true, studentId: true },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "No existe ese registro.",
      });
    }

    const esAdmin = req.user!.role === Role.ADMIN;
    const esSuCobro = enrollment.creditedToId === req.user!.id;

    if (!esAdmin && !esSuCobro) {
      return res.status(403).json({
        success: false,
        message: "Ese pago no se acreditó a tu clave.",
      });
    }

    await prisma.eventEnrollment.update({
      where: { id },
      data: {
        status: confirmar
          ? EventPaymentStatus.CONFIRMADO
          : EventPaymentStatus.RECHAZADO,
        // Confirmar el pago inscribe; rechazarlo desinscribe.
        enrolled: confirmar,
        confirmedAt: new Date(),
        confirmedById: req.user!.id,
      },
    });

    // Avisarle a la familia cómo quedó.
    try {
      await notifyEventPaymentResolved(enrollment.id, enrollment.studentId, confirmar);
    } catch (error) {
      console.error("[events] no se pudo notificar la resolución", error);
    }

    return res.json({
      success: true,
      message: confirmar
        ? "Pago confirmado. El alumno quedó inscrito."
        : "Pago rechazado.",
    });
  }
);

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
    const {
      title,
      date,
      time,
      category,
      requiresPayment,
      priceCents,
      modalities,
    } = req.body ?? {};

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

    // Pago. Un evento con modalidades saca el costo de ellas; uno sin
    // modalidades usa un precio único.
    const conPago = requiresPayment === true;
    let precio: number | null = null;

    const listaModalidades: { name: string; priceCents: number }[] = [];

    if (conPago && Array.isArray(modalities) && modalities.length > 0) {
      const vistos = new Set<string>();

      for (const [i, m] of modalities.entries()) {
        const name = typeof m?.name === "string" ? m.name.trim() : "";
        const cents = Number(m?.priceCents);

        if (name.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Falta el nombre de la modalidad ${i + 1}.`,
          });
        }

        if (!Number.isInteger(cents) || cents <= 0) {
          return res.status(400).json({
            success: false,
            message: `El costo de "${name}" debe ser un entero de centavos mayor a cero.`,
          });
        }

        // El índice único de la base lo rechazaría igual, pero aquí el
        // mensaje dice cuál es la repetida.
        const clave = name.toLowerCase();
        if (vistos.has(clave)) {
          return res.status(400).json({
            success: false,
            message: `La modalidad "${name}" está repetida.`,
          });
        }
        vistos.add(clave);

        listaModalidades.push({ name, priceCents: cents });
      }
    } else if (conPago) {
      const cents = Number(priceCents);

      if (!Number.isInteger(cents) || cents <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Si el evento requiere pago, indica el costo o define al menos una modalidad.",
        });
      }

      precio = cents;
    }

    const [year, month, day] = date.trim().split("-").map(Number);

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        // UTC sin hora, igual que el resto de columnas @db.Date.
        date: new Date(Date.UTC(year, month - 1, day)),
        time: hora,
        category: category as EventCategory,
        requiresPayment: conPago,
        priceCents: precio,
        createdById: req.user!.id,
        modalities:
          listaModalidades.length > 0
            ? { create: listaModalidades }
            : undefined,
      },
      include: { modalities: true },
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
        requiresPayment: event.requiresPayment,
        priceCents: event.priceCents,
        modalities: event.modalities.map((m) => ({
          id: m.id,
          name: m.name,
          priceCents: m.priceCents,
        })),
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
