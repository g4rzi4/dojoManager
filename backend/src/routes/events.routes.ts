import { Router } from "express";

import { prisma } from "../lib/prisma";
import {
  canManageStudent,
  familyStudentIds,
  scopeToStudentIdFilter,
  visibleStudentIds,
} from "../lib/access";
import { hoyEnElDojo } from "../lib/dates";
import {
  notifyEnrolledByTeacher,
  notifyEventPaymentReported,
  notifyEventPaymentResolved,
  notifyNewEvent,
} from "../lib/notifications";
import { paypalConfigured } from "../lib/paypal";
import { normalizeTeacherCode } from "../lib/teacherCode";
import { preciosParaProfesor, profesorDeAlumno } from "../lib/eventPricing";
import { requireAuth, requirePermission } from "../middleware/auth";
import { can } from "../permissions";
import {
  CATEGORIAS,
  categoriaValida,
  categoriasDe,
  infoDeCategoria,
  rangoLegible,
} from "../lib/competitionCategories";
import {
  AgeCategory,
  BeltClass,
  CompetitionGender,
  EventCategory,
  EventPaymentStatus,
  PaymentMethod,
  Role,
} from "../generated/prisma/enums";

const router = Router();

/** Arma el texto de la categoría: "Infantil 8-9 años · femenil · color". */
function describirCategoria(
  gender: CompetitionGender | null,
  beltClass: BeltClass | null,
  ageCategory: AgeCategory | null
): string | null {
  if (!gender || !beltClass || !ageCategory) return null;

  const info = infoDeCategoria(ageCategory);
  if (!info) return null;

  const rama = beltClass === BeltClass.NEGRA ? "cinta negra" : "cinta de color";

  return `${info.label} ${rangoLegible(info)} · ${gender.toLowerCase()} · ${rama}`;
}

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

    // El personal ve quién de su grupo dijo que va o que no; la familia, lo
    // que respondió por sus alumnos.
    const esPersonal =
      req.user!.role === Role.ADMIN || req.user!.role === Role.PROFESOR;
    const filtroDeGrupo = esPersonal
      ? scopeToStudentIdFilter(await visibleStudentIds(req.user!))
      : undefined;

    const [events, misInscripciones, respuestas] = await Promise.all([
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
              id: true,
              eventId: true,
              studentId: true,
              status: true,
              enrolled: true,
            },
          }),
      esPersonal
        ? prisma.eventRsvp.findMany({
            where: filtroDeGrupo,
            include: { student: { select: { firstName: true, lastName: true } } },
          })
        : propios.length === 0
          ? []
          : prisma.eventRsvp.findMany({
              where: { studentId: { in: propios } },
              include: { student: { select: { firstName: true, lastName: true } } },
            }),
    ]);

    /**
     * Qué lista de precios ve quien consulta:
     *   PROFESOR         la suya
     *   ALUMNO / TUTOR   la del profesor de su alumno, que es a quien pagará
     *   ADMIN            los precios base
     */
    let precioDe: number | null = null;

    if (req.user!.role === Role.PROFESOR) {
      precioDe = req.user!.id;
    } else if (propios.length > 0) {
      precioDe = await profesorDeAlumno(propios[0]);
    }

    const modalidadesPorEvento = new Map(
      await Promise.all(
        events.map(
          async (e) =>
            [e.id, await preciosParaProfesor(e.modalities, precioDe)] as const
        )
      )
    );

    return res.json({
      success: true,
      events: events.map((e) => {
        const mias = misInscripciones.filter((i) => i.eventId === e.id);
        const delEvento = respuestas.filter((r) => r.eventId === e.id);
        const nombre = (r: (typeof respuestas)[number]) =>
          `${r.student.firstName} ${r.student.lastName}`;

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
          modalities: modalidadesPorEvento.get(e.id) ?? [],
          /** Cuántos reportes de pago lleva, para admin y profesores. */
          reportes: e._count.enrollments,
          /** Estado de los alumnos a cargo de quien consulta. */
          misAlumnos: mias.map((i) => ({
            enrollmentId: i.id,
            studentId: i.studentId,
            status: i.status,
            enrolled: i.enrolled,
          })),
          /** Lo que respondió la familia por cada uno de sus alumnos. */
          misRespuestas: esPersonal
            ? []
            : delEvento.map((r) => ({ studentId: r.studentId, asistira: r.attending })),
          /** Para el personal: quién de su grupo va y quién no. */
          respuestas: esPersonal
            ? {
                asistiran: delEvento.filter((r) => r.attending).map(nombre),
                noAsistiran: delEvento.filter((r) => !r.attending).map(nombre),
              }
            : null,
        };
      }),
    });
  }
);

/**
 * POST /events/:id/rsvp  { studentId?, asistira }
 *
 * El alumno o su tutor dicen si va o no al evento. En uno gratuito, decir que
 * va basta para quedar inscrito; en uno con costo, la inscripción se cierra al
 * confirmarse el pago, y esto solo registra que piensa ir.
 */
router.post("/:id/rsvp", requireAuth, async (req, res) => {
  const eventId = Number(req.params.id);
  const { studentId, asistira } = req.body ?? {};

  if (!Number.isInteger(eventId) || eventId < 1 || typeof asistira !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Indica si el alumno va o no al evento.",
    });
  }

  const propios = await familyStudentIds(req.user!);

  if (propios.length === 0) {
    return res.status(403).json({
      success: false,
      message: "Tu cuenta no tiene alumnos a su cargo.",
    });
  }

  let alumnoId = propios[0];

  if (studentId === undefined || studentId === null) {
    if (propios.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Indica por cuál de tus hijos respondes.",
      });
    }
  } else {
    alumnoId = Number(studentId);

    if (!propios.includes(alumnoId)) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está a tu cargo.",
      });
    }
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, date: true },
  });

  if (!event) {
    return res.status(404).json({ success: false, message: "No existe ese evento." });
  }

  // Las fechas @db.Date llegan a medianoche UTC: se compara el día como texto.
  if (event.date.toISOString().slice(0, 10) < hoyEnElDojo()) {
    return res.status(400).json({ success: false, message: "Ese evento ya pasó." });
  }

  if (!asistira) {
    const inscripcion = await prisma.eventEnrollment.findUnique({
      where: { eventId_studentId: { eventId, studentId: alumnoId } },
      select: { status: true },
    });

    // Con un pago ya reportado o confirmado, bajarse es asunto del profesor:
    // hay dinero de por medio.
    if (
      inscripcion?.status === EventPaymentStatus.REPORTADO ||
      inscripcion?.status === EventPaymentStatus.CONFIRMADO
    ) {
      return res.status(409).json({
        success: false,
        message: "Ya tiene un pago registrado para este evento. Si no podrá ir, avísale a su profesor.",
      });
    }
  }

  await prisma.eventRsvp.upsert({
    where: { eventId_studentId: { eventId, studentId: alumnoId } },
    update: { attending: asistira, respondedById: req.user!.id },
    create: {
      eventId,
      studentId: alumnoId,
      attending: asistira,
      respondedById: req.user!.id,
    },
  });

  return res.json({
    success: true,
    message: asistira ? "Listo, quedó apuntado." : "Listo, avisamos que no irá.",
  });
});

/**
 * GET /events/categories
 *
 * El catálogo de categorías de competencia, con sus rangos de edad.
 *
 * Lo sirve el backend para que el frontend no duplique la tabla: si algún
 * día cambian los rangos, se cambian en un solo lugar.
 *
 * Va ANTES de /:id para que Express no tome "categories" por un id.
 */
router.get(
  "/categories",
  requireAuth,
  requirePermission("events:read"),
  async (_req, res) => {
    return res.json({
      success: true,
      generos: Object.values(CompetitionGender),
      ramas: Object.values(BeltClass),
      categorias: CATEGORIAS.map((c) => ({
        value: c.category,
        label: c.label,
        rango: rangoLegible(c),
        minAge: c.minAge,
        maxAge: c.maxAge,
        beltClasses: c.beltClasses,
      })),
    });
  }
);


type ModalidadEvento = { id: number; name: string; priceCents: number };

/**
 * Calcula cuánto se cobra y por qué conceptos.
 *
 * Recibe las modalidades con el precio YA resuelto para el profesor que
 * cobra: cada profesor puede tener el suyo para sus alumnos.
 *
 * Con modalidades, el total es la SUMA de las elegidas: hay padres que
 * inscriben a su hijo en kata y kumite y pagan las dos. Sin modalidades, es
 * el precio único del evento.
 *
 * Los precios se COPIAN aquí para guardarlos en la inscripción, y así poder
 * reconstruir el desglose aunque el evento cambie de precio después.
 *
 * Lo comparten el reporte del alumno y la inscripción que hace el profesor,
 * para que las dos rutas cobren exactamente igual.
 */
function resolverCobro(
  event: { priceCents: number | null; modalities: ModalidadEvento[] },
  modalityIds: unknown
): { elegidas: ModalidadEvento[]; total: number; error?: string } {
  const vacio = { elegidas: [] as ModalidadEvento[], total: 0 };

  if (event.modalities.length === 0) {
    if (event.priceCents === null) {
      return { ...vacio, error: "Este evento no tiene costo configurado." };
    }

    return { elegidas: [], total: event.priceCents };
  }

  if (!Array.isArray(modalityIds) || modalityIds.length === 0) {
    return {
      ...vacio,
      error: `Elige al menos una modalidad: ${event.modalities
        .map((m) => m.name)
        .join(", ")}.`,
    };
  }

  const elegidas: ModalidadEvento[] = [];
  const vistos = new Set<number>();

  for (const raw of modalityIds) {
    const mid = Number(raw);
    const modalidad = event.modalities.find((m) => m.id === mid);

    if (!modalidad) {
      return {
        ...vacio,
        error: "Una de las modalidades no pertenece a este evento.",
      };
    }

    // Elegir la misma dos veces no debe cobrarse doble.
    if (vistos.has(mid)) continue;
    vistos.add(mid);

    elegidas.push(modalidad);
  }

  return {
    elegidas,
    total: elegidas.reduce((suma, m) => suma + m.priceCents, 0),
  };
}

/**
 * Valida la categoría de competencia.
 *
 * Los tres ejes van juntos o ninguno: una categoría a medias no sirve para
 * armar las llaves de un torneo. Se comprueba que exista en la rama de cinta
 * elegida, pero NUNCA contra la edad del alumno: inscribir a alguien en una
 * categoría mayor para foguearlo es legítimo.
 */
function resolverCategoria(
  gender: unknown,
  beltClass: unknown,
  ageCategory: unknown
):
  | {
      valor: {
        gender: CompetitionGender;
        beltClass: BeltClass;
        ageCategory: AgeCategory;
      } | null;
    }
  | { error: string } {
  if (gender === undefined || gender === null || gender === "") {
    return { valor: null };
  }

  const generos = Object.values(CompetitionGender) as string[];
  const ramas = Object.values(BeltClass) as string[];
  const categorias = Object.values(AgeCategory) as string[];

  if (typeof gender !== "string" || !generos.includes(gender)) {
    return { error: `Rama no válida. Opciones: ${generos.join(", ")}.` };
  }

  if (typeof beltClass !== "string" || !ramas.includes(beltClass)) {
    return {
      error: "Indica si compite en cintas de color o en cintas negras.",
    };
  }

  if (typeof ageCategory !== "string" || !categorias.includes(ageCategory)) {
    return { error: "Indica la categoría de edad." };
  }

  if (!categoriaValida(ageCategory as AgeCategory, beltClass as BeltClass)) {
    const validas = categoriasDe(beltClass as BeltClass)
      .map((c) => `${c.label} (${rangoLegible(c)})`)
      .join(", ");

    return {
      error: `Esa categoría no existe en ${
        beltClass === "NEGRA" ? "cintas negras" : "cintas de color"
      }. Opciones: ${validas}.`,
    };
  }

  return {
    valor: {
      gender: gender as CompetitionGender,
      beltClass: beltClass as BeltClass,
      ageCategory: ageCategory as AgeCategory,
    },
  };
}

/** Tipos de evento válidos (clase, examen, torneo, pago). */
const CATEGORIAS_EVENTO = Object.values(EventCategory) as string[];

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

  const {
    teacherCode,
    studentId,
    method,
    note,
    modalityIds,
    gender,
    beltClass,
    ageCategory,
  } = req.body ?? {};

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

  const categoria = resolverCategoria(gender, beltClass, ageCategory);

  if ("error" in categoria) {
    return res.status(400).json({ success: false, message: categoria.error });
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

  // La clave decide a quién se le acredita el cobro Y qué precios aplican:
  // cada profesor puede tener los suyos para sus alumnos.
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

  const conPrecios = await preciosParaProfesor(event.modalities, teacher.id);

  const { elegidas, total, error: errorCobro } = resolverCobro(
    { priceCents: event.priceCents, modalities: conPrecios },
    modalityIds
  );

  if (errorCobro) {
    return res.status(400).json({ success: false, message: errorCobro });
  }

  const pagaConPayPal = method === PaymentMethod.PAYPAL;

  if (pagaConPayPal && !paypalConfigured()) {
    return res.status(503).json({
      success: false,
      message: "El pago en línea no está disponible.",
    });
  }

  let yaReportado = await prisma.eventEnrollment.findUnique({
    where: { eventId_studentId: { eventId, studentId: alumnoId } },
    select: { id: true, status: true, method: true },
  });

  // Un checkout de PayPal que quedó sin pagar no debe bloquear para siempre:
  // se descarta y la familia puede volver a elegir. Es seguro porque capturar
  // exige que la orden siga ligada a una inscripción existente.
  if (
    yaReportado?.status === EventPaymentStatus.PENDIENTE_PAGO &&
    yaReportado.method === PaymentMethod.PAYPAL
  ) {
    await prisma.eventEnrollment.delete({ where: { id: yaReportado.id } });
    yaReportado = null;
  }

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
      // Con PayPal aún no hay nada que confirmar: queda pendiente hasta que
      // se capture el pago, y entonces se inscribe solo.
      status: pagaConPayPal
        ? EventPaymentStatus.PENDIENTE_PAGO
        : EventPaymentStatus.REPORTADO,
      gender: categoria.valor?.gender ?? null,
      beltClass: categoria.valor?.beltClass ?? null,
      ageCategory: categoria.valor?.ageCategory ?? null,
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

  if (pagaConPayPal) {
    return res.status(201).json({
      success: true,
      enrollmentId: enrollment.id,
      amountCents: total,
      message: "Completa tu pago con PayPal para quedar inscrito.",
    });
  }

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
 * POST /events/:id/enroll
 *
 * El profesor inscribe a uno de SUS alumnos, eligiendo sus modalidades.
 *
 * La inscripción nace en PENDIENTE_PAGO: el alumno ya sabe en qué va y
 * cuánto debe, pero no está inscrito hasta que el pago se confirme. Al
 * alumno y a sus tutores les llega la notificación con el detalle.
 *
 * Un profesor solo puede inscribir alumnos de su grupo; el admin, a
 * cualquiera.
 */
router.post(
  "/:id/enroll",
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

    const { studentId, modalityIds, gender, beltClass, ageCategory, note } =
      req.body ?? {};

    const alumnoId = Number(studentId);

    if (!Number.isInteger(alumnoId) || alumnoId < 1) {
      return res.status(400).json({
        success: false,
        message: "Indica a qué alumno inscribes.",
      });
    }

    // Un profesor solo inscribe a los suyos.
    if (!(await canManageStudent(req.user!, alumnoId))) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está en tu grupo.",
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        requiresPayment: true,
        priceCents: true,
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
        message: "Este evento no requiere inscripción con pago.",
      });
    }

    // Los precios del profesor que inscribe: son los que cobra a su grupo.
    const conPrecios = await preciosParaProfesor(
      event.modalities,
      req.user!.id
    );

    const { elegidas, total, error } = resolverCobro(
      { priceCents: event.priceCents, modalities: conPrecios },
      modalityIds
    );

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const categoria = resolverCategoria(gender, beltClass, ageCategory);

    if ("error" in categoria) {
      return res.status(400).json({ success: false, message: categoria.error });
    }

    const yaExiste = await prisma.eventEnrollment.findUnique({
      where: { eventId_studentId: { eventId, studentId: alumnoId } },
      select: { id: true },
    });

    if (yaExiste) {
      return res.status(409).json({
        success: false,
        message: "Ese alumno ya está en la lista de este evento.",
      });
    }

    const enrollment = await prisma.eventEnrollment.create({
      data: {
        eventId,
        studentId: alumnoId,
        // Se acredita a quien inscribe: es quien va a recibir el pago.
        creditedToId: req.user!.id,
        amountCents: total,
        status: EventPaymentStatus.PENDIENTE_PAGO,
        enrolled: false,
        gender: categoria.valor?.gender ?? null,
        beltClass: categoria.valor?.beltClass ?? null,
        ageCategory: categoria.valor?.ageCategory ?? null,
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

    // Avisarle a la familia en qué va y cuánto debe.
    try {
      await notifyEnrolledByTeacher(
        enrollment.id,
        alumnoId,
        event.title,
        elegidas.map((m) => m.name),
        total,
        describirCategoria(
          categoria.valor?.gender ?? null,
          categoria.valor?.beltClass ?? null,
          categoria.valor?.ageCategory ?? null
        )
      );
    } catch (e) {
      console.error("[events] no se pudo notificar la inscripción", e);
    }

    return res.status(201).json({
      success: true,
      message: "Alumno inscrito. Le avisamos lo que tiene que pagar.",
    });
  }
);

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
        gender: e.gender,
        beltClass: e.beltClass,
        ageCategory: e.ageCategory,
        /** Texto listo para mostrar: "Infantil 8-9 años · femenil". */
        categoriaLegible: describirCategoria(e.gender, e.beltClass, e.ageCategory),
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
      select: {
        id: true,
        creditedToId: true,
        status: true,
        studentId: true,
        event: { select: { title: true } },
        modalities: { select: { modality: { select: { name: true } } } },
      },
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
      // Con el título y las modalidades: es el dato que la familia necesita
      // el día del torneo, y no tienen por qué recordar lo que eligieron.
      await notifyEventPaymentResolved(
        enrollment.id,
        enrollment.studentId,
        confirmar,
        enrollment.event.title,
        enrollment.modalities.map((m) => m.modality.name)
      );
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

    if (typeof category !== "string" || !CATEGORIAS_EVENTO.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Categoría no válida. Opciones: ${CATEGORIAS_EVENTO.join(", ")}.`,
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
 * PATCH /events/:id
 *
 * Edita un evento: sus datos y los costos por modalidad. Lo hacen el ADMIN
 * y los PROFESOR, aunque el evento lo haya creado alguien más.
 *
 * Sobre las modalidades:
 *
 *  - Las que traen `id` se actualizan.
 *  - Las que no lo traen se crean.
 *  - Las que existían y no vienen en la lista se BORRAN, pero solo si nadie
 *    las ha usado todavía. Borrar una modalidad con alumnos inscritos
 *    destruiría el desglose de sus cobros, así que se rechaza.
 *
 * Cambiar un precio NO altera los cobros ya hechos: cada inscripción guardó
 * su propio precio al momento de reportarse.
 */
router.patch(
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

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        modalities: {
          include: { _count: { select: { enrollments: true } } },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "No existe ese evento.",
      });
    }

    const { title, date, time, category, requiresPayment, priceCents, modalities } =
      req.body ?? {};

    const datos: {
      title?: string;
      date?: Date;
      time?: string | null;
      category?: EventCategory;
      requiresPayment?: boolean;
      priceCents?: number | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El título no puede quedar vacío.",
        });
      }
      datos.title = title.trim();
    }

    if (date !== undefined) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        return res.status(400).json({
          success: false,
          message: "La fecha debe venir como AAAA-MM-DD.",
        });
      }
      const [y, m, d] = date.trim().split("-").map(Number);
      datos.date = new Date(Date.UTC(y, m - 1, d));
    }

    if (time !== undefined) {
      if (time === null || time === "") {
        datos.time = null;
      } else if (
        typeof time === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())
      ) {
        datos.time = time.trim();
      } else {
        return res.status(400).json({
          success: false,
          message: "La hora debe venir como HH:MM, de 00:00 a 23:59.",
        });
      }
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !CATEGORIAS_EVENTO.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Categoría no válida. Opciones: ${CATEGORIAS_EVENTO.join(", ")}.`,
        });
      }
      datos.category = category as EventCategory;
    }

    if (requiresPayment !== undefined) {
      datos.requiresPayment = requiresPayment === true;
    }

    if (priceCents !== undefined) {
      if (priceCents === null) {
        datos.priceCents = null;
      } else {
        const cents = Number(priceCents);
        if (!Number.isInteger(cents) || cents <= 0) {
          return res.status(400).json({
            success: false,
            message: "El costo debe ser un entero de centavos mayor a cero.",
          });
        }
        datos.priceCents = cents;
      }
    }

    const esAdminEditando = req.user!.role === Role.ADMIN;

    /**
     * Un PROFESOR no cambia el evento para todos: solo ajusta lo que les
     * cobra a SUS alumnos. Si manda datos estructurales se le rechaza, para
     * que no crea que cambió algo global y luego descubra que no.
     */
    if (!esAdminEditando) {
      const estructurales = ["title", "date", "time", "category", "requiresPayment", "priceCents"]
        .filter((campo) => req.body?.[campo] !== undefined);

      if (estructurales.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Solo el administrador puede cambiar ${estructurales.join(", ")}. Tú puedes ajustar los costos por modalidad para tus alumnos.`,
        });
      }

      if (!Array.isArray(modalities) || modalities.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Manda los costos por modalidad que quieres ajustar.",
        });
      }

      const ajustes: { modalityId: number; priceCents: number }[] = [];

      for (const m of modalities) {
        const mid = Number(m?.id);
        const cents = Number(m?.priceCents);

        if (!event.modalities.some((x) => x.id === mid)) {
          return res.status(400).json({
            success: false,
            message:
              "Solo puedes ajustar el precio de modalidades que ya existen. Pídele al administrador que agregue o quite modalidades.",
          });
        }

        if (!Number.isInteger(cents) || cents <= 0) {
          return res.status(400).json({
            success: false,
            message: "El costo debe ser un entero de centavos mayor a cero.",
          });
        }

        ajustes.push({ modalityId: mid, priceCents: cents });
      }

      for (const a of ajustes) {
        await prisma.teacherModalityPrice.upsert({
          where: {
            modalityId_teacherId: {
              modalityId: a.modalityId,
              teacherId: req.user!.id,
            },
          },
          update: { priceCents: a.priceCents },
          create: { ...a, teacherId: req.user!.id },
        });
      }

      return res.json({
        success: true,
        message: "Listo. Estos precios aplican solo a tus alumnos.",
      });
    }

    // -----------------------------------------------------------------------
    // Modalidades (solo el administrador llega aquí)
    // -----------------------------------------------------------------------
    type CambioModalidad = { id?: number; name: string; priceCents: number };
    let plan: {
      crear: { name: string; priceCents: number }[];
      actualizar: { id: number; name: string; priceCents: number }[];
      borrar: number[];
    } | null = null;

    if (modalities !== undefined) {
      if (!Array.isArray(modalities)) {
        return res.status(400).json({
          success: false,
          message: "Las modalidades deben venir como lista.",
        });
      }

      const limpias: CambioModalidad[] = [];
      const nombres = new Set<string>();

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

        const clave = name.toLowerCase();
        if (nombres.has(clave)) {
          return res.status(400).json({
            success: false,
            message: `La modalidad "${name}" está repetida.`,
          });
        }
        nombres.add(clave);

        const mid = m?.id === undefined || m?.id === null ? undefined : Number(m.id);

        if (mid !== undefined && !event.modalities.some((x) => x.id === mid)) {
          return res.status(400).json({
            success: false,
            message: "Una de las modalidades no pertenece a este evento.",
          });
        }

        limpias.push({ id: mid, name, priceCents: cents });
      }

      const conservados = new Set(
        limpias.filter((m) => m.id !== undefined).map((m) => m.id as number)
      );

      const aBorrar = event.modalities.filter((m) => !conservados.has(m.id));

      // Guardarraíl: borrar una modalidad con inscritos destruiría el
      // desglose de sus cobros.
      const conInscritos = aBorrar.filter((m) => m._count.enrollments > 0);

      if (conInscritos.length > 0) {
        return res.status(409).json({
          success: false,
          message: `No puedes quitar ${conInscritos
            .map((m) => `"${m.name}"`)
            .join(", ")}: ya hay alumnos inscritos en esa modalidad. Puedes cambiarle el precio, pero no borrarla.`,
        });
      }

      plan = {
        crear: limpias
          .filter((m) => m.id === undefined)
          .map((m) => ({ name: m.name, priceCents: m.priceCents })),
        actualizar: limpias
          .filter((m) => m.id !== undefined)
          .map((m) => ({ id: m.id as number, name: m.name, priceCents: m.priceCents })),
        borrar: aBorrar.map((m) => m.id),
      };
    }

    /**
     * Un evento "con pago" pero sin costo ni modalidades es una trampa: el
     * alumno abre el formulario y no puede pagar nada. Se comprueba el
     * estado FINAL, no solo lo que llegó en esta petición.
     */
    const pagoFinal = datos.requiresPayment ?? event.requiresPayment;

    const modalidadesFinales = plan
      ? plan.actualizar.length + plan.crear.length
      : event.modalities.length;

    const precioFinal =
      datos.priceCents !== undefined ? datos.priceCents : event.priceCents;

    if (pagoFinal && modalidadesFinales === 0 && !precioFinal) {
      return res.status(400).json({
        success: false,
        message:
          "Si el evento requiere pago, define un costo o al menos una modalidad.",
      });
    }

    // Todo junto: si algo falla, el evento no queda a medias.
    await prisma.$transaction(async (tx) => {
      if (Object.keys(datos).length > 0) {
        await tx.event.update({ where: { id }, data: datos });
      }

      if (plan) {
        if (plan.borrar.length > 0) {
          await tx.eventModality.deleteMany({
            where: { id: { in: plan.borrar } },
          });
        }

        for (const m of plan.actualizar) {
          await tx.eventModality.update({
            where: { id: m.id },
            data: { name: m.name, priceCents: m.priceCents },
          });
        }

        if (plan.crear.length > 0) {
          await tx.eventModality.createMany({
            data: plan.crear.map((m) => ({ ...m, eventId: id })),
          });
        }
      }
    });

    return res.json({ success: true, message: "Evento actualizado." });
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
