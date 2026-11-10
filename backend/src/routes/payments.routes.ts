import { Router } from "express";

import { prisma } from "../lib/prisma";
import {
  canManageStudent,
  familyStudentIds,
  scopeToStudentFilter,
  scopeToStudentIdFilter,
  visibleStudentIds,
} from "../lib/access";
import { hoyEnElDojo } from "../lib/dates";
import { marcarMensualidadesVencidas } from "../lib/mensualidades";
import {
  notifyChargeReported,
  notifyChargeResolved,
} from "../lib/notifications";
import { requireAuth, requirePermission } from "../middleware/auth";
import {
  EquipmentRequestStatus,
  EventPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from "../generated/prisma/enums";

const router = Router();

const LIMITE_POR_TIPO = 200;

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * El estado de un cobro, igual para todos los tipos:
 *
 *   PENDIENTE / VENCIDO  la familia debe ese dinero
 *   POR_CONFIRMAR        la familia reportó que pagó; falta que lo confirme
 *   EN_REVISION          el profesor todavía no define disponibilidad y precio
 *   PAGADO / RECHAZADO   ya se resolvió
 */
type Estado =
  | "PENDIENTE"
  | "VENCIDO"
  | "POR_CONFIRMAR"
  | "EN_REVISION"
  | "PAGADO"
  | "RECHAZADO";

type Fila = {
  tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO";
  id: number;
  studentId: number;
  studentName: string;
  /** Qué se cobra. Nulo en mensualidades: la pantalla lo arma con el periodo. */
  concepto: string | null;
  periodYear: number | null;
  periodMonth: number | null;
  /** Nulo mientras el profesor no define el precio. */
  amountCents: number | null;
  estado: Estado;
  /** Verdadero si este cobro se puede pagar en línea ahora mismo. */
  pagable: boolean;
  method: PaymentMethod | null;
  paidAt: string | null;
  note: string | null;
  /** Solo para ordenar; no se manda al cliente. */
  fecha: Date;
};

const ESTADO_DE_EVENTO: Record<EventPaymentStatus, Estado> = {
  PENDIENTE_PAGO: "PENDIENTE",
  REPORTADO: "POR_CONFIRMAR",
  CONFIRMADO: "PAGADO",
  RECHAZADO: "RECHAZADO",
};

const ESTADO_DE_EQUIPO: Record<EquipmentRequestStatus, Estado> = {
  SOLICITADO: "EN_REVISION",
  CONFIRMADO: "PENDIENTE",
  REPORTADO: "POR_CONFIRMAR",
  PAGADO: "PAGADO",
  ENTREGADO: "PAGADO",
  RECHAZADO: "RECHAZADO",
};

/** Guantes, Bucal y 2 más. */
function resumirProductos(nombres: string[]): string {
  const unicos = [...new Set(nombres)];

  if (unicos.length <= 2) return unicos.join(" y ");

  return `${unicos.slice(0, 2).join(", ")} y ${unicos.length - 2} más`;
}

function porCobrar(estado: Estado): boolean {
  return estado === "PENDIENTE" || estado === "VENCIDO";
}

/**
 * GET /payments
 *
 * Todos los cobros en una sola lista: mensualidades, eventos y uniformes,
 * tanto los pagados como los pendientes.
 *
 *   ADMIN     todo el dojo
 *   PROFESOR  las mensualidades de sus alumnos, y los cobros de evento y de
 *             equipo que le corresponden a él
 *   ALUMNO    los suyos
 *   TUTOR     los de los alumnos a su cargo
 *
 * El alcance se calcula SIEMPRE en el servidor a partir del token. No hay
 * parámetro de alumno: si lo hubiera, alguien podría pedir los pagos de otro.
 *
 * Una lista vacía de alumnos produce un filtro imposible (`in: []`), que no
 * devuelve nada. Eso es lo correcto: no es lo mismo que no filtrar.
 */
router.get("/", requireAuth, async (req, res) => {
  await marcarMensualidadesVencidas();

  const user = req.user!;
  const scope = await visibleStudentIds(user);
  const porAlumno = scopeToStudentIdFilter(scope);
  const esProfesor = user.role === Role.PROFESOR;

  const alumno = { select: { firstName: true, lastName: true } };

  const [mensualidades, inscripciones, solicitudes] = await Promise.all([
    prisma.payment.findMany({
      where: porAlumno,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: LIMITE_POR_TIPO,
      include: { student: alumno },
    }),
    prisma.eventEnrollment.findMany({
      // El cobro de un evento es de quien tiene la clave con la que se acreditó.
      where: esProfesor ? { creditedToId: user.id } : porAlumno,
      orderBy: { reportedAt: "desc" },
      take: LIMITE_POR_TIPO,
      include: { student: alumno, event: { select: { title: true } } },
    }),
    prisma.equipmentRequest.findMany({
      where: esProfesor ? { teacherId: user.id } : porAlumno,
      orderBy: { createdAt: "desc" },
      take: LIMITE_POR_TIPO,
      include: {
        student: alumno,
        items: { select: { productName: true } },
      },
    }),
  ]);

  const nombre = (s: { firstName: string; lastName: string }) =>
    `${s.firstName} ${s.lastName}`;

  const filas: Fila[] = [
    ...mensualidades.map((p): Fila => ({
      tipo: "MENSUALIDAD",
      id: p.id,
      studentId: p.studentId,
      studentName: nombre(p.student),
      concepto: null,
      periodYear: p.periodYear,
      periodMonth: p.periodMonth,
      amountCents: p.amountCents,
      estado:
        p.status !== PaymentStatus.PAGADO && p.reportedAt
          ? "POR_CONFIRMAR"
          : p.status,
      pagable: p.status !== PaymentStatus.PAGADO && !p.reportedAt,
      method: p.method ?? p.reportedMethod,
      paidAt: p.paidAt ? dateOnly(p.paidAt) : null,
      note: p.note,
      fecha: p.paidAt ?? new Date(Date.UTC(p.periodYear, p.periodMonth - 1, 1)),
    })),
    ...inscripciones.map((e): Fila => ({
      tipo: "EVENTO",
      id: e.id,
      studentId: e.studentId,
      studentName: nombre(e.student),
      concepto: e.event.title,
      periodYear: null,
      periodMonth: null,
      amountCents: e.amountCents,
      estado: ESTADO_DE_EVENTO[e.status],
      pagable: e.status === EventPaymentStatus.PENDIENTE_PAGO,
      method: e.method,
      paidAt:
        e.status === EventPaymentStatus.CONFIRMADO && e.confirmedAt
          ? dateOnly(e.confirmedAt)
          : null,
      note: e.note,
      fecha: e.confirmedAt ?? e.reportedAt,
    })),
    ...solicitudes.map((s): Fila => ({
      tipo: "EQUIPO",
      id: s.id,
      studentId: s.studentId,
      studentName: nombre(s.student),
      concepto: resumirProductos(s.items.map((i) => i.productName)),
      periodYear: null,
      periodMonth: null,
      amountCents: s.amountCents,
      estado: ESTADO_DE_EQUIPO[s.status],
      pagable: s.status === EquipmentRequestStatus.CONFIRMADO,
      method: s.method,
      paidAt: s.paidAt ? dateOnly(s.paidAt) : null,
      note: s.note,
      fecha: s.paidAt ?? s.createdAt,
    })),
  ];

  // Primero lo que se debe; dentro de cada grupo, lo más reciente arriba.
  filas.sort(
    (a, b) =>
      Number(porCobrar(b.estado)) - Number(porCobrar(a.estado)) ||
      b.fecha.getTime() - a.fecha.getTime()
  );

  const pendientes = filas.filter((f) => porCobrar(f.estado));

  return res.json({
    success: true,
    alcance: scope === "todos" ? "todos" : "propios",
    resumen: {
      pagos: filas.length,
      pendientes: pendientes.length,
      pagados: filas.filter((f) => f.estado === "PAGADO").length,
      totalPendienteCents: pendientes.reduce(
        (suma, f) => suma + (f.amountCents ?? 0),
        0
      ),
    },
    payments: filas.map(({ fecha: _fecha, ...fila }) => fila),
  });
});

const TIPOS_DE_COBRO = ["MENSUALIDAD", "EVENTO", "EQUIPO"] as const;
type TipoDeCobro = (typeof TIPOS_DE_COBRO)[number];

function esTipoDeCobro(valor: unknown): valor is TipoDeCobro {
  return TIPOS_DE_COBRO.includes(valor as TipoDeCobro);
}

const NOMBRE_DE_METODO: Partial<Record<PaymentMethod, string>> = {
  EFECTIVO: "efectivo",
  TRANSFERENCIA: "transferencia",
};

/** Los datos de un cobro que hacen falta para reportarlo o resolverlo. */
async function datosDeCobro(tipo: TipoDeCobro, id: number) {
  if (tipo === "MENSUALIDAD") {
    const p = await prisma.payment.findUnique({
      where: { id },
      include: { student: { select: { teacherId: true } } },
    });

    return p
      ? {
          studentId: p.studentId,
          responsableId: p.student.teacherId,
          concepto: `Mensualidad ${p.periodMonth}/${p.periodYear}`,
          amountCents: p.amountCents as number | null,
          metodoReportado: p.reportedMethod,
        }
      : null;
  }

  if (tipo === "EVENTO") {
    const e = await prisma.eventEnrollment.findUnique({
      where: { id },
      include: { event: { select: { title: true } } },
    });

    return e
      ? {
          studentId: e.studentId,
          responsableId: e.creditedToId,
          concepto: e.event.title,
          amountCents: e.amountCents as number | null,
          metodoReportado: e.method,
        }
      : null;
  }

  const s = await prisma.equipmentRequest.findUnique({ where: { id } });

  return s
    ? {
        studentId: s.studentId,
        responsableId: s.teacherId,
        concepto: "Uniformes y protecciones",
        amountCents: s.amountCents,
        metodoReportado: s.method,
      }
    : null;
}

/**
 * POST /payments/:tipo/:id/report  { method }
 *
 * La familia avisa que pagó en efectivo o por transferencia. El cobro queda
 * por confirmar: NO cuenta como pagado hasta que el admin o el profesor lo
 * confirme, porque nadie ha visto ese dinero todavía.
 */
router.post("/:tipo/:id/report", requireAuth, async (req, res) => {
  const { tipo } = req.params;
  const id = Number(req.params.id);
  const { method } = req.body ?? {};

  if (!esTipoDeCobro(tipo) || !Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "El cobro indicado no es válido.",
    });
  }

  if (method !== PaymentMethod.EFECTIVO && method !== PaymentMethod.TRANSFERENCIA) {
    return res.status(400).json({
      success: false,
      message: "Indica si pagaste en efectivo o por transferencia.",
    });
  }

  const cobro = await datosDeCobro(tipo, id);
  const propios = await familyStudentIds(req.user!);

  if (!cobro || !propios.includes(cobro.studentId)) {
    return res.status(404).json({
      success: false,
      message: "No encontramos ese cobro en tu cuenta.",
    });
  }

  const ahora = new Date();

  // El cambio se condiciona al estado: dos clics no pueden aplicarlo dos veces.
  const { count } =
    tipo === "MENSUALIDAD"
      ? await prisma.payment.updateMany({
          where: { id, status: { not: PaymentStatus.PAGADO }, reportedAt: null },
          data: { reportedMethod: method, reportedAt: ahora },
        })
      : tipo === "EVENTO"
        ? await prisma.eventEnrollment.updateMany({
            where: { id, status: EventPaymentStatus.PENDIENTE_PAGO },
            data: {
              status: EventPaymentStatus.REPORTADO,
              method,
              reportedAt: ahora,
            },
          })
        : await prisma.equipmentRequest.updateMany({
            where: { id, status: EquipmentRequestStatus.CONFIRMADO },
            data: { status: EquipmentRequestStatus.REPORTADO, method },
          });

  if (count === 0) {
    return res.status(409).json({
      success: false,
      message: "Ese cobro ya no está pendiente. Recarga para ver cómo quedó.",
    });
  }

  try {
    await notifyChargeReported(
      `${tipo}-${id}`,
      cobro.responsableId,
      cobro.concepto,
      cobro.amountCents,
      NOMBRE_DE_METODO[method as PaymentMethod] ?? "otro medio"
    );
  } catch (error) {
    console.error("[pagos] no se pudo notificar el reporte", error);
  }

  return res.json({
    success: true,
    message: "Listo. Quedará pagado cuando tu profesor lo confirme.",
  });
});

/**
 * POST /payments/:tipo/:id/resolve  { confirmar }
 *
 * El admin o el profesor responsable confirman que recibieron el dinero. Si
 * no lo recibieron, la mensualidad y el equipo vuelven a quedar pendientes;
 * el evento se rechaza, igual que al resolverlo desde Eventos.
 */
router.post("/:tipo/:id/resolve", requireAuth, async (req, res) => {
  const user = req.user!;
  const { tipo } = req.params;
  const id = Number(req.params.id);
  const { confirmar } = req.body ?? {};

  if (
    !esTipoDeCobro(tipo) ||
    !Number.isInteger(id) ||
    id < 1 ||
    typeof confirmar !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "La solicitud no es válida.",
    });
  }

  const cobro = await datosDeCobro(tipo, id);

  if (!cobro) {
    return res.status(404).json({
      success: false,
      message: "No existe ese cobro.",
    });
  }

  const puede =
    user.role === Role.ADMIN ||
    (user.role === Role.PROFESOR && cobro.responsableId === user.id);

  if (!puede) {
    return res.status(403).json({
      success: false,
      message: "Ese cobro no te corresponde.",
    });
  }

  const ahora = new Date();
  let count: number;

  if (tipo === "MENSUALIDAD") {
    ({ count } = await prisma.payment.updateMany({
      where: {
        id,
        status: { not: PaymentStatus.PAGADO },
        reportedAt: { not: null },
      },
      data: confirmar
        ? {
            status: PaymentStatus.PAGADO,
            paidAt: ahora,
            method: cobro.metodoReportado,
            registeredById: user.id,
          }
        : { reportedAt: null, reportedMethod: null },
    }));
  } else if (tipo === "EVENTO") {
    ({ count } = await prisma.eventEnrollment.updateMany({
      where: { id, status: EventPaymentStatus.REPORTADO },
      data: {
        status: confirmar
          ? EventPaymentStatus.CONFIRMADO
          : EventPaymentStatus.RECHAZADO,
        enrolled: confirmar,
        confirmedAt: ahora,
        confirmedById: user.id,
      },
    }));
  } else {
    ({ count } = await prisma.equipmentRequest.updateMany({
      where: { id, status: EquipmentRequestStatus.REPORTADO },
      data: confirmar
        ? { status: EquipmentRequestStatus.PAGADO, paidAt: ahora }
        : { status: EquipmentRequestStatus.CONFIRMADO, method: null },
    }));
  }

  if (count === 0) {
    return res.status(409).json({
      success: false,
      message: "Ese cobro ya no está por confirmar. Recarga para ver cómo quedó.",
    });
  }

  try {
    await notifyChargeResolved(
      `${tipo}-${id}`,
      cobro.studentId,
      cobro.concepto,
      confirmar
    );
  } catch (error) {
    console.error("[pagos] no se pudo notificar la resolución", error);
  }

  return res.json({
    success: true,
    message: confirmar ? "Pago confirmado." : "Pago no confirmado.",
  });
});

// ---------------------------------------------------------------------------
// Administración de mensualidades
// ---------------------------------------------------------------------------

/** Un millón de pesos: lo que pase de ahí es un error de captura. */
const MONTO_MAXIMO_CENTS = 100_000_000;

function montoValido(valor: unknown): valor is number {
  return (
    Number.isInteger(valor) &&
    (valor as number) > 0 &&
    (valor as number) <= MONTO_MAXIMO_CENTS
  );
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === "string" ? valor.trim() || null : null;
}

/**
 * POST /payments/monthly/generate  { year, month, amountCents, studentIds?, note? }
 *
 * Crea la mensualidad de un periodo para todos los alumnos activos del grupo
 * de quien la genera, o solo para los indicados en `studentIds`.
 *
 * Repetirla no duplica ni altera nada: el índice único (alumno, año, mes) hace
 * que quien ya tiene su mensualidad se omita. Tampoco se le cobra a un alumno
 * un mes anterior a su inscripción.
 */
router.post(
  "/monthly/generate",
  requireAuth,
  requirePermission("payments:write"),
  async (req, res) => {
    const { year, month, amountCents, studentIds, note } = req.body ?? {};
    const anioActual = Number(hoyEnElDojo().slice(0, 4));

    if (
      !Number.isInteger(year) ||
      year < anioActual - 5 ||
      year > anioActual + 1 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "El periodo indicado no es válido.",
      });
    }

    if (!montoValido(amountCents)) {
      return res.status(400).json({
        success: false,
        message: "Indica un monto válido, mayor a cero.",
      });
    }

    const seleccion =
      studentIds === undefined ? null : (studentIds as unknown[]);

    if (
      seleccion !== null &&
      (!Array.isArray(seleccion) ||
        seleccion.length === 0 ||
        !seleccion.every((n) => Number.isInteger(n)))
    ) {
      return res.status(400).json({
        success: false,
        message: "La lista de alumnos no es válida.",
      });
    }

    const user = req.user!;
    const scope = await visibleStudentIds(user);

    if (
      seleccion !== null &&
      scope !== "todos" &&
      !seleccion.every((n) => scope.includes(n as number))
    ) {
      return res.status(403).json({
        success: false,
        message: "La selección incluye alumnos que no están en tu grupo.",
      });
    }

    const alumnos = await prisma.student.findMany({
      where: {
        active: true,
        enrolledAt: { lt: new Date(Date.UTC(year, month, 1)) },
        AND: [
          scopeToStudentFilter(scope) ?? {},
          seleccion !== null ? { id: { in: seleccion as number[] } } : {},
        ],
      },
      select: { id: true },
    });

    if (alumnos.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          "No hay alumnos activos e inscritos en ese periodo para generar mensualidades.",
      });
    }

    const { count } = await prisma.payment.createMany({
      data: alumnos.map((a) => ({
        studentId: a.id,
        periodYear: year,
        periodMonth: month,
        amountCents,
        note: textoOpcional(note),
        registeredById: user.id,
      })),
      skipDuplicates: true,
    });

    // Un periodo ya terminado debe aparecer vencido desde el primer momento.
    await marcarMensualidadesVencidas();

    return res.status(201).json({
      success: true,
      creadas: count,
      yaExistian: alumnos.length - count,
    });
  }
);

/** La mensualidad, si quien pregunta puede administrar a su alumno. */
async function mensualidadAdministrable(
  user: NonNullable<Express.Request["user"]>,
  id: number
) {
  if (!Number.isInteger(id) || id < 1) return null;

  const pago = await prisma.payment.findUnique({
    where: { id },
    select: { id: true, studentId: true, periodMonth: true, periodYear: true, amountCents: true },
  });

  return pago && (await canManageStudent(user, pago.studentId)) ? pago : null;
}

const MENSUALIDAD_NO_ENCONTRADA = {
  success: false,
  message: "No encontramos esa mensualidad en tu grupo.",
};

/**
 * POST /payments/monthly/:id/pay  { method }
 *
 * Registra un pago recibido en el dojo, sin que la familia lo haya reportado.
 * Si ya lo había reportado, esto también lo resuelve.
 */
router.post(
  "/monthly/:id/pay",
  requireAuth,
  requirePermission("payments:write"),
  async (req, res) => {
    const { method } = req.body ?? {};

    if (
      method !== PaymentMethod.EFECTIVO &&
      method !== PaymentMethod.TRANSFERENCIA
    ) {
      return res.status(400).json({
        success: false,
        message: "Indica si se pagó en efectivo o por transferencia.",
      });
    }

    const pago = await mensualidadAdministrable(
      req.user!,
      Number(req.params.id)
    );

    if (!pago) return res.status(404).json(MENSUALIDAD_NO_ENCONTRADA);

    const { count } = await prisma.payment.updateMany({
      where: { id: pago.id, status: { not: PaymentStatus.PAGADO } },
      data: {
        status: PaymentStatus.PAGADO,
        method,
        paidAt: new Date(),
        registeredById: req.user!.id,
        reportedAt: null,
        reportedMethod: null,
      },
    });

    if (count === 0) {
      return res.status(409).json({
        success: false,
        message: "Esa mensualidad ya está pagada.",
      });
    }

    try {
      await notifyChargeResolved(
        `MENSUALIDAD-${pago.id}`,
        pago.studentId,
        `Mensualidad ${pago.periodMonth}/${pago.periodYear}`,
        true
      );
    } catch (error) {
      console.error("[pagos] no se pudo notificar el pago", error);
    }

    return res.json({ success: true, message: "Pago registrado." });
  }
);

const MENSUALIDAD_NO_MODIFICABLE = {
  success: false,
  message:
    "Solo se puede cambiar una mensualidad pendiente. Si la familia reportó un pago, resuélvelo primero.",
};

/**
 * PATCH /payments/monthly/:id  { amountCents?, note? }
 *
 * Corrige una mensualidad que sigue pendiente, por ejemplo para aplicar una beca.
 */
router.patch(
  "/monthly/:id",
  requireAuth,
  requirePermission("payments:write"),
  async (req, res) => {
    const { amountCents, note } = req.body ?? {};

    if (amountCents === undefined && note === undefined) {
      return res.status(400).json({
        success: false,
        message: "No mandaste ningún cambio.",
      });
    }

    if (amountCents !== undefined && !montoValido(amountCents)) {
      return res.status(400).json({
        success: false,
        message: "Indica un monto válido, mayor a cero.",
      });
    }

    const pago = await mensualidadAdministrable(
      req.user!,
      Number(req.params.id)
    );

    if (!pago) return res.status(404).json(MENSUALIDAD_NO_ENCONTRADA);

    const { count } = await prisma.payment.updateMany({
      where: {
        id: pago.id,
        status: { not: PaymentStatus.PAGADO },
        reportedAt: null,
      },
      data: {
        ...(amountCents !== undefined
          ? {
              amountCents,
              // Una orden de PayPal abierta se creó por el monto anterior. Al
              // soltarla ya no se puede capturar y la familia inicia otra.
              externalReference: null,
            }
          : {}),
        ...(note !== undefined ? { note: textoOpcional(note) } : {}),
      },
    });

    if (count === 0) return res.status(409).json(MENSUALIDAD_NO_MODIFICABLE);

    return res.json({ success: true, message: "Mensualidad actualizada." });
  }
);

/**
 * DELETE /payments/monthly/:id
 *
 * Quita una mensualidad generada por error. Una pagada no se puede borrar: es
 * historial de dinero que ya entró.
 */
router.delete(
  "/monthly/:id",
  requireAuth,
  requirePermission("payments:write"),
  async (req, res) => {
    const pago = await mensualidadAdministrable(
      req.user!,
      Number(req.params.id)
    );

    if (!pago) return res.status(404).json(MENSUALIDAD_NO_ENCONTRADA);

    const { count } = await prisma.payment.deleteMany({
      where: {
        id: pago.id,
        status: { not: PaymentStatus.PAGADO },
        reportedAt: null,
      },
    });

    if (count === 0) return res.status(409).json(MENSUALIDAD_NO_MODIFICABLE);

    return res.json({ success: true, message: "Mensualidad eliminada." });
  }
);

export default router;
