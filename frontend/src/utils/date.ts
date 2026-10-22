export const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Etiquetas de la semana empezando en lunes, como se usa en México. */
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Convierte una fecha a la clave YYYY-MM-DD usando sus componentes LOCALES.
 *
 * Importante: no usamos toISOString(), porque convierte a UTC y en México
 * (UTC-6) eso devuelve el día anterior para cualquier hora antes de las 6am.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Construye las 42 celdas (6 semanas) de la cuadrícula de un mes.
 *
 * Siempre 6 semanas, incluso si el mes cabe en 5: así la altura del
 * calendario no cambia al navegar entre meses y la página no "salta".
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);

  // getDay() devuelve 0 para domingo; lo rotamos para que lunes sea 0.
  const offset = (firstOfMonth.getDay() + 6) % 7;

  const start = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, i) => {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  });
}

/**
 * Convierte una clave YYYY-MM-DD de vuelta a Date en hora local.
 *
 * No usamos new Date("2026-03-01") porque el estándar interpreta ese formato
 * como UTC y en México terminaría siendo el 28 de febrero a las 18:00.
 */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Formatea como "lunes 3 de marzo de 2026". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
