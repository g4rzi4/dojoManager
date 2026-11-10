import { Router } from "express";

import { prismaGlobal } from "../lib/prisma";
import { PaymentStatus } from "../generated/prisma/enums";

/**
 * Fase 2 del agente de cobranza: registrar los recordatorios que envió Zapier
 * y medir cuánto se recuperó después.
 *
 * Se monta dentro de agent.routes.ts, así que hereda su API key. Usa
 * `prismaGlobal` porque el agente es una integración de servidor a servidor,
 * sin sesión de usuario, y por lo tanto sin dojo en el contexto.
 */
const router = Router();

const ZONA_DEL_DOJO = "America/Mexico_City";

/** Máximo de pagoIds por petición, para que nadie mande una lista sin fin. */
const MAX_PAGO_IDS = 500;

/** Ventana por omisión de recovery-stats, en días. */
const DIAS_POR_OMISION = 30;

/** "2026-11-09T20:30:00-06:00", el mismo formato que usa /unpaid. */
function fechaDelDojo(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_DEL_DOJO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(fecha);

  const get = (type: string) => partes.find((p) => p.type === type)?.value ?? "00";
  // Intl puede devolver "24" a medianoche con hour12: false.
  const hora = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hora}:${get("minute")}:${get("second")}-06:00`;
}

/** El día del dojo (AAAA-MM-DD) de un instante. */
function diaDelDojo(fecha: Date): string {
  return fechaDelDojo(fecha).slice(0, 10);
}

/** Días completos entre dos fechas AAAA-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const aPesos = (centavos: number) => Math.round(centavos / 100);

/**
 * POST /api/agent/record-reminders
 *
 * Zapier avisa a qué cobros les mandó recordatorio. Recibe:
 *
 *   { "pagoIds": [201, 215] }
 *
 * y responde:
 *
 *   {
 *     "fechaEnvio": "2026-11-05T09:02:11-06:00",
 *     "registrados": [201, 215],
 *     "yaPagados": [],
 *     "noEncontrados": []
 *   }
 *
 * Un id que no existe o un cobro ya pagado no hace fallar a los demás: Zapier
 * manda la lista completa de una vez y conviene registrar lo que sí aplica.
 */
router.post("/record-reminders", async (req, res) => {
  const { pagoIds } = req.body ?? {};

  if (!Array.isArray(pagoIds) || pagoIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "pagoIds debe ser una lista con al menos un id. Ejemplo: { \"pagoIds\": [201] }",
    });
  }

  if (pagoIds.length > MAX_PAGO_IDS) {
    return res.status(400).json({
      success: false,
      message: `pagoIds admite hasta ${MAX_PAGO_IDS} ids por petición.`,
    });
  }

  const invalidos = pagoIds.filter((id) => !Number.isInteger(id) || id <= 0);

  if (invalidos.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Cada pagoId debe ser un número entero positivo.",
      invalidos,
    });
  }

  // El mismo id dos veces en la lista cuenta como un solo recordatorio.
  const ids = [...new Set(pagoIds as number[])];

  const pagos = await prismaGlobal.payment.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });

  const encontrados = new Map(pagos.map((p) => [p.id, p.status]));
  const noEncontrados = ids.filter((id) => !encontrados.has(id));
  const yaPagados = ids.filter((id) => encontrados.get(id) === PaymentStatus.PAGADO);
  const registrados = ids.filter(
    (id) => encontrados.has(id) && encontrados.get(id) !== PaymentStatus.PAGADO
  );

  const fechaEnvio = new Date();

  if (registrados.length > 0) {
    await prismaGlobal.paymentReminder.createMany({
      data: registrados.map((paymentId) => ({ paymentId, sentAt: fechaEnvio })),
    });
  }

  return res.json({
    fechaEnvio: fechaDelDojo(fechaEnvio),
    registrados,
    yaPagados,
    noEncontrados,
  });
});

type EstadoRecuperacion = "RECUPERADO" | "REPORTADO" | "PENDIENTE" | "PAGADO_ANTES";

/**
 * GET /api/agent/recovery-stats?dias=30
 *
 * Cuánto se recuperó de los cobros recordados en los últimos `dias` días
 * (1 a 365, 30 por omisión). Un cobro cuenta como RECUPERADO si se pagó el
 * mismo día del primer recordatorio o después.
 *
 * Estados de cada cobro:
 *   - RECUPERADO:   pagado después del recordatorio.
 *   - REPORTADO:    la familia dice que pagó y falta que el dojo lo confirme.
 *   - PENDIENTE:    sigue sin pagarse.
 *   - PAGADO_ANTES: ya estaba pagado cuando salió el recordatorio. No cuenta
 *                   para la tasa, porque el recordatorio no influyó.
 *
 * Los montos van en pesos enteros, igual que en /unpaid.
 */
router.get("/recovery-stats", async (req, res) => {
  const diasTexto = req.query.dias;
  const dias = diasTexto === undefined ? DIAS_POR_OMISION : Number(diasTexto);

  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return res.status(400).json({
      success: false,
      message: "dias debe ser un entero entre 1 y 365.",
    });
  }

  const ahora = new Date();
  const desde = new Date(ahora.getTime() - dias * 86_400_000);

  const recordatorios = await prismaGlobal.paymentReminder.findMany({
    where: { sentAt: { gte: desde } },
    orderBy: { sentAt: "asc" },
    include: {
      payment: {
        include: {
          student: {
            include: {
              guardians: {
                include: { guardian: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  // Un cobro puede tener varios recordatorios: se agrupan y vale el primero.
  const porPago = new Map<number, { primero: Date; veces: number; pago: (typeof recordatorios)[number]["payment"] }>();

  for (const r of recordatorios) {
    const actual = porPago.get(r.paymentId);
    if (actual) {
      actual.veces += 1;
    } else {
      porPago.set(r.paymentId, { primero: r.sentAt, veces: 1, pago: r.payment });
    }
  }

  const pagos = [...porPago.values()].map(({ primero, veces, pago }) => {
    const s = pago.student;
    const tutorPrincipal = s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];
    const diaRecordatorio = diaDelDojo(primero);
    // paidAt guarda el instante real del pago: se lee en la hora del dojo,
    // igual que el recordatorio, para que un pago a las 9 de la noche no
    // cuente como del día siguiente.
    const diaPago = pago.paidAt ? diaDelDojo(pago.paidAt) : null;

    let estado: EstadoRecuperacion;
    if (pago.status === PaymentStatus.PAGADO) {
      estado = diaPago && diaPago >= diaRecordatorio ? "RECUPERADO" : "PAGADO_ANTES";
    } else if (pago.reportedAt) {
      estado = "REPORTADO";
    } else {
      estado = "PENDIENTE";
    }

    return {
      pagoId: pago.id,
      alumnoId: s.id,
      alumno: `${s.firstName} ${s.lastName}`,
      tutor: tutorPrincipal?.guardian.name ?? s.guardianName ?? null,
      mes: `${pago.periodYear}-${String(pago.periodMonth).padStart(2, "0")}`,
      monto: aPesos(pago.amountCents),
      recordatorios: veces,
      primerRecordatorio: fechaDelDojo(primero),
      estado,
      pagadoEl: estado === "RECUPERADO" ? diaPago : null,
      metodo: estado === "RECUPERADO" ? pago.method : null,
      diasParaPagar:
        estado === "RECUPERADO" && diaPago ? diasEntre(diaRecordatorio, diaPago) : null,
    };
  });

  const contar = (estado: EstadoRecuperacion) => pagos.filter((p) => p.estado === estado);
  const sumar = (lista: typeof pagos) => lista.reduce((t, p) => t + p.monto, 0);

  const recuperados = contar("RECUPERADO");
  const reportados = contar("REPORTADO");
  const pendientes = contar("PENDIENTE");
  const pagadosAntes = contar("PAGADO_ANTES");

  // La tasa se mide sobre lo que de verdad se debía al recordar.
  const base = pagos.length - pagadosAntes.length;
  const tasaRecuperacion = base > 0 ? Math.round((recuperados.length / base) * 100) : 0;

  const diasDePago = recuperados
    .map((p) => p.diasParaPagar)
    .filter((d): d is number => d !== null);
  const diasPromedioParaPagar =
    diasDePago.length > 0
      ? Math.round((diasDePago.reduce((t, d) => t + d, 0) / diasDePago.length) * 10) / 10
      : null;

  const recuperadoPorMetodo = {
    PAYPAL: sumar(recuperados.filter((p) => p.metodo === "PAYPAL")),
    EFECTIVO: sumar(recuperados.filter((p) => p.metodo === "EFECTIVO")),
    TRANSFERENCIA: sumar(recuperados.filter((p) => p.metodo === "TRANSFERENCIA")),
  };

  return res.json({
    fechaConsulta: fechaDelDojo(ahora),
    periodo: { desde: diaDelDojo(desde), hasta: diaDelDojo(ahora), dias },
    recordatoriosEnviados: recordatorios.length,
    pagosRecordados: pagos.length,
    pagosRecuperados: recuperados.length,
    pagosReportados: reportados.length,
    pagosPendientes: pendientes.length,
    pagosPagadosAntes: pagadosAntes.length,
    tasaRecuperacion,
    montoRecordado: sumar(pagos) - sumar(pagadosAntes),
    montoRecuperado: sumar(recuperados),
    montoPendiente: sumar(reportados) + sumar(pendientes),
    diasPromedioParaPagar,
    recuperadoPorMetodo,
    pagos,
  });
});

export default router;
