export type EventCategory = "clase" | "examen" | "torneo" | "pago";

export type DojoEvent = {
  id: string;
  title: string;
  /** Fecha en formato YYYY-MM-DD (hora local, sin zona horaria). */
  date: string;
  /** Hora en formato HH:MM. Opcional: un evento puede durar todo el día. */
  time?: string;
  category: EventCategory;
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  clase: "Clase",
  examen: "Examen de cinturón",
  torneo: "Torneo",
  pago: "Cobro de mensualidad",
};

/**
 * Colores por categoría. Elegidos para cumplir contraste 4.5:1 del texto
 * sobre su propio fondo, para no depender solo del color como indicador.
 */
export const CATEGORY_STYLES: Record<
  EventCategory,
  { dot: string; chip: string }
> = {
  clase: {
    dot: "bg-blue-600",
    chip: "bg-blue-50 text-blue-800 border-blue-200",
  },
  examen: {
    dot: "bg-amber-600",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
  },
  torneo: {
    dot: "bg-violet-600",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
  },
  pago: {
    dot: "bg-emerald-600",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
};
