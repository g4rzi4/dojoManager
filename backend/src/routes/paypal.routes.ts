import { Router, type Request } from "express";

import { config } from "../config";
import { familyStudentIds } from "../lib/access";
import { notifyEventPaidOnline } from "../lib/notifications";
import {
  captureOrder,
  createOrder,
  paypalConfigured,
  payPalValueToCents,
  PayPalError,
  verifyWebhook,
  type CapturedOrder,
} from "../lib/paypal";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  EventPaymentStatus,
  PaymentMethod,
  PaymentStatus,
} from "../generated/prisma/enums";

const router = Router();

/** Busca el cobro al que pertenece una orden. */
async function cobroDeOrden(orderId: string) {
  const payment = await prisma.payment.findUnique({
    where: { externalReference: orderId },
    select: { id: true, studentId: true, amountCents: true, status: true },
  });

  if (payment) return { tipo: "MENSUALIDAD" as const, ...payment };

  const enrollment = await prisma.eventEnrollment.findUnique({
    where: { externalReference: orderId },
    select: {
      id: true,
      studentId: true,
      amountCents: true,
      status: true,
      creditedToId: true,
      event: { select: { title: true } },
      modalities: { select: { modality: { select: { name: true } } } },
    },
  });

  return enrollment ? { tipo: "EVENTO" as const, ...enrollment } : null;
}

type Cobro = NonNullable<Awaited<ReturnType<typeof cobroDeOrden>>>;

function yaLiquidado(cobro: Cobro): boolean {
  return cobro.tipo === "MENSUALIDAD"
    ? cobro.status === PaymentStatus.PAGADO
    : cobro.status === EventPaymentStatus.CONFIRMADO;
}

/**
 * Marca un cobro como pagado, tras comprobar que PayPal capturó justo lo que
 * se debía. La usan el botón y el webhook, que pueden llegar en cualquier
 * orden: el updateMany condicionado hace que solo uno aplique el cambio.
 */
async function liquidar(cobro: Cobro, capturado: CapturedOrder): Promise<boolean> {
  if (
    capturado.status !== "COMPLETED" ||
    capturado.amountCents !== cobro.amountCents ||
    capturado.currency !== config.paypal.currency
  ) {
    console.error("[paypal] la captura no coincide con el cobro", {
      tipo: cobro.tipo,
      id: cobro.id,
      status: capturado.status,
      amountCents: capturado.amountCents,
      esperado: cobro.amountCents,
    });

    return false;
  }

  if (cobro.tipo === "MENSUALIDAD") {
    await prisma.payment.updateMany({
      where: { id: cobro.id, status: { not: PaymentStatus.PAGADO } },
      data: {
        status: PaymentStatus.PAGADO,
        paidAt: new Date(),
        method: PaymentMethod.PAYPAL,
      },
    });

    return true;
  }

  const { count } = await prisma.eventEnrollment.updateMany({
    where: { id: cobro.id, status: EventPaymentStatus.PENDIENTE_PAGO },
    data: {
      status: EventPaymentStatus.CONFIRMADO,
      enrolled: true,
      method: PaymentMethod.PAYPAL,
      confirmedAt: new Date(),
    },
  });

  if (count === 1) {
    try {
      await notifyEventPaidOnline(
        cobro.id,
        cobro.studentId,
        cobro.creditedToId,
        cobro.event.title,
        cobro.modalities.map((m) => m.modality.name),
        cobro.amountCents
      );
    } catch (error) {
      console.error("[paypal] no se pudo notificar el pago", error);
    }
  }

  return true;
}

/** GET /paypal/config — lo que necesita el botón. El clientId es público. */
router.get("/config", requireAuth, (_req, res) => {
  return res.json({
    success: true,
    enabled: paypalConfigured(),
    clientId: paypalConfigured() ? config.paypal.clientId : null,
    currency: config.paypal.currency,
  });
});

/**
 * POST /paypal/orders  { tipo: "MENSUALIDAD" | "EVENTO", id }
 *
 * El cliente solo dice QUÉ cobro quiere pagar. El monto sale siempre de la
 * base de datos, y el cobro tiene que ser de un alumno de su familia.
 */
router.post("/orders", requireAuth, async (req, res) => {
  if (!paypalConfigured()) {
    return res.status(503).json({
      success: false,
      message: "El pago en línea no está disponible.",
    });
  }

  const { tipo, id } = req.body ?? {};
  const cobroId = Number(id);

  if (
    (tipo !== "MENSUALIDAD" && tipo !== "EVENTO") ||
    !Number.isInteger(cobroId) ||
    cobroId < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "El cobro indicado no es válido.",
    });
  }

  const propios = await familyStudentIds(req.user!);
  const noEncontrado = {
    success: false,
    message: "No encontramos ese cobro en tu cuenta.",
  };

  let amountCents: number;
  let description: string;

  if (tipo === "MENSUALIDAD") {
    const payment = await prisma.payment.findUnique({ where: { id: cobroId } });

    if (!payment || !propios.includes(payment.studentId)) {
      return res.status(404).json(noEncontrado);
    }

    if (payment.status === PaymentStatus.PAGADO) {
      return res.status(409).json({
        success: false,
        message: "Esa mensualidad ya está pagada.",
      });
    }

    amountCents = payment.amountCents;
    description = `Mensualidad ${payment.periodMonth}/${payment.periodYear}`;
  } else {
    const enrollment = await prisma.eventEnrollment.findUnique({
      where: { id: cobroId },
      include: { event: { select: { title: true } } },
    });

    if (!enrollment || !propios.includes(enrollment.studentId)) {
      return res.status(404).json(noEncontrado);
    }

    if (enrollment.status !== EventPaymentStatus.PENDIENTE_PAGO) {
      return res.status(409).json({
        success: false,
        message: "Esa inscripción no tiene un pago pendiente.",
      });
    }

    amountCents = enrollment.amountCents;
    description = `Inscripción: ${enrollment.event.title}`;
  }

  const orderId = await createOrder({
    referenceId: `${tipo}-${cobroId}`,
    description,
    amountCents,
  });

  // Guardar la orden antes de que se apruebe: capturar exige que coincida,
  // así que una orden anterior abandonada ya no puede liquidar este cobro.
  if (tipo === "MENSUALIDAD") {
    await prisma.payment.update({
      where: { id: cobroId },
      data: { externalReference: orderId },
    });
  } else {
    await prisma.eventEnrollment.update({
      where: { id: cobroId },
      data: { externalReference: orderId },
    });
  }

  return res.status(201).json({ success: true, orderId });
});

/** POST /paypal/orders/:orderId/capture — tras aprobar en la ventana de PayPal. */
router.post("/orders/:orderId/capture", requireAuth, async (req, res) => {
  const orderId = String(req.params.orderId);
  const cobro = await cobroDeOrden(orderId);
  const propios = await familyStudentIds(req.user!);

  if (!cobro || !propios.includes(cobro.studentId)) {
    return res.status(404).json({
      success: false,
      message: "No encontramos ese pago en tu cuenta.",
    });
  }

  if (yaLiquidado(cobro)) {
    return res.json({ success: true, message: "Tu pago ya estaba registrado." });
  }

  let capturado: CapturedOrder;

  try {
    capturado = await captureOrder(orderId);
  } catch (error) {
    if (error instanceof PayPalError && error.issue === "INSTRUMENT_DECLINED") {
      return res.status(402).json({
        success: false,
        issue: error.issue,
        message: "PayPal rechazó ese método de pago. Intenta con otro.",
      });
    }

    if (error instanceof PayPalError && error.status === 422) {
      console.error("[paypal] captura rechazada", error.issue);

      return res.status(409).json({
        success: false,
        issue: error.issue,
        message:
          error.issue === "ORDER_ALREADY_CAPTURED"
            ? "Ese pago ya se procesó. Se reflejará en unos momentos."
            : "PayPal no pudo completar el pago. Intenta de nuevo.",
      });
    }

    throw error;
  }

  if (!(await liquidar(cobro, capturado))) {
    return res.status(409).json({
      success: false,
      message:
        capturado.status === "PENDING"
          ? "PayPal está revisando tu pago. Se actualizará cuando lo apruebe."
          : "No pudimos validar tu pago. Comunícate con el dojo.",
    });
  }

  return res.json({ success: true, message: "¡Pago recibido! Gracias." });
});

/**
 * POST /paypal/webhook
 *
 * Respaldo por si la persona cierra la ventana justo después de pagar. No
 * lleva sesión: lo que lo protege es la verificación de la firma con PayPal.
 */
router.post("/webhook", async (req: Request & { rawBody?: Buffer }, res) => {
  if (!paypalConfigured() || !config.paypal.webhookId || !req.rawBody) {
    return res.sendStatus(503);
  }

  if (!(await verifyWebhook(req.headers, req.rawBody.toString("utf8")))) {
    return res.sendStatus(400);
  }

  const evento = req.body;

  if (evento.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const recurso = evento.resource;
    const orderId = recurso?.supplementary_data?.related_ids?.order_id;
    const cobro = orderId ? await cobroDeOrden(orderId) : null;

    if (cobro && !yaLiquidado(cobro)) {
      await liquidar(cobro, {
        status: recurso.status,
        amountCents: payPalValueToCents(recurso.amount.value),
        currency: recurso.amount.currency_code,
      });
    }
  }

  return res.sendStatus(200);
});

export default router;
