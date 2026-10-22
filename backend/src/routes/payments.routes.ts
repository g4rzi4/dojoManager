import { Router } from "express";

import { prisma } from "../lib/prisma";
import { scopeToStudentIdFilter, visibleStudentIds } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { PaymentStatus } from "../generated/prisma/enums";

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

export default router;
