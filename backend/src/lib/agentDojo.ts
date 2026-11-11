import type { NextFunction, Request, Response } from "express";

import { config } from "../config";
import { conDojo, dojoActual } from "./dojoContext";
import { prismaGlobal } from "./prisma";

/**
 * A qué dojo pertenece una petición del agente (Zapier).
 *
 * El agente no tiene sesión, así que no hay token del que sacar el dojo. Lo
 * indica con `?dojoId=`; si solo existe un dojo, ese se usa sin indicarlo.
 * Todo lo que sigue corre dentro de conDojo(), así que las consultas quedan
 * limitadas a ese dojo igual que en las rutas con sesión.
 */
export async function resolverDojoDelAgente(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const texto = req.query.dojoId;

  if (texto !== undefined) {
    const id = Number(texto);
    const dojo =
      Number.isInteger(id) && id > 0
        ? await prismaGlobal.dojo.findUnique({
            where: { id },
            select: { id: true, isPlatform: true },
          })
        : null;

    // El dojo de la plataforma solo guarda al superadministrador: no cobra.
    if (!dojo || dojo.isPlatform) {
      return res.status(404).json({
        success: false,
        message: `No existe un dojo con id ${String(texto)}.`,
      });
    }

    return conDojo(dojo.id, next);
  }

  const dojos = await prismaGlobal.dojo.findMany({
    where: { isPlatform: false },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  if (dojos.length !== 1) {
    return res.status(400).json({
      success: false,
      message:
        dojos.length === 0
          ? "No hay ningún dojo registrado."
          : "Hay varios dojos: indica cuál con ?dojoId= en la URL.",
      dojos: dojos.map((d) => ({ dojoId: d.id, nombre: d.name })),
    });
  }

  return conDojo(dojos[0].id, next);
}

/** El dojo de la petición en curso, para incluirlo en las respuestas. */
export async function dojoDeLaPeticion(): Promise<{
  dojoId: number;
  nombre: string;
}> {
  const dojo = await prismaGlobal.dojo.findUniqueOrThrow({
    where: { id: dojoActual() },
    select: { id: true, name: true },
  });

  return { dojoId: dojo.id, nombre: dojo.name };
}

/**
 * Modo prueba: si AGENT_CORREOS_PERMITIDOS tiene correos, el agente solo ve a
 * los morosos con esos correos. Evita que una prueba le escriba a familias
 * reales, o a dominios ajenos como los correos de ejemplo del seed.
 */
export function correoPermitido(email: string | null): boolean {
  if (config.agentCorreosPermitidos === null) return true;

  return (
    email !== null && config.agentCorreosPermitidos.has(email.toLowerCase())
  );
}

export function enModoPrueba(): boolean {
  return config.agentCorreosPermitidos !== null;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-10" -> "octubre 2026". */
export function mesLegible(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return `${MESES[numero - 1] ?? mes} ${anio}`;
}
