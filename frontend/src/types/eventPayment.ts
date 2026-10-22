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

export type CompetitionGender = "FEMENIL" | "VARONIL";
export type BeltClass = "COLOR" | "NEGRA";

export const GENDER_LABELS: Record<CompetitionGender, string> = {
  FEMENIL: "Femenil",
  VARONIL: "Varonil",
};

export const BELT_CLASS_LABELS: Record<BeltClass, string> = {
  COLOR: "Cintas de color",
  NEGRA: "Cintas negras",
};

/**
 * Una categoría del catálogo, tal como la manda el backend.
 *
 * El catálogo NO se duplica aquí: se pide a GET /events/categories. Si algún
 * día cambian los rangos de edad, se cambian en un solo lugar.
 */
export type AgeCategoryInfo = {
  value: string;
  /** "Infantil", "U10", "Cadete"... */
  label: string;
  /** "8-9 años" o "36 años en adelante". */
  rango: string;
  minAge: number;
  maxAge: number | null;
  /** En qué ramas de cinta existe. Masters está en las dos. */
  beltClasses: BeltClass[];
};

export type CategoryCatalog = {
  generos: CompetitionGender[];
  ramas: BeltClass[];
  categorias: AgeCategoryInfo[];
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
  /** Categoría: rama, tipo de cinta y rango de edad. */
  gender: CompetitionGender | null;
  beltClass: BeltClass | null;
  ageCategory: string | null;
  /** Texto listo para mostrar, armado por el backend. */
  categoriaLegible: string | null;
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
