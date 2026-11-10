import { AsyncLocalStorage } from "node:async_hooks";

/**
 * De qué dojo es la petición en curso.
 *
 * AsyncLocalStorage lo mantiene disponible en todo lo que dispare la petición,
 * sin pasarlo de función en función. Lo fija requireAuth a partir del token, y
 * lib/prisma.ts lo usa para filtrar cada consulta.
 */
const almacen = new AsyncLocalStorage<{ dojoId: number }>();

/** Ejecuta `fn` dentro de un dojo: todas sus consultas quedan limitadas a él. */
export function conDojo<T>(dojoId: number, fn: () => T): T {
  return almacen.run({ dojoId }, fn);
}

/**
 * El dojo actual. Lanza si no hay ninguno, a propósito: una consulta sin dojo
 * es un error de programación, y fallar es mejor que devolver datos de todos.
 */
export function dojoActual(): number {
  const contexto = almacen.getStore();

  if (!contexto) {
    throw new Error(
      "Consulta sin dojo. Usa requireAuth o conDojo(); si de verdad es global, usa prismaGlobal."
    );
  }

  return contexto.dojoId;
}
