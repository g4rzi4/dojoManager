import { Router, type Request } from "express";

import { config } from "../config";
import { familyStudentIds } from "../lib/access";
import {
  notifyEquipmentPaidOnline,
  notifyEquipmentUpdated,
  notifyEventPaidOnline,
} from "../lib/notifications";
import {
  captureOrder,
  createOrder,
  paypalConfigured,
  payPalValueToCents,
  PayPalError,
  verifyWebhook,
  type CapturedOrder,
} from "../lib/paypal";
import { conDojo } from "../lib/dojoContext";
import { prisma, prismaGlobal } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  EquipmentRequestStatus,
  EventPaymentStatus,
  PaymentMethod,
  PaymentStatus,
} from "../generated/prisma/enums";

const router = Router();

/** Busca el cobro al que pertenece una orden. */
/** El webhook no lleva sesión: el dojo sale del cobro que pagaron. */
async function dojoDeOrden(orderId: string): Promise<number | null> {
  const where = { externalReference: orderId };
  const select = { student: { select: { dojoId: true } } };

  const cobro =
    (await prismaGlobal.payment.findUnique({ where, select })) ??
    (await prismaGlobal.eventEnrollment.findUnique({ where, select })) ??
    (await prismaGlobal.equipmentRequest.findUnique({ where, select }));

  return cobro?.student.dojoId ?? null;
}

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

  if (enrollment) return { tipo: "EVENTO" as const, ...enrollment };

  const equipo = await prisma.equipmentRequest.findUnique({
    where: { externalReference: orderId },
    select: {
      id: true,
      studentId: true,
      amountCents: true,
      status: true,
      teacherId: true,
    },
  });

  return equipo && equipo.amountCents !== null
    ? { tipo: "EQUIPO" as const, ...equipo, amountCents: equipo.amountCents }
    : null;
}

type Cobro = NonNullable<Awaited<ReturnType<typeof cobroDeOrden>>>;

function yaLiquidado(cobro: Cobro): boolean {
  if (cobro.tipo === "EQUIPO") {
    return (
      cobro.status === EquipmentRequestStatus.PAGADO ||
      cobro.status === EquipmentRequestStatus.ENTREGADO
    );
  }

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

  if (cobro.tipo === "EQUIPO") {
    const { count } = await prisma.equipmentRequest.updateMany({
      // También si se había reportado: el dinero ya se capturó en PayPal.
      where: {
        id: cobro.id,
        status: {
          in: [
            EquipmentRequestStatus.CONFIRMADO,
            EquipmentRequestStatus.REPORTADO,
          ],
        },
      },
      data: {
        status: EquipmentRequestStatus.PAGADO,
        method: PaymentMethod.PAYPAL,
        paidAt: new Date(),
      },
    });

    if (count === 1) {
      try {
        await notifyEquipmentUpdated(
          cobro.id,
          cobro.studentId,
          "PAGADO",
          cobro.amountCents
        );
        await notifyEquipmentPaidOnline(
          cobro.id,
          cobro.teacherId,
          cobro.amountCents
        );
      } catch (error) {
        console.error("[paypal] no se pudo notificar el pago de equipo", error);
      }
    }

    return true;
  }

  const { count } = await prisma.eventEnrollment.updateMany({
    where: {
      id: cobro.id,
      status: {
        in: [EventPaymentStatus.PENDIENTE_PAGO, EventPaymentStatus.REPORTADO],
      },
    },
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
 * POST /paypal/orders  { tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO", id }
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
    !["MENSUALIDAD", "EVENTO", "EQUIPO"].includes(tipo) ||
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

    if (payment.reportedAt) {
      return res.status(409).json({
        success: false,
        message: "Ya reportaste ese pago. Espera a que lo confirmen.",
      });
    }

    amountCents = payment.amountCents;
    description = `Mensualidad ${payment.periodMonth}/${payment.periodYear}`;
  } else if (tipo === "EQUIPO") {
    const solicitud = await prisma.equipmentRequest.findUnique({
      where: { id: cobroId },
    });

    if (!solicitud || !propios.includes(solicitud.studentId)) {
      return res.status(404).json(noEncontrado);
    }

    if (
      solicitud.status !== EquipmentRequestStatus.CONFIRMADO ||
      solicitud.amountCents === null
    ) {
      return res.status(409).json({
        success: false,
        message: "Esa solicitud no está lista para pagarse.",
      });
    }

    amountCents = solicitud.amountCents;
    description = "Uniformes y protecciones";
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
  } else if (tipo === "EQUIPO") {
    await prisma.equipmentRequest.update({
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
    const dojoId = orderId ? await dojoDeOrden(orderId) : null;

    if (dojoId !== null) {
      await conDojo(dojoId, async () => {
        const cobro = await cobroDeOrden(orderId);

        if (cobro && !yaLiquidado(cobro)) {
          await liquidar(cobro, {
            status: recurso.status,
            amountCents: payPalValueToCents(recurso.amount.value),
            currency: recurso.amount.currency_code,
          });
        }
      });
    }
  }

  return res.sendStatus(200);
});

export default router;
