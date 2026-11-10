import { Router, type NextFunction, type Request, type Response } from "express";

import {
  canViewStudent,
  familyStudentIds,
  scopeToStudentFilter,
  scopeToStudentIdFilter,
  visibleStudentIds,
} from "../lib/access";
import { beltLabel } from "../lib/belts";
import { categoriaSugerida, infoDeCategoria } from "../lib/competitionCategories";
import { hoyEnElDojo } from "../lib/dates";
import { marcarMensualidadesVencidas } from "../lib/mensualidades";
import { notifyPaymentReminder } from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { INCLUIR_PAGO_RECORDADO, resumirRecuperacion } from "../lib/recuperacion";
import {
  asistenteDisponible,
  montosCorrectos,
  recomendarEquipo,
  redactarAviso,
  redactarRecordatorio,
  redactarReporte,
  resumirAlumno,
  revisarGrupo,
  type AlumnoConAdeudo,
} from "../lib/sensei";
import { config } from "../config";
import { requireAuth, type AuthUser } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import {
  Belt,
  BeltClass,
  EquipmentRequestStatus,
  EventPaymentStatus,
  PaymentStatus,
  Role,
} from "../generated/prisma/enums";

/**
 * Sensei: el asistente de la app, con tareas distintas según el rol.
 *
 *   ADMIN y PROFESOR  cobranza, revisión del grupo y redacción de avisos
 *   TUTOR y ALUMNO    asesor de equipo
 *   Los cuatro        resumen del alumno
 *
 * Cada tarea arma sus datos con el alcance de quien pregunta, igual que el
 * resto de la API, y solo entonces se los pasa a Claude.
 */
const router = Router();

router.use(requireAuth);

const MAX_FAMILIAS = 15;
const EN_PARALELO = 3;
const MAX_LARGO_MENSAJE = 1200;
const MAX_ALUMNOS_REVISION = 40;
const DIA_MS = 86_400_000;

/** Cada llamada a Claude cuesta: cada grupo de tareas tiene su límite. */
const limite = (maximo: number) =>
  rateLimit({
    maximo,
    ventanaSegundos: 10 * 60,
    mensaje: "Ya hiciste varias peticiones a Sensei. Espera unos minutos para volver a intentarlo.",
  });

const limiteCobranza = limite(6);
const limiteGrupo = limite(4);
const limiteAviso = limite(10);
const limiteFamilia = limite(10);

const esPersonal = (u: AuthUser) => u.role === Role.ADMIN || u.role === Role.PROFESOR;
const esFamilia = (u: AuthUser) => u.role === Role.TUTOR || u.role === Role.ALUMNO;

function soloPara(condicion: (u: AuthUser) => boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!condicion(req.user!)) {
      return res.status(403).json({
        success: false,
        message: "Esta tarea de Sensei no está disponible para tu cuenta.",
      });
    }

    next();
  };
}

function disponible(_req: Request, res: Response, next: NextFunction) {
  if (!asistenteDisponible()) {
    return res.status(503).json({
      success: false,
      message: "Sensei no está disponible: falta configurar la llave de Claude.",
    });
  }

  next();
}

function fallo(res: Response, contexto: string, error: unknown) {
  console.error(`[sensei] ${contexto}`, error);

  return res.status(502).json({
    success: false,
    message: "Sensei no pudo responder. Intenta de nuevo en un momento.",
  });
}

function enlaceDePago(): string {
  return `${config.appUrl}/pagos`;
}

const aPesos = (centavos: number) => Math.round(centavos / 100);

function edadEn(birthDate: Date | null): number | null {
  if (!birthDate) return null;

  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - birthDate.getUTCFullYear();
  const cumplio =
    hoy.getUTCMonth() > birthDate.getUTCMonth() ||
    (hoy.getUTCMonth() === birthDate.getUTCMonth() &&
      hoy.getUTCDate() >= birthDate.getUTCDate());

  return cumplio ? edad : edad - 1;
}

const texto = (valor: unknown, maximo: number) =>
  typeof valor === "string" ? valor.trim().slice(0, maximo) : "";

/** GET /sensei/estado — si Sensei está activo y qué tareas tiene este rol. */
router.get("/estado", (req, res) => {
  const user = req.user!;

  return res.json({
    success: true,
    disponible: asistenteDisponible(),
    enlaceDePago: enlaceDePago(),
    tareas: esPersonal(user)
      ? ["cobranza", "grupo", "aviso", "resumen"]
      : esFamilia(user)
        ? ["equipo", "resumen"]
        : [],
  });
});

// ---------------------------------------------------------------------------
// Cobranza (admin y profesores)
// ---------------------------------------------------------------------------

/**
 * Las mensualidades pendientes o vencidas del alcance de quien pregunta,
 * agrupadas por alumno con los campos de /api/agent/unpaid, sin teléfono ni
 * correo. Los prompts dependen de esos nombres.
 */
async function adeudosDe(user: AuthUser): Promise<AlumnoConAdeudo[]> {
  await marcarMensualidadesVencidas();

  const scope = await visibleStudentIds(user);

  const mensualidades = await prisma.payment.findMany({
    where: {
      ...scopeToStudentIdFilter(scope),
      status: { in: [PaymentStatus.PENDIENTE, PaymentStatus.VENCIDO] },
      // Si la familia ya reportó que pagó, no se le vuelve a cobrar.
      reportedAt: null,
    },
    include: {
      student: {
        include: {
          guardians: { include: { guardian: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
  });

  const porAlumno = new Map<number, AlumnoConAdeudo>();

  for (const m of mensualidades) {
    const s = m.student;
    let alumno = porAlumno.get(s.id);

    if (!alumno) {
      const principal = s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];

      alumno = {
        alumnoId: s.id,
        alumno: `${s.firstName} ${s.lastName}`,
        tutor: principal?.guardian.name ?? s.guardianName ?? null,
        montoAdeudado: 0,
        pagos: [],
      };

      porAlumno.set(s.id, alumno);
    }

    const monto = aPesos(m.amountCents);

    alumno.pagos.push({
      pagoId: m.id,
      mes: `${m.periodYear}-${String(m.periodMonth).padStart(2, "0")}`,
      monto,
      estado: m.status,
    });
    alumno.montoAdeudado += monto;
  }

  return [...porAlumno.values()].sort((a, b) => b.montoAdeudado - a.montoAdeudado);
}

/** Ejecuta `tarea` sobre cada elemento, con a lo más `limite` a la vez. */
async function enLotes<T, R>(
  elementos: T[],
  limite: number,
  tarea: (elemento: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(elementos.length);
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < elementos.length) {
      const i = siguiente++;
      resultados[i] = await tarea(elementos[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));

  return resultados;
}

/** POST /sensei/cobranza/recordatorios — borradores; no envía nada. */
router.post(
  "/cobranza/recordatorios",
  soloPara(esPersonal),
  disponible,
  limiteCobranza,
  async (req, res) => {
    const adeudos = await adeudosDe(req.user!);
    const elegidos = adeudos.slice(0, MAX_FAMILIAS);

    const borradores = await enLotes(elegidos, EN_PARALELO, async (alumno) => {
      try {
        const mensaje = await redactarRecordatorio(alumno);

        return {
          ...alumno,
          mensaje,
          montosVerificados: montosCorrectos(mensaje, alumno),
          error: null as string | null,
        };
      } catch (error) {
        console.error("[sensei] no se pudo redactar", alumno.alumnoId, error);

        return {
          ...alumno,
          mensaje: null,
          montosVerificados: false,
          error: "No se pudo redactar este mensaje. Intenta de nuevo más tarde.",
        };
      }
    });

    return res.json({
      success: true,
      borradores,
      familiasSinBorrador: adeudos.length - elegidos.length,
      enlaceDePago: enlaceDePago(),
    });
  }
);

/**
 * POST /sensei/cobranza/enviar  { recordatorios: [{ alumnoId, mensaje }] }
 *
 * Envía lo que aprobó una persona como notificación al alumno y a sus
 * tutores, y registra cada recordatorio para medir la recuperación.
 */
router.post("/cobranza/enviar", soloPara(esPersonal), async (req, res) => {
  const { recordatorios } = req.body ?? {};

  if (!Array.isArray(recordatorios) || recordatorios.length === 0 || recordatorios.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Elige de 1 a 50 recordatorios para enviar.",
    });
  }

  const invalido = recordatorios.find(
    (r: { alumnoId?: unknown; mensaje?: unknown }) =>
      !Number.isInteger(r?.alumnoId) ||
      typeof r?.mensaje !== "string" ||
      r.mensaje.trim().length === 0 ||
      r.mensaje.length > MAX_LARGO_MENSAJE
  );

  if (invalido) {
    return res.status(400).json({
      success: false,
      message: `Cada recordatorio necesita un mensaje de hasta ${MAX_LARGO_MENSAJE} caracteres.`,
    });
  }

  // Se recalcula en el servidor: solo se recuerda lo que hoy se debe y está
  // en el alcance de quien envía. Nunca se confía en los ids que llegan.
  const adeudos = new Map((await adeudosDe(req.user!)).map((a) => [a.alumnoId, a]));
  const enlace = enlaceDePago();

  let enviados = 0;
  let sinAdeudo = 0;
  let sinDestinatario = 0;

  for (const { alumnoId, mensaje } of recordatorios as { alumnoId: number; mensaje: string }[]) {
    const adeudo = adeudos.get(alumnoId);

    if (!adeudo) {
      sinAdeudo++;
      continue;
    }

    const avisados = await notifyPaymentReminder(
      alumnoId,
      `${mensaje.trim()}\n\nPuedes pagar con PayPal, en efectivo o por transferencia aquí: ${enlace}`
    );

    if (avisados === 0) {
      sinDestinatario++;
      continue;
    }

    await prisma.paymentReminder.createMany({
      data: adeudo.pagos.map((p) => ({ paymentId: p.pagoId })),
    });

    enviados++;
  }

  return res.json({ success: true, enviados, sinAdeudo, sinDestinatario });
});

/** POST /sensei/cobranza/reporte  { dias } — cifras reales y su resumen. */
router.post(
  "/cobranza/reporte",
  soloPara(esPersonal),
  disponible,
  limiteCobranza,
  async (req, res) => {
    const dias = req.body?.dias === undefined ? 30 : Number(req.body.dias);

    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      return res.status(400).json({ success: false, message: "Elige un periodo de 1 a 365 días." });
    }

    const filtro = scopeToStudentIdFilter(await visibleStudentIds(req.user!));
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - dias * DIA_MS);

    const recordatorios = await prisma.paymentReminder.findMany({
      where: { sentAt: { gte: desde }, ...(filtro ? { payment: filtro } : {}) },
      orderBy: { sentAt: "asc" },
      include: INCLUIR_PAGO_RECORDADO,
    });

    const datos = resumirRecuperacion(recordatorios, desde, ahora, dias);

    try {
      return res.json({ success: true, resumen: await redactarReporte(datos), datos });
    } catch (error) {
      return fallo(res, "reporte", error);
    }
  }
);

// ---------------------------------------------------------------------------
// Revisión del grupo (admin y profesores)
// ---------------------------------------------------------------------------

/**
 * POST /sensei/grupo
 *
 * Candidatos a examen de cinta y alumnos en riesgo de dejar el dojo, con un
 * mensaje sugerido para su familia. Sensei propone; el profesor decide.
 */
router.post("/grupo", soloPara(esPersonal), disponible, limiteGrupo, async (req, res) => {
  await marcarMensualidadesVencidas();

  const ahora = Date.now();
  const hace60 = new Date(ahora - 60 * DIA_MS);
  const scope = await visibleStudentIds(req.user!);

  const alumnos = await prisma.student.findMany({
    where: { ...scopeToStudentFilter(scope), active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: MAX_ALUMNOS_REVISION,
    include: {
      promotions: { orderBy: { promotedAt: "desc" }, take: 1 },
      attendance: { where: { date: { gte: hace60 } }, orderBy: { date: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: { where: { status: { in: [PaymentStatus.PENDIENTE, PaymentStatus.VENCIDO] } } },
    },
  });

  if (alumnos.length === 0) {
    return res.json({ success: true, resumen: null, examen: [], riesgo: [], revisados: 0 });
  }

  const datos = alumnos.map((s) => {
    const desde = s.promotions[0]?.promotedAt ?? s.enrolledAt;
    const presentes = s.attendance.filter((a) => a.present);

    return {
      alumnoId: s.id,
      nombre: s.firstName,
      cinta: beltLabel(s.currentBelt),
      mesesEnSuCinta: Math.floor((ahora - desde.getTime()) / (30 * DIA_MS)),
      asistencia60Dias: { clasesRegistradas: s.attendance.length, asistio: presentes.length },
      diasDesdeSuUltimaClase: presentes[0]
        ? Math.floor((ahora - presentes[0].date.getTime()) / DIA_MS)
        : null,
      mesesQueDebe: s.payments.length,
      ultimaObservacion: s.notes[0]?.body.slice(0, 200) ?? null,
    };
  });

  let respuesta: unknown;

  try {
    respuesta = await revisarGrupo({ alumnos: datos });
  } catch (error) {
    return fallo(res, "revision del grupo", error);
  }

  // Solo alumnos que existen en lo que se le pasó, y que no sean cinta negra
  // en la lista de examen.
  const porId = new Map(alumnos.map((s) => [s.id, s]));
  const r = (respuesta ?? {}) as Record<string, unknown>;

  const lista = (valor: unknown) => (Array.isArray(valor) ? valor.slice(0, 6) : []);
  const vistos = new Set<number>();

  const examen = lista(r.examen).flatMap((e: Record<string, unknown>) => {
    const s = porId.get(Number(e?.alumnoId));
    if (!s || s.currentBelt === Belt.NEGRO || vistos.has(s.id)) return [];
    vistos.add(s.id);
    return [{ alumnoId: s.id, alumno: `${s.firstName} ${s.lastName}`, cinta: beltLabel(s.currentBelt), razon: texto(e.razon, 240) }];
  });

  // Quien está listo para examen no puede estar a la vez en riesgo.
  const enExamen = new Set(vistos);
  vistos.clear();

  const riesgo = lista(r.riesgo).flatMap((e: Record<string, unknown>) => {
    const s = porId.get(Number(e?.alumnoId));
    if (!s || vistos.has(s.id) || enExamen.has(s.id)) return [];
    vistos.add(s.id);
    return [{ alumnoId: s.id, alumno: `${s.firstName} ${s.lastName}`, razon: texto(e.razon, 240), mensaje: texto(e.mensaje, 600) }];
  });

  return res.json({
    success: true,
    resumen: texto(r.resumen, 400) || null,
    examen,
    riesgo,
    revisados: alumnos.length,
  });
});

// ---------------------------------------------------------------------------
// Avisos (admin y profesores)
// ---------------------------------------------------------------------------

/** POST /sensei/aviso  { idea } — título y mensaje sugeridos para un aviso. */
router.post("/aviso", soloPara(esPersonal), disponible, limiteAviso, async (req, res) => {
  const idea = texto(req.body?.idea, 600);

  if (idea.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Escribe en el mensaje la idea del aviso y Sensei la redacta.",
    });
  }

  try {
    const r = ((await redactarAviso(idea)) ?? {}) as Record<string, unknown>;
    const titulo = texto(r.titulo, 120);
    const mensaje = texto(r.mensaje, 1500);

    if (!titulo || !mensaje) throw new Error("Respuesta sin título o mensaje.");

    return res.json({ success: true, titulo, mensaje });
  } catch (error) {
    return fallo(res, "aviso", error);
  }
});

// ---------------------------------------------------------------------------
// Asesor de equipo (tutores y alumnos)
// ---------------------------------------------------------------------------

/**
 * POST /sensei/equipo  { studentId, necesidad }
 *
 * Recomienda productos del catálogo real. No crea la solicitud: la familia
 * la revisa en Uniformes y protecciones antes de enviarla.
 */
router.post("/equipo", soloPara(esFamilia), disponible, limiteFamilia, async (req, res) => {
  const propios = await familyStudentIds(req.user!);
  const studentId = req.body?.studentId === undefined ? propios[0] : Number(req.body.studentId);
  const necesidad = texto(req.body?.necesidad, 400);

  if (!propios.includes(studentId)) {
    return res.status(403).json({ success: false, message: "Ese alumno no está a tu cargo." });
  }

  if (necesidad.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Cuéntale a Sensei para qué necesitas el equipo.",
    });
  }

  const [alumno, productos] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { birthDate: true, currentBelt: true },
    }),
    prisma.equipmentProduct.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        models: {
          where: { active: true, brand: { active: true } },
          orderBy: { priceCents: "asc" },
          include: { brand: true },
        },
      },
    }),
  ]);

  if (!alumno) {
    return res.status(404).json({ success: false, message: "No existe ese alumno." });
  }

  if (productos.length === 0) {
    return res.status(409).json({
      success: false,
      message: "El dojo todavía no tiene catálogo de equipo.",
    });
  }

  const edad = edadEn(alumno.birthDate);
  const tipoDeCinta = alumno.currentBelt === Belt.NEGRO ? BeltClass.NEGRA : BeltClass.COLOR;
  const categoria = edad === null ? undefined : categoriaSugerida(edad, tipoDeCinta);

  // Sin nombre ni datos de contacto: para recomendar basta la edad y la cinta.
  const datos = {
    alumno: {
      edad,
      cinta: beltLabel(alumno.currentBelt),
      categoriaDeCompetencia: categoria ? infoDeCategoria(categoria)?.label ?? null : null,
    },
    necesidad,
    catalogo: productos.map((p) => ({
      productId: p.id,
      producto: p.name,
      tipo: p.category,
      tallas: p.sizes,
      colores: p.colors,
      modelos: p.models.map((m) => ({
        modelId: m.id,
        marca: m.brand.name,
        modelo: m.name,
        precio: aPesos(m.priceCents),
        esEjemplo: m.isExample,
      })),
    })),
  };

  let respuesta: unknown;

  try {
    respuesta = await recomendarEquipo(datos);
  } catch (error) {
    return fallo(res, "asesor de equipo", error);
  }

  const r = (respuesta ?? {}) as Record<string, unknown>;
  const productoPorId = new Map(productos.map((p) => [p.id, p]));
  const vistos = new Set<number>();

  // Cada recomendación se valida contra el catálogo: producto, modelo de ese
  // producto, talla y color existentes. Lo que no cuadra se descarta.
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((i: Record<string, unknown>) => {
    const producto = productoPorId.get(Number(i?.productId));
    if (!producto || vistos.has(producto.id)) return [];

    const modelo = producto.models.find((m) => m.id === Number(i.modelId));
    if (!modelo) return [];

    vistos.add(producto.id);

    const talla = typeof i.talla === "string" && producto.sizes.includes(i.talla) ? i.talla : null;
    const color =
      producto.colors.length === 0
        ? null
        : i.color === "AMBOS" && producto.colors.length > 1
          ? "AMBOS"
          : typeof i.color === "string" && producto.colors.includes(i.color)
            ? i.color
            : null;

    const juegos = color === "AMBOS" ? 2 : 1;

    return [
      {
        productId: producto.id,
        producto: producto.name,
        modelId: modelo.id,
        marca: modelo.brand.name,
        modelo: modelo.name,
        precioCents: modelo.priceCents * juegos,
        esEjemplo: modelo.isExample,
        talla,
        color,
        razon: texto(i.razon, 240),
      },
    ];
  });

  return res.json({
    success: true,
    studentId,
    resumen: texto(r.resumen, 600) || null,
    items,
    totalCents: items.reduce((t, i) => t + i.precioCents, 0),
  });
});

// ---------------------------------------------------------------------------
// Resumen del alumno (los cuatro roles, con el alcance de cada uno)
// ---------------------------------------------------------------------------

/** POST /sensei/resumen  { studentId } — el mes del alumno, en pocas líneas. */
router.post("/resumen", disponible, limiteFamilia, async (req, res) => {
  const user = req.user!;
  const studentId = Number(req.body?.studentId);

  if (!Number.isInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, message: "Elige un alumno." });
  }

  if (!(esPersonal(user) || esFamilia(user)) || !(await canViewStudent(user, studentId))) {
    return res.status(403).json({ success: false, message: "No puedes ver a ese alumno." });
  }

  await marcarMensualidadesVencidas();

  const hace30 = new Date(Date.now() - 30 * DIA_MS);
  const hoy = new Date(`${hoyEnElDojo()}T00:00:00Z`);

  const [s, eventos, inscripciones, equipo] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        promotions: { orderBy: { promotedAt: "desc" }, take: 1 },
        attendance: { where: { date: { gte: hace30 } } },
        notes: { orderBy: { createdAt: "desc" }, take: 3 },
        payments: { where: { status: { not: PaymentStatus.PAGADO } } },
      },
    }),
    prisma.event.findMany({
      where: { date: { gte: hoy } },
      orderBy: { date: "asc" },
      take: 3,
      select: { title: true, date: true },
    }),
    prisma.eventEnrollment.findMany({
      where: { studentId, status: EventPaymentStatus.PENDIENTE_PAGO },
      include: { event: { select: { title: true } } },
    }),
    prisma.equipmentRequest.findMany({
      where: { studentId, status: EquipmentRequestStatus.CONFIRMADO },
      select: { amountCents: true },
    }),
  ]);

  if (!s) {
    return res.status(404).json({ success: false, message: "No existe ese alumno." });
  }

  const datos = {
    paraQuien: esPersonal(user) ? "PROFESOR" : "FAMILIA",
    alumno: s.firstName,
    cintaActual: beltLabel(s.currentBelt),
    ultimaGraduacion: s.promotions[0]
      ? { cinta: beltLabel(s.promotions[0].belt), fecha: s.promotions[0].promotedAt.toISOString().slice(0, 10) }
      : null,
    asistenciaUltimos30Dias: {
      clasesRegistradas: s.attendance.length,
      asistio: s.attendance.filter((a) => a.present).length,
    },
    observacionesDelProfesor: s.notes.map((n) => ({
      fecha: n.createdAt.toISOString().slice(0, 10),
      texto: n.body.slice(0, 300),
    })),
    pendienteDePago: [
      ...s.payments.map((p) => ({
        concepto: `Mensualidad ${p.periodYear}-${String(p.periodMonth).padStart(2, "0")}`,
        monto: aPesos(p.amountCents),
        yaReportado: p.reportedAt !== null,
      })),
      ...inscripciones.map((i) => ({ concepto: i.event.title, monto: aPesos(i.amountCents), yaReportado: false })),
      ...equipo.flatMap((q) =>
        q.amountCents === null
          ? []
          : [{ concepto: "Uniformes y protecciones", monto: aPesos(q.amountCents), yaReportado: false }]
      ),
    ],
    proximosEventos: eventos.map((e) => ({ titulo: e.title, fecha: e.date.toISOString().slice(0, 10) })),
  };

  try {
    return res.json({ success: true, resumen: await resumirAlumno(datos) });
  } catch (error) {
    return fallo(res, "resumen", error);
  }
});

export default router;
