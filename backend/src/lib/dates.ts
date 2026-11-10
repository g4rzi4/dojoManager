/**
 * Fechas sin hora y "hoy" del dojo.
 *
 * El dojo opera en México, sin importar dónde corra el servidor: si usáramos
 * la hora del servidor (normalmente UTC), a las 7 de la noche ya sería "mañana".
 */

const ZONA_DEL_DOJO = "America/Mexico_City";

/** Hoy en México, como AAAA-MM-DD. */
export function hoyEnElDojo(): string {
  // El locale en-CA da justamente el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_DEL_DOJO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Convierte AAAA-MM-DD en la fecha que espera una columna @db.Date.
 *
 * Devuelve null si no es una fecha real: el constructor de Date acepta el 31
 * de febrero y lo convierte en marzo sin avisar.
 */
export function parseDateOnly(valor: unknown): Date | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const [y, m, d] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));

  return fecha.toISOString().slice(0, 10) === valor ? fecha : null;
}

/** Las columnas @db.Date vienen como medianoche UTC: se leen en UTC. */
export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
