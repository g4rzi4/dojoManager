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
};
