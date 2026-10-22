/**
 * Las categorías van en MAYÚSCULAS para coincidir exactamente con el enum
 * EventCategory del backend (prisma/schema.prisma). Así, cuando feature/events
 * conecte el endpoint real, la respuesta encaja sin traducir nada.
 */
export type EventCategory = "CLASE" | "EXAMEN" | "TORNEO" | "PAGO";

export type DojoEvent = {
  id: string;
  title: string;
  /** Fecha en formato YYYY-MM-DD (hora local, sin zona horaria). */
  date: string;
  /** Hora en formato HH:MM. Opcional: un evento puede durar todo el día. */
  time?: string;
  category: EventCategory;

  /** Si hay que pagar para participar. Un torneo o un examen suelen costar. */
  requiresPayment?: boolean;
  /** Costo en centavos cuando el evento NO tiene modalidades. */
  priceCents?: number | null;
  /** Modalidades con su propio costo. Si hay, el total es la suma. */
  modalities?: import("./eventPayment").EventModality[];
  /** Cuántos reportes de pago lleva. Solo lo usan admin y profesores. */
  reportes?: number;
  /** Estado de los alumnos a cargo de quien consulta. */
  misAlumnos?: import("./eventPayment").MyEnrollment[];
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  CLASE: "Clase",
  EXAMEN: "Examen de cinta",
  TORNEO: "Torneo",
  PAGO: "Cobro de mensualidad",
};

/**
 * Colores por categoría. Elegidos para cumplir contraste 4.5:1 del texto
 * sobre su propio fondo, para no depender solo del color como indicador.
 */
export const CATEGORY_STYLES: Record<
  EventCategory,
  { dot: string; chip: string }
> = {
  CLASE: {
    dot: "bg-blue-600",
    chip: "bg-blue-50 text-blue-800 border-blue-200",
  },
  EXAMEN: {
    dot: "bg-amber-600",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
  },
  TORNEO: {
    dot: "bg-violet-600",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
  },
  PAGO: {
    dot: "bg-emerald-600",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
};
