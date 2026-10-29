import { Router, type Response } from "express";

import { prisma } from "../lib/prisma";
import { scopeToStudentIdFilter, visibleStudentIds } from "../lib/access";
import { requireAuth, type AuthUser } from "../middleware/auth";
import { PaymentMethod, PaymentStatus } from "../generated/prisma/enums";
import { config } from "../config";
import {
  capturePayPalOrder,
  centsToValue,
  createPayPalOrder,
  paypalConfigured,
  PayPalError,
} from "../lib/paypal";

const router = Router();

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * GET /payments
 *
 * El historial de pagos, con el alcance que corresponde a quien pregunta:
 *
 *   ADMIN / PROFESOR  todos los pagos del dojo (tienen payments:read)
 *   ALUMNO            los suyos
 *   TUTOR             los de los alumnos a su cargo
 *
 * Es solo lectura. Registrar y editar cobros es del módulo feature/payments.
 *
 * El alcance se calcula SIEMPRE en el servidor a partir del token. No hay
 * parámetro de alumno: si lo hubiera, alguien podría pedir los pagos de otro.
 */
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;

  // Un solo cálculo de alcance para los cuatro roles. Antes esto dependía
  // del permiso payments:read, que para un profesor habría significado
  // "todos los pagos del dojo"; ahora se limita a sus alumnos asignados.
  const scope = await visibleStudentIds(user);
  const filtro = scopeToStudentIdFilter(scope);

  // Alcance vacío: no tiene alumnos asignados ni hijos inscritos. Hay que
  // cortar aquí, porque un `where` con lista vacía no es lo mismo que no
  // filtrar: confundirlos devolvería TODOS los pagos.
  if (scope !== "todos" && scope.length === 0) {
    return res.json({
      success: true,
      alcance: "propios",
      resumen: { totalPendienteCents: 0, pagos: 0, pendientes: 0 },
      payments: [],
    });
  }

  const payments = await prisma.payment.findMany({
    where: filtro,
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 200,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const pendientes = payments.filter(
    (p) => p.status !== PaymentStatus.PAGADO
  );

  return res.json({
    success: true,
    alcance: scope === "todos" ? "todos" : "propios",
    resumen: {
      pagos: payments.length,
      pendientes: pendientes.length,
      totalPendienteCents: pendientes.reduce(
        (suma, p) => suma + p.amountCents,
        0
      ),
    },
    payments: payments.map((p) => ({
      id: p.id,
      studentId: p.student.id,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      amountCents: p.amountCents,
      periodYear: p.periodYear,
      periodMonth: p.periodMonth,
      status: p.status,
      method: p.method,
      paidAt: p.paidAt ? dateOnly(p.paidAt) : null,
      note: p.note,
    })),
  });
});

// ---------------------------------------------------------------------------
// Pago en línea con PayPal
// ---------------------------------------------------------------------------
//
// Una orden de PayPal por mensualidad. Así `externalReference` (el id de la
// orden) apunta a un solo Payment y puede ser único en la base de datos.
//
// Flujo:
//   1. POST /payments/:id/paypal/order    el backend crea la orden con el
//      monto de la BD y devuelve su id al botón de PayPal.
//   2. El usuario aprueba en la ventana de PayPal.
//   3. POST /payments/:id/paypal/capture  el backend captura con su secreto,
//      verifica estado, monto y custom_id, y solo entonces marca PAGADO.
//
// El navegador nunca decide el monto ni marca nada como pagado.

/** El pago, solo si está dentro del alcance de quien pregunta. */
async function pagoVisible(user: AuthUser, paymentId: number) {
  if (!Number.isInteger(paymentId)) return null;

  const scope = await visibleStudentIds(user);

  // Igual que en GET /: alcance vacío no es lo mismo que no filtrar.
  if (scope !== "todos" && scope.length === 0) return null;

  return prisma.payment.findFirst({
    where: { id: paymentId, ...scopeToStudentIdFilter(scope) },
  });
}

function responderErrorPayPal(res: Response, error: unknown) {
  if (error instanceof PayPalError) {
    console.error("[paypal]", error.status, error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
  throw error;
}

router.post("/:id/paypal/order", requireAuth, async (req, res) => {
  if (!paypalConfigured()) {
    return res.status(503).json({
      success: false,
      message: "El pago en línea no está configurado en el servidor.",
    });
  }

  const pago = await pagoVisible(req.user!, Number(req.params.id));

  if (!pago) {
    return res
      .status(404)
      .json({ success: false, message: "Pago no encontrado." });
  }

  if (pago.status === PaymentStatus.PAGADO) {
    return res.status(409).json({
      success: false,
      message: "Esta mensualidad ya está pagada.",
    });
  }

  try {
    const orderId = await createPayPalOrder({
      amountCents: pago.amountCents,
      customId: String(pago.id),
      description: `Mensualidad ${String(pago.periodMonth).padStart(2, "0")}/${pago.periodYear}`,
    });

    return res.json({ success: true, orderId });
  } catch (error) {
    return responderErrorPayPal(res, error);
  }
});

router.post("/:id/paypal/capture", requireAuth, async (req, res) => {
  if (!paypalConfigured()) {
    return res.status(503).json({
      success: false,
      message: "El pago en línea no está configurado en el servidor.",
    });
  }

  const orderId =
    typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "";
  const pago = await pagoVisible(req.user!, Number(req.params.id));

  if (!pago || !orderId) {
    return res
      .status(404)
      .json({ success: false, message: "Pago no encontrado." });
  }

  // La misma orden ya quedó registrada (doble clic, reintento de red):
  // respondemos éxito sin volver a capturar ni escribir.
  if (pago.externalReference === orderId) {
    return res.json({ success: true });
  }

  if (pago.status === PaymentStatus.PAGADO) {
    return res.status(409).json({
      success: false,
      message: "Esta mensualidad ya está pagada.",
    });
  }

  let resultado: Awaited<ReturnType<typeof capturePayPalOrder>>;

  try {
    resultado = await capturePayPalOrder(orderId);
  } catch (error) {
    return responderErrorPayPal(res, error);
  }

  const { status, capture } = resultado;

  // Se verifica contra la respuesta de PayPal, no contra lo que diga el
  // navegador: que la orden sea de ESTE pago y por el monto correcto.
  const valido =
    status === "COMPLETED" &&
    capture?.status === "COMPLETED" &&
    capture.custom_id === String(pago.id) &&
    capture.amount.currency_code === config.paypal.currency &&
    capture.amount.value === centsToValue(pago.amountCents);

  if (!valido) {
    console.error("[paypal] captura no válida", { orderId, status, capture });
    return res.status(422).json({
      success: false,
      message: "PayPal no confirmó el pago.",
    });
  }

  // updateMany con el estado en el where: si llegan dos capturas a la vez,
  // solo una encuentra el pago todavía sin pagar.
  const { count } = await prisma.payment.updateMany({
    where: { id: pago.id, status: { not: PaymentStatus.PAGADO } },
    data: {
      status: PaymentStatus.PAGADO,
      method: PaymentMethod.PAYPAL,
      externalReference: orderId,
      paidAt: new Date(),
    },
  });

  if (count === 0) {
    return res.status(409).json({
      success: false,
      message: "Esta mensualidad ya está pagada.",
    });
  }

  return res.json({ success: true });
});

export default router;
