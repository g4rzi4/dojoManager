import { createHash, randomBytes } from "node:crypto";

import { config } from "../config";
import { enviarCorreo } from "./mailer";
import { hashPassword } from "./password";
import { prismaGlobal } from "./prisma";

/** El enlace por correo caduca pronto: el correo es el canal menos privado. */
const HORAS_ENLACE_CORREO = 1;

/** El que comparte el dojo dura más: la persona puede tardar en abrirlo. */
export const HORAS_ENLACE_COMPARTIDO = 24;

/** Evita que alguien inunde una bandeja pidiendo enlaces sin parar. */
const SEGUNDOS_ENTRE_CORREOS = 60;

export const MIN_PASSWORD = 8;

function hashDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea un enlace nuevo y anula los anteriores de ese usuario.
 *
 * Este archivo usa prismaGlobal porque recuperar la contraseña ocurre sin
 * sesión. Las rutas con sesión que llaman aquí ya validaron que el usuario
 * sea de su dojo.
 */
export async function crearEnlaceDeRestablecimiento(
  userId: number,
  horas: number
): Promise<{ url: string; expiresAt: Date }> {
  // 256 bits de crypto.randomBytes: adivinarlo no es viable.
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + horas * 60 * 60 * 1000);

  await prismaGlobal.$transaction([
    prismaGlobal.passwordResetToken.deleteMany({ where: { userId } }),
    prismaGlobal.passwordResetToken.create({
      data: { userId, tokenHash: hashDeToken(token), expiresAt },
    }),
  ]);

  return { url: `${config.appUrl}/restablecer/${token}`, expiresAt };
}

/**
 * Envía el enlace si el correo es de una cuenta activa. Si no, no hace nada,
 * sin decirlo: la respuesta no debe revelar qué correos están registrados.
 */
export async function solicitarRecuperacion(email: string): Promise<void> {
  const user = await prismaGlobal.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, active: true },
  });

  if (!user?.active) return;

  const reciente = await prismaGlobal.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - SEGUNDOS_ENTRE_CORREOS * 1000) },
    },
    select: { id: true },
  });

  if (reciente) return;

  const { url } = await crearEnlaceDeRestablecimiento(
    user.id,
    HORAS_ENLACE_CORREO
  );

  await enviarCorreo({
    to: user.email,
    subject: "Restablece tu contraseña de DojoManager",
    text: [
      `Hola, ${user.name}.`,
      "",
      "Recibimos una solicitud para restablecer tu contraseña. Abre este enlace para elegir una nueva:",
      "",
      url,
      "",
      `El enlace caduca en ${HORAS_ENLACE_CORREO} hora y solo funciona una vez.`,
      "Si no fuiste tú, ignora este correo: tu contraseña no cambiará.",
    ].join("\n"),
  });
}

/** ¿El enlace todavía sirve? */
export async function enlaceVigente(token: string): Promise<boolean> {
  const fila = await prismaGlobal.passwordResetToken.findUnique({
    where: { tokenHash: hashDeToken(token) },
    select: {
      usedAt: true,
      expiresAt: true,
      user: { select: { active: true } },
    },
  });

  return Boolean(
    fila && !fila.usedAt && fila.expiresAt > new Date() && fila.user.active
  );
}

/**
 * Cambia la contraseña y consume el enlace en una misma transacción.
 *
 * El updateMany condicionado hace que, si llegan dos envíos a la vez, solo uno
 * encuentre el enlace sin usar.
 */
export async function restablecerContrasena(
  token: string,
  password: string
): Promise<boolean> {
  if (!(await enlaceVigente(token))) return false;

  const hash = await hashPassword(password);
  const tokenHash = hashDeToken(token);

  return prismaGlobal.$transaction(async (tx) => {
    const { count } = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (count === 0) return false;

    const { userId } = await tx.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash },
      select: { userId: true },
    });

    await tx.user.update({ where: { id: userId }, data: { password: hash } });

    // Cualquier otro enlace pendiente de esa cuenta deja de servir.
    await tx.passwordResetToken.deleteMany({
      where: { userId, tokenHash: { not: tokenHash } },
    });

    return true;
  });
}
