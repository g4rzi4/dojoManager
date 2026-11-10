import { Role } from "../src/generated/prisma/enums";
import { conDojo } from "../src/lib/dojoContext";
import { hashPassword } from "../src/lib/password";
import { prismaGlobal } from "../src/lib/prisma";

/**
 * Corre un script de datos iniciales dentro del primer dojo de la base, que
 * crea la migración `dojos`. Sin un dojo, las consultas no se dejarían hacer.
 */
export async function enElPrimerDojo<T>(fn: () => Promise<T>): Promise<T> {
  const dojo =
    (await prismaGlobal.dojo.findFirst({
      where: { isPlatform: false },
      orderBy: { id: "asc" },
    })) ?? (await prismaGlobal.dojo.create({ data: { name: "Mi dojo" } }));

  return conDojo(dojo.id, fn);
}

/**
 * Crea la cuenta de superadministrador si no existe.
 *
 * Toda cuenta pertenece a un dojo, así que esta vive en uno aparte que no
 * aparece en ninguna lista y no tiene alumnos: ahí no hay nada que ver.
 */
export async function asegurarSuperadmin(
  name: string,
  rawEmail: string,
  password: string
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();

  const existente = await prismaGlobal.user.findUnique({ where: { email } });

  if (existente) {
    if (existente.role !== Role.SUPERADMIN) {
      throw new Error(`${email} ya es una cuenta de otro rol.`);
    }

    return;
  }

  const plataforma =
    (await prismaGlobal.dojo.findFirst({ where: { isPlatform: true } })) ??
    (await prismaGlobal.dojo.create({
      data: { name: "Plataforma", isPlatform: true },
    }));

  await prismaGlobal.user.create({
    data: {
      dojoId: plataforma.id,
      name,
      email,
      password: await hashPassword(password),
      role: Role.SUPERADMIN,
    },
  });
}
