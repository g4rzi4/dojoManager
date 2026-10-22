export type Belt =
  | "BLANCO"
  | "AMARILLO"
  | "NARANJA"
  | "VERDE"
  | "AZUL"
  | "MARRON"
  | "NEGRO";

export type PaymentStatus = "PAGADO" | "PENDIENTE" | "VENCIDO";

export const BELT_LABELS: Record<Belt, string> = {
  BLANCO: "Blanco",
  AMARILLO: "Amarillo",
  NARANJA: "Naranja",
  VERDE: "Verde",
  AZUL: "Azul",
  MARRON: "Marrón",
  NEGRO: "Negro",
};

/** Clases del badge de cinturón. Mantienen contraste 4.5:1 del texto. */
export const BELT_STYLES: Record<Belt, string> = {
  BLANCO: "bg-white text-slate-800 border-slate-300",
  AMARILLO: "bg-yellow-300 text-yellow-950 border-yellow-500",
  NARANJA: "bg-orange-500 text-white border-orange-600",
  VERDE: "bg-green-700 text-white border-green-800",
  AZUL: "bg-blue-700 text-white border-blue-800",
  MARRON: "bg-amber-800 text-white border-amber-900",
  NEGRO: "bg-slate-900 text-white border-slate-900",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAGADO: "Pagado",
  PENDIENTE: "Pendiente",
  VENCIDO: "Vencido",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PAGADO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-900 border-amber-200",
  VENCIDO: "bg-red-50 text-red-800 border-red-200",
};

export type StudentListItem = {
  id: number;
  firstName: string;
  lastName: string;
  currentBelt: Belt;
  active: boolean;
  enrolledAt: string;
  /** Profesor responsable. Null si todavía no tiene uno asignado. */
  teacherName: string | null;
  teacherCode: string | null;
};

export type BeltPromotionEntry = {
  id: number;
  belt: Belt;
  promotedAt: string;
  notes: string | null;
  evaluatedBy: string | null;
};

export type AttendanceEntry = {
  id: number;
  date: string;
  present: boolean;
};

export type PaymentEntry = {
  id: number;
  /** Monto en centavos. Para mostrar: amountCents / 100. */
  amountCents: number;
  periodYear: number;
  periodMonth: number;
  status: PaymentStatus;
  paidAt: string | null;
  note: string | null;
};

export type GuardianRelationship = "MADRE" | "PADRE" | "TUTOR";

export const RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  MADRE: "Madre",
  PADRE: "Padre",
  TUTOR: "Tutor",
};

export type StudentGuardianEntry = {
  id: number;
  name: string;
  email: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
};

export type StudentNoteEntry = {
  id: number;
  body: string;
  createdAt: string;
  author: string | null;
};

/** La tarjeta de información completa del alumno. */
export type StudentCard = {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  medicalNotes: string | null;
  currentBelt: Belt;
  enrolledAt: string;
  active: boolean;
  hasLogin: boolean;
  /** Tutores con cuenta que pueden consultar este expediente. */
  tutores: StudentGuardianEntry[];

  resumen: {
    graduaciones: number;
    asistenciasRegistradas: number;
    asistenciasPresente: number;
    pagosPendientes: number;
    observaciones: number;
  };

  historial: {
    graduaciones: BeltPromotionEntry[];
    asistencia: AttendanceEntry[];
    pagos: PaymentEntry[];
    observaciones: StudentNoteEntry[];
  };
};
