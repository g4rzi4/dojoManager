import nodemailer, { type Transporter } from "nodemailer";

import { config } from "../config";

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    // 465 usa TLS desde el inicio; 587 y 25 lo negocian con STARTTLS.
    secure: config.smtp.port === 465,
    auth: config.smtp.user
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
  });

  return transporte;
}

/**
 * Envía un correo. Sin SMTP configurado lo escribe en la consola, para que
 * recuperar una contraseña funcione en desarrollo sin servicio de correo.
 */
export async function enviarCorreo(mensaje: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!config.smtp.host) {
    console.info(
      `[correo] SMTP sin configurar. Para ${mensaje.to}:\n${mensaje.text}`
    );
    return;
  }

  await obtenerTransporte().sendMail({ from: config.smtp.from, ...mensaje });
}
