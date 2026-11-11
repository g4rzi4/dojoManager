import "dotenv/config";

/**
 * Lee y valida la configuración al arrancar.
 *
 * Preferimos fallar aquí, con un mensaje claro, que arrancar a medias y
 * descubrir media hora después que los tokens se firman con `undefined`.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia backend/.env.example como backend/.env y configúrala.`
    );
  }

  return value;
}

/** Quita la diagonal final para que no salgan URLs con "//". */
function sinDiagonalFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Orígenes permitidos para CORS, separados por coma.
 *
 * Acepta varios a propósito: en desarrollo hace falta `localhost` para
 * trabajar en la computadora Y la IP de red local para abrir la app desde el
 * celular. Si solo se permitiera uno, escanear un QR fallaría.
 */
const corsOrigins = (
  process.env.CORS_ORIGIN ?? "http://localhost:5173"
)
  .split(",")
  .map((o) => sinDiagonalFinal(o.trim()))
  .filter((o) => o.length > 0);

export const config = {
  port: Number(process.env.PORT ?? 3000),

  corsOrigins,

  /**
   * Dirección pública del frontend, la que se mete en los enlaces de
   * invitación y en los QR.
   *
   * Es una variable aparte de CORS_ORIGIN porque cumplen cosas distintas:
   * CORS puede permitir varios orígenes, pero un enlace solo puede apuntar a
   * uno. Y ese uno tiene que ser alcanzable desde el dispositivo que escanea:
   * `localhost` en un celular significa el celular mismo, así que un QR con
   * localhost nunca va a funcionar.
   *
   * Por omisión usa el primer origen de CORS.
   */
  appUrl: sinDiagonalFinal(process.env.PUBLIC_APP_URL ?? corsOrigins[0]),

  jwtSecret: required("JWT_SECRET"),

  /** Duración del token en segundos. 7 días. */
  jwtExpiresInSeconds: 60 * 60 * 24 * 7,

  /**
   * Llave de Anthropic para el asistente de IA. Solo se usa en el servidor:
   * nunca debe llegar al frontend ni escribirse en logs.
   *
   * Es opcional a propósito: sin ella, el resto del backend funciona igual y
   * solo el asistente queda deshabilitado.
   */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,

  /**
   * Llave secreta para autorizar a agentes externos (Zapier, Postman, scripts)
   * en las rutas protegidas /api/agent/*.
   */
  agentApiKey: process.env.AGENT_API_KEY || undefined,

  /**
   * Modo prueba del agente: correos separados por coma. Si hay alguno, el
   * agente solo ve a los morosos con esos correos. Vacío en producción.
   */
  agentCorreosPermitidos: ((lista: string[]) =>
    lista.length > 0 ? new Set(lista) : null)(
    (process.env.AGENT_CORREOS_PERMITIDOS ?? "")
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0)
  ),

  /**
   * PayPal. Opcional por la misma razón: sin credenciales, la app funciona y
   * solo el pago en línea queda deshabilitado.
   *
   * El clientId es público (lo usa el botón del navegador). El clientSecret
   * nunca sale del servidor.
   */
  /**
   * Correo saliente, para recuperar contraseñas. Opcional: sin SMTP_HOST, el
   * enlace se escribe en la consola del backend y el administrador o el
   * profesor pueden generar uno para compartirlo.
   */
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from:
      process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@dojomanager.local",
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || undefined,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || undefined,
    baseUrl:
      process.env.PAYPAL_ENV === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
    currency: process.env.PAYPAL_CURRENCY || "MXN",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || undefined,
  },
};
