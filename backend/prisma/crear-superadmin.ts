/**
 * Crea la cuenta de superadministrador. No hay pantalla para esto a propósito:
 * es la cuenta que crea dojos, así que solo la crea quien tiene el servidor.
 *
 *   SUPERADMIN_EMAIL="tu@correo.com" SUPERADMIN_PASSWORD="..." \
 *     npx tsx prisma/crear-superadmin.ts
 *
 * Opcional: SUPERADMIN_NAME. Se puede correr de nuevo sin duplicar nada.
 */

import { asegurarSuperadmin } from "./dojoDeSemilla";
import { prismaGlobal } from "../src/lib/prisma";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    throw new Error(
      "Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 8 caracteres)."
    );
  }

  await asegurarSuperadmin(
    process.env.SUPERADMIN_NAME ?? "Superadministrador",
    email,
    password
  );

  console.log(`Superadministrador listo: ${email.trim().toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prismaGlobal.$disconnect());
