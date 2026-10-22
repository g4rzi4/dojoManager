import { Belt } from "../generated/prisma/enums";

/**
 * Nombre de cada cinta para mostrar al usuario.
 *
 * Los valores del enum (`BLANCO`, `AMARILLO`, `NEGRO`) están en masculino
 * porque describen el color, pero en el texto acompañan a "cinta", que es
 * femenino. Usar `belt.toLowerCase()` produciría "la cinta amarillo".
 *
 * En minúsculas porque siempre van dentro de una frase: "Se registró la
 * cinta amarilla". Si hace falta como título, capitaliza en el lugar donde
 * se use.
 */
export const BELT_LABELS: Record<Belt, string> = {
  [Belt.BLANCO]: "blanca",
  [Belt.AMARILLO]: "amarilla",
  [Belt.NARANJA]: "naranja",
  [Belt.VERDE]: "verde",
  [Belt.AZUL]: "azul",
  [Belt.MARRON]: "marrón",
  [Belt.NEGRO]: "negra",
};

/** Devuelve el nombre de la cinta, o el valor crudo si no se reconoce. */
export function beltLabel(belt: string): string {
  return BELT_LABELS[belt as Belt] ?? belt.toLowerCase();
}
