import { randomBytes } from "node:crypto";

import { prisma } from "./prisma";
import { config } from "../config";

/**
 * Invitaciones de inscripción.
 *
 * El token es lo ÚNICO que protege el formulario público, así que:
 *
 *  - Se genera con crypto.randomBytes, no con Math.random, que es predecible
 *  - 24 bytes = 192 bits de entropía. Adivinarlo por fuerza bruta no es viable
 *  - Va en base64url, para que no haya que escapar nada en la URL
 */

const TOKEN_BYTES = 24;

/** Días que vive una invitación antes de caducar. */
export const DIAS_DE_VIGENCIA = 14;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function expiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + DIAS_DE_VIGENCIA);
  return d;
}

/** La URL que se comparte o se convierte en QR. */
export function invitationUrl(token: string): string {
  // Apunta al frontend, no al backend: lo que se abre es una pantalla.
  return `${config.corsOrigin}/inscripcion/${token}`;
}

export type MotivoInvalida = "no-existe" | "usada" | "caducada";

export type InvitationEstado =
  | { ok: true; invitation: NonNullable<Awaited<ReturnType<typeof buscar>>> }
  | { ok: false; motivo: MotivoInvalida };

function buscar(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: {
      createdBy: { select: { id: true, name: true, role: true, active: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

/**
 * Busca la invitación y dice si se puede usar.
 *
 * Distingue los tres motivos para poder dar un mensaje útil: "ya se usó" y
 * "caducó" le dicen a la persona qué pedirle al profesor, mientras que un
 * "no existe" genérico la deja sin saber qué hacer.
 */
export async function validarInvitacion(
  token: string
): Promise<InvitationEstado> {
  const invitation = await buscar(token);

  if (!invitation) return { ok: false, motivo: "no-existe" };
  if (invitation.usedAt) return { ok: false, motivo: "usada" };
  if (invitation.expiresAt < new Date()) {
    return { ok: false, motivo: "caducada" };
  }

  return { ok: true, invitation };
}

export const MENSAJES_INVALIDA: Record<MotivoInvalida, string> = {
  "no-existe": "Este enlace de inscripción no es válido.",
  usada: "Este enlace ya se usó. Pídele al dojo que te genere uno nuevo.",
  caducada: "Este enlace caducó. Pídele al dojo que te genere uno nuevo.",
};
