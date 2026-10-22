import type { PaymentMethod } from "./payment";

export type EventPaymentStatus = "REPORTADO" | "CONFIRMADO" | "RECHAZADO";

export const EVENT_PAYMENT_LABELS: Record<EventPaymentStatus, string> = {
  REPORTADO: "Por confirmar",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Rechazado",
};

export const EVENT_PAYMENT_STYLES: Record<EventPaymentStatus, string> = {
  REPORTADO: "bg-amber-50 text-amber-900 border-amber-200",
  CONFIRMADO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RECHAZADO: "bg-red-50 text-red-800 border-red-200",
};

export type EventDivision = "INFANTIL" | "JUVENIL" | "ADULTO";

export const DIVISION_LABELS: Record<EventDivision, string> = {
  INFANTIL: "Infantil",
  JUVENIL: "Juvenil",
  ADULTO: "Adulto",
};

/** Modalidad de un evento con su costo: kata, kumite, equipos... */
export type EventModality = {
  id: number;
  name: string;
  priceCents: number;
};

/** Desglose de lo que se le cobró a un alumno. */
export type EnrollmentModality = {
  name: string;
  priceCents: number;
};

/** Un reporte de pago, como lo ve el profesor o el admin. */
export type EventEnrollment = {
  id: number;
  studentId: number;
  studentName: string;
  amountCents: number;
  status: EventPaymentStatus;
  /** Inscrito en el evento. Se pone en true al confirmar el pago. */
  enrolled: boolean;
  /** División en la que compite. Puede no coincidir con su edad. */
  division: EventDivision | null;
  /** Qué modalidades eligió y cuánto costó cada una. */
  modalidades: EnrollmentModality[];
  method: PaymentMethod | null;
  note: string | null;
  acreditadoA: string | null;
  reportedAt: string;
  confirmedAt: string | null;
};

/** El estado de un alumno a cargo de quien consulta, dentro de un evento. */
export type MyEnrollment = {
  studentId: number;
  status: EventPaymentStatus;
  enrolled: boolean;
};
