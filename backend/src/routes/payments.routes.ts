import { Router } from "express";

import { prisma } from "../lib/prisma";
import { ownStudentIds } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { can } from "../permissions";
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

  const verTodos = can(user.role, "payments:read");

  // undefined = sin filtro (todos). Si no, solo los alumnos propios.
  let filtroAlumnos: number[] | undefined;

  if (!verTodos) {
    filtroAlumnos = await ownStudentIds(user);

    if (filtroAlumnos.length === 0) {
      return res.json({
        success: true,
        alcance: "propios",
        resumen: { totalPendienteCents: 0, pagos: 0, pendientes: 0 },
        payments: [],
      });
    }
  }

  const payments = await prisma.payment.findMany({
    where: filtroAlumnos ? { studentId: { in: filtroAlumnos } } : undefined,
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
    alcance: verTodos ? "todos" : "propios",
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
