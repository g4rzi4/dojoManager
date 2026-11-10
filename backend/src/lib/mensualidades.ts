import { prisma } from "./prisma";
import { hoyEnElDojo } from "./dates";
import { PaymentStatus } from "../generated/prisma/enums";

/**
 * Marca como VENCIDAS las mensualidades pendientes de meses ya terminados.
 *
 * Se llama al consultar pagos, expedientes y notificaciones, en lugar de con
 * una tarea programada: el proyecto no tiene un cron corriendo. Es idempotente
 * y solo toca las filas que todavía están PENDIENTE.
 */
export async function marcarMensualidadesVencidas(): Promise<void> {
  const [year, month] = hoyEnElDojo().split("-").map(Number);

  await prisma.payment.updateMany({
    where: {
      status: PaymentStatus.PENDIENTE,
      OR: [
        { periodYear: { lt: year } },
        { periodYear: year, periodMonth: { lt: month } },
      ],
    },
    data: { status: PaymentStatus.VENCIDO },
  });
}
