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

export const config = {
  port: Number(process.env.PORT ?? 3000),

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  jwtSecret: required("JWT_SECRET"),

  /** Duración del token en segundos. 7 días. */
  jwtExpiresInSeconds: 60 * 60 * 24 * 7,
};
