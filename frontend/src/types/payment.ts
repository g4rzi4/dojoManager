export type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "PAYPAL";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  PAYPAL: "PayPal",
};

/** Qué se cobra. Coincide con el `tipo` que recibe /paypal/orders. */
export type ChargeType = "MENSUALIDAD" | "EVENTO" | "EQUIPO";

export type ChargeStatus =
  | "PENDIENTE"
  | "VENCIDO"
  | "POR_CONFIRMAR"
  | "EN_REVISION"
  | "PAGADO"
  | "RECHAZADO";

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  MENSUALIDAD: "Mensualidad",
  EVENTO: "Evento",
  EQUIPO: "Uniformes y protecciones",
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDIENTE: "Pendiente",
  VENCIDO: "Vencido",
  POR_CONFIRMAR: "Por confirmar",
  EN_REVISION: "En revisión",
  PAGADO: "Pagado",
  RECHAZADO: "Rechazado",
};

export const CHARGE_STATUS_STYLES: Record<ChargeStatus, string> = {
  PENDIENTE: "bg-amber-50 text-amber-900 border-amber-200",
  VENCIDO: "bg-red-50 text-red-800 border-red-200",
  POR_CONFIRMAR: "bg-sky-50 text-sky-800 border-sky-200",
  EN_REVISION: "bg-neutral-100 text-neutral-800 border-neutral-300",
  PAGADO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RECHAZADO: "bg-red-50 text-red-800 border-red-200",
};

/** Un cobro de cualquier tipo: mensualidad, evento o uniformes. */
export type PaymentRow = {
  tipo: ChargeType;
  id: number;
  studentId: number;
  studentName: string;
  /** Nulo en mensualidades: se arma con el periodo. */
  concepto: string | null;
  periodYear: number | null;
  periodMonth: number | null;
  /** Nulo mientras el profesor no define el precio. */
  amountCents: number | null;
  estado: ChargeStatus;
  /** Verdadero si se puede pagar en línea ahora mismo. */
  pagable: boolean;
  method: PaymentMethod | null;
  paidAt: string | null;
  note: string | null;
};

export type PaymentsResponse = {
  /** "todos" solo para el admin. Lo decide el backend a partir del token. */
  alcance: "todos" | "propios";
  resumen: {
    pagos: number;
    pendientes: number;
    pagados: number;
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
