import type { Belt, PaymentStatus } from "./student";
import type { PaymentMethod } from "./payment";
import type { EventCategory } from "./event";

export type Teacher = {
  id: number;
  name: string;
  email: string;
  /** Clave única, p. ej. "PROF-7K2M". Se escribe al registrar alumnos. */
  teacherCode: string | null;
  active: boolean;
  /** Cuántos alumnos tiene asignados. */
  alumnos: number;
  createdAt: string;
};

/** Un alumno en la ficha del profesor. */
export type TeacherStudent = {
  id: number;
  firstName: string;
  lastName: string;
  currentBelt: Belt;
  active: boolean;
};

/** Cobro de un evento acreditado a la clave del profesor. */
export type TeacherEventCollection = {
  id: number;
  alumno: string;
  evento: string;
  categoria: EventCategory;
  fechaEvento: string;
  amountCents: number;
  method: PaymentMethod | null;
  confirmadoEn: string | null;
};

/** Mensualidad de un alumno del profesor. */
export type TeacherFeeCollection = {
  id: number;
  alumno: string;
  periodYear: number;
  periodMonth: number;
  amountCents: number;
  method: PaymentMethod | null;
  paidAt: string | null;
};

/** La ficha completa del profesor. */
export type TeacherCard = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  teacherCode: string | null;
  /** Grado del profesor: un sensei también tiene su cinta. */
  belt: Belt | null;
  specialty: string | null;
  hiredAt: string | null;
  /** Solo lo manda el backend si quien consulta es el administrador. */
  adminNotes: string | null;
  active: boolean;
  createdAt: string;

  resumen: {
    alumnos: number;
    alumnosActivos: number;
    eventosCreados: number;
    cobrosEvento: number;
    mensualidadesCobradas: number;
    totalEventosCents: number;
    totalMensualidadesCents: number;
    totalRecaudadoCents: number;
  };

  alumnos: TeacherStudent[];

  historialCobros: {
    eventos: TeacherEventCollection[];
    mensualidades: TeacherFeeCollection[];
  };
};

/** Lo que se puede editar de la ficha. */
export type TeacherUpdate = {
  /** Solo el administrador puede cambiar nombre y correo. */
  name?: string;
  email?: string;
  phone?: string | null;
  belt?: Belt | null;
  specialty?: string | null;
  hiredAt?: string | null;
  /** Solo el administrador puede mandarlo. */
  adminNotes?: string | null;
};

export type { PaymentStatus };
