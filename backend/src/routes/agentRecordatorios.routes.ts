import { Router } from "express";

import { prisma } from "../lib/prisma";
import { dojoDeLaPeticion, mesLegible } from "../lib/agentDojo";
import {
  fechaDelDojo,
  INCLUIR_PAGO_RECORDADO,
  resumirRecuperacion,
} from "../lib/recuperacion";
import { PaymentStatus } from "../generated/prisma/enums";

/**
 * Fase 2 del agente de cobranza: registrar los recordatorios que envió Zapier
 * y medir cuánto se recuperó después.
 *
 * Se monta dentro de agent.routes.ts, así que hereda su API key y su dojo
 * (resolverDojoDelAgente). Usa `prisma`, que filtra por ese dojo: un pagoId de
 * otro dojo cuenta como no encontrado.
 */
const router = Router();

/** Máximo de pagoIds por petición, para que nadie mande una lista sin fin. */
const MAX_PAGO_IDS = 500;

/** Ventana por omisión de recovery-stats, en días. */
const DIAS_POR_OMISION = 30;

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
  // Zapier manda más fácil un texto "201,215" que una lista JSON: se aceptan
  // los dos. Un texto con algo que no sea número cae en la validación de abajo.
  const recibido = req.body?.pagoIds;
  const pagoIds: unknown =
    typeof recibido === "string"
      ? recibido
          .split(/[\s,]+/)
          .filter((t) => t.length > 0)
          .map(Number)
      : recibido;

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

  const pagos = await prisma.payment.findMany({
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
    await prisma.paymentReminder.createMany({
      data: registrados.map((paymentId) => ({ paymentId, sentAt: fechaEnvio })),
    });
  }

  return res.json({
    fechaEnvio: fechaDelDojo(fechaEnvio),
    dojo: await dojoDeLaPeticion(),
    registrados,
    yaPagados,
    noEncontrados,
  });
});

/**
 * GET /api/agent/recovery-stats?dias=30
 *
 * Cuánto se recuperó de los cobros recordados en los últimos `dias` días
 * (1 a 365, 30 por omisión). Un cobro cuenta como RECUPERADO si se pagó el
 * mismo día del primer recordatorio o después.
 *
 * El cálculo y los estados de cada cobro están en lib/recuperacion.ts, que
 * comparte con el asistente de cobranza de la app.
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

  const recordatorios = await prisma.paymentReminder.findMany({
    where: { sentAt: { gte: desde } },
    orderBy: { sentAt: "asc" },
    include: INCLUIR_PAGO_RECORDADO,
  });

  const resumen = resumirRecuperacion(recordatorios, desde, ahora, dias);

  return res.json({
    ...resumen,
    dojo: await dojoDeLaPeticion(),
    // El mismo resumen en texto, para pasarlo tal cual al prompt de Claude
    // desde Zapier, que no recorre bien la lista `pagos`.
    resumenTexto: resumenEnTexto(resumen),
  });
});

/** El resumen de recuperación redactado en líneas, para un prompt. */
function resumenEnTexto(r: ReturnType<typeof resumirRecuperacion>): string {
  const porMetodo = r.recuperadoPorMetodo;

  return [
    `Periodo: ${r.periodo.desde} a ${r.periodo.hasta} (${r.periodo.dias} días).`,
    `Recordatorios enviados: ${r.recordatoriosEnviados}. Cobros recordados: ${r.pagosRecordados}.`,
    `Recuperados: ${r.pagosRecuperados}. Reportados por confirmar: ${r.pagosReportados}. Pendientes: ${r.pagosPendientes}. Ya estaban pagados: ${r.pagosPagadosAntes}.`,
    `Tasa de recuperación: ${r.tasaRecuperacion}%.`,
    `Monto recordado: $${r.montoRecordado}. Recuperado: $${r.montoRecuperado}. Pendiente: $${r.montoPendiente}.`,
    `Días promedio para pagar: ${r.diasPromedioParaPagar ?? "sin datos"}.`,
    `Recuperado por método: PayPal $${porMetodo.PAYPAL}, efectivo $${porMetodo.EFECTIVO}, transferencia $${porMetodo.TRANSFERENCIA}.`,
    ...r.pagos.map(
      (p) =>
        `- ${p.alumno} (${mesLegible(p.mes)}, $${p.monto}): ${p.estado}${p.diasParaPagar !== null ? ` en ${p.diasParaPagar} días` : ""}${p.metodo ? ` por ${p.metodo}` : ""}.`
    ),
  ].join("\n");
}

export default router;
