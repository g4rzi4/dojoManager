import type { PaymentStatus } from "./student";

export type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "PAYPAL";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  PAYPAL: "PayPal",
};

export type PaymentRow = {
  id: number;
  studentId: number;
  studentName: string;
  amountCents: number;
  periodYear: number;
  periodMonth: number;
  status: PaymentStatus;
  method: PaymentMethod | null;
  paidAt: string | null;
  note: string | null;
};

export type PaymentsResponse = {
  /**
   * "todos" para admin y profesor; "propios" para alumno y tutor.
   * Lo decide el backend a partir del token, no el frontend.
   */
  alcance: "todos" | "propios";
  resumen: {
    pagos: number;
    pendientes: number;
    totalPendienteCents: number;
  };
  payments: PaymentRow[];
};

/** Resumen de un alumno a cargo del tutor, para su panel. */
export type MyStudent = {
  id: number;
  firstName: string;
  lastName: string;
  currentBelt: import("./student").Belt;
  active: boolean;
  enrolledAt: string;
  graduaciones: number;
  asistencias: number;
  pagosPendientes: number;
  totalPendienteCents: number;
};
