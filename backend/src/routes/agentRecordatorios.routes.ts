import { Router } from "express";

import { prismaGlobal } from "../lib/prisma";
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
 * Se monta dentro de agent.routes.ts, así que hereda su API key. Usa
 * `prismaGlobal` porque el agente es una integración de servidor a servidor,
 * sin sesión de usuario, y por lo tanto sin dojo en el contexto.
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

  const recordatorios = await prismaGlobal.paymentReminder.findMany({
    where: { sentAt: { gte: desde } },
    orderBy: { sentAt: "asc" },
    include: INCLUIR_PAGO_RECORDADO,
  });

  return res.json(resumirRecuperacion(recordatorios, desde, ahora, dias));
});

export default router;
