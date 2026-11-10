import type { Prisma } from "../generated/prisma/client";
import { PaymentStatus } from "../generated/prisma/enums";

/**
 * Cuánto se recuperó de los cobros a los que se les mandó recordatorio.
 *
 * Lo usan la ruta del agente externo (/api/agent/recovery-stats, para Zapier)
 * y el asistente de cobranza de la app. Vive aquí para que los dos midan
 * exactamente igual: el formato del resultado es un contrato con Zapier, los
 * prompts de Claude y los tests de Postman.
 */

const ZONA_DEL_DOJO = "America/Mexico_City";

/** "2026-11-09T20:30:00-06:00", el mismo formato que usa /unpaid. */
export function fechaDelDojo(fecha: Date): string {
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
export function diaDelDojo(fecha: Date): string {
  return fechaDelDojo(fecha).slice(0, 10);
}

/** Días completos entre dos fechas AAAA-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const aPesos = (centavos: number) => Math.round(centavos / 100);

/** Lo que hay que incluir al leer los recordatorios para poder resumirlos. */
export const INCLUIR_PAGO_RECORDADO = {
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
} satisfies Prisma.PaymentReminderInclude;

export type RecordatorioConPago = Prisma.PaymentReminderGetPayload<{
  include: typeof INCLUIR_PAGO_RECORDADO;
}>;

type EstadoRecuperacion = "RECUPERADO" | "REPORTADO" | "PENDIENTE" | "PAGADO_ANTES";

/**
 * Resume los recordatorios enviados entre `desde` y `ahora`.
 *
 * Estados de cada cobro, medidos desde su PRIMER recordatorio:
 *   - RECUPERADO:   pagado el día del recordatorio o después.
 *   - REPORTADO:    la familia dice que pagó y falta que el dojo lo confirme.
 *   - PENDIENTE:    sigue sin pagarse.
 *   - PAGADO_ANTES: ya estaba pagado cuando salió el recordatorio. No cuenta
 *                   para la tasa, porque el recordatorio no influyó.
 *
 * Los montos van en pesos enteros, igual que en /unpaid.
 */
export function resumirRecuperacion(
  recordatorios: RecordatorioConPago[],
  desde: Date,
  ahora: Date,
  dias: number
) {
  // Un cobro puede tener varios recordatorios: se agrupan y vale el primero.
  const porPago = new Map<
    number,
    { primero: Date; veces: number; pago: RecordatorioConPago["payment"] }
  >();

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

  return {
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
  };
}
