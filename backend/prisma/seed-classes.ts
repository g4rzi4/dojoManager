/**
 * Horarios aleatorios para los profesores del dojo de demostración.
 *
 *   DATABASE_URL=".../dojomanager_demo" npx tsx prisma/seed-classes.ts
 *
 * Cada profesor recibe de 3 a 5 clases. Nadie tiene dos clases a la misma
 * hora y ningún tatami se usa dos veces en el mismo horario.
 *
 * Si ya hay clases no hace nada, para no duplicar ni borrar las que se hayan
 * agregado a mano. Con --regenerar borra todas y las vuelve a generar.
 */

import { prisma } from "../src/lib/prisma";
import { Discipline, Level, Role } from "../src/generated/prisma/enums";

const CLASES = [
  { title: "Karate infantil", discipline: Discipline.KARATE, level: Level.PRINCIPIANTES },
  { title: "Karate juvenil", discipline: Discipline.KARATE, level: Level.INTERMEDIOS },
  { title: "Kata", discipline: Discipline.KARATE, level: Level.MIXTO },
  { title: "Kumite", discipline: Discipline.KARATE, level: Level.AVANZADOS },
  { title: "Preparación para torneo", discipline: Discipline.KARATE, level: Level.AVANZADOS },
  { title: "Defensa personal", discipline: Discipline.DEFENSA_PERSONAL, level: Level.MIXTO },
  { title: "Acondicionamiento", discipline: Discipline.ACONDICIONAMIENTO, level: Level.MIXTO },
];

/** Lunes a viernes por la tarde; sábado por la mañana. */
const HORARIOS = [
  ...[0, 1, 2, 3, 4].flatMap((dayOfWeek) => [
    { dayOfWeek, startTime: "16:00", endTime: "17:00" },
    { dayOfWeek, startTime: "17:15", endTime: "18:30" },
    { dayOfWeek, startTime: "18:45", endTime: "20:00" },
    { dayOfWeek, startTime: "20:15", endTime: "21:30" },
  ]),
  { dayOfWeek: 5, startTime: "09:00", endTime: "10:15" },
  { dayOfWeek: 5, startTime: "10:30", endTime: "11:45" },
  { dayOfWeek: 5, startTime: "12:00", endTime: "13:15" },
];

const TATAMIS = ["Tatami 1", "Tatami 2", "Tatami 3"];
const CAPACIDADES = [12, 15, 18, 20, 25];

function azar<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/** Fisher-Yates: ordenar con Math.random en sort() sesga el resultado. */
function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

async function main() {
  if (await prisma.user.findUnique({ where: { email: "admin@dojo.com" }, select: { id: true } })) {
    throw new Error("Esta base tiene los datos del seed normal. Este seed va en el dojo de demostración.");
  }

  const existentes = await prisma.dojoClass.count();

  if (existentes > 0 && !process.argv.includes("--regenerar")) {
    console.log(`Ya hay ${existentes} clases; no se generó nada. Usa --regenerar para rehacerlas.`);
    return;
  }

  await prisma.dojoClass.deleteMany();

  const profesores = await prisma.user.findMany({
    where: { role: Role.PROFESOR, active: true },
    select: { id: true },
  });

  const tatamisOcupados = new Set<string>();

  for (const profesor of profesores) {
    const cuantas = 3 + Math.floor(Math.random() * 3);
    let creadas = 0;

    // Cada horario aparece una sola vez: un profesor nunca se empalma.
    for (const horario of barajar(HORARIOS)) {
      if (creadas === cuantas) break;

      const libre = barajar(TATAMIS).find(
        (t) => !tatamisOcupados.has(`${horario.dayOfWeek}-${horario.startTime}-${t}`)
      );

      if (!libre) continue;

      tatamisOcupados.add(`${horario.dayOfWeek}-${horario.startTime}-${libre}`);

      await prisma.dojoClass.create({
        data: {
          ...azar(CLASES),
          ...horario,
          location: libre,
          capacity: azar(CAPACIDADES),
          teacherId: profesor.id,
        },
      });

      creadas++;
    }
  }

  console.log(`Horario listo: ${await prisma.dojoClass.count()} clases.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
