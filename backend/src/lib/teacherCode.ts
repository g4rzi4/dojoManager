import { prismaGlobal } from "./prisma";

/**
 * Generación de la clave única del profesor, p. ej. "PROF-7K2M".
 *
 * El alfabeto excluye O, 0, I, 1 y L: la clave se dicta en voz alta y se
 * escribe a mano al registrar alumnos, y esos caracteres se confunden.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LARGO = 4;
const INTENTOS = 10;

function candidato(): string {
  let sufijo = "";

  for (let i = 0; i < LARGO; i++) {
    sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }

  return `PROF-${sufijo}`;
}

/**
 * Devuelve una clave que no exista todavía.
 *
 * Con 31 caracteres y 4 posiciones hay ~923 mil combinaciones, así que una
 * colisión es improbable, pero no imposible. Reintentamos unas cuantas veces
 * y, si de plano no hay suerte, fallamos en lugar de devolver una repetida:
 * el índice único de la base lo rechazaría igual.
 */
export async function generateTeacherCode(): Promise<string> {
  for (let i = 0; i < INTENTOS; i++) {
    const code = candidato();

    const existe = await prismaGlobal.user.findUnique({
      where: { teacherCode: code },
      select: { id: true },
    });

    if (!existe) return code;
  }

  throw new Error(
    "No fue posible generar una clave de profesor única. Intenta de nuevo."
  );
}

/** Normaliza lo que escribió el usuario: mayúsculas y sin espacios. */
export function normalizeTeacherCode(raw: string): string {
  return raw.trim().toUpperCase();
}
