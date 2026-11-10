import { MONTH_NAMES } from "./date";

/**
 * Formatea centavos como pesos mexicanos.
 *
 * Los montos se guardan en centavos como entero: guardar dinero en float
 * produce errores de redondeo (0.1 + 0.2 !== 0.3).
 */
export function formatMoney(amountCents: number): string {
  return (amountCents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Convierte lo que escribió el usuario en centavos. Null si no es un monto.
 *
 * Trabaja con el texto, sin pasar por float: 19.99 * 100 da 1998.9999999999998.
 */
export function pesosACentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/[$,\s]/g, "");
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(limpio);

  if (!partes) return null;

  const centavos =
    Number(partes[1]) * 100 + Number((partes[2] ?? "").padEnd(2, "0"));

  return centavos > 0 ? centavos : null;
}

/** "octubre 2026" a partir del año y mes (1-12) de un pago. */
export function formatPeriod(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1] ?? String(month);
  return `${name} ${year}`;
}

/** Edad en años a partir de una fecha YYYY-MM-DD. Null si no hay fecha. */
export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const [year, month, day] = birthDate.split("-").map(Number);
  const today = new Date();

  let age = today.getFullYear() - year;

  // Resta un año si todavía no ha pasado el cumpleaños este año.
  const cumpleYaPaso =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!cumpleYaPaso) age -= 1;

  return age;
}

/** Porcentaje entero de asistencia. 0 si no hay registros. */
export function attendanceRate(presente: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((presente / total) * 100);
}
