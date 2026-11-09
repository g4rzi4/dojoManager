/**
 * Cuentas para un dojo de demostración, sin los registros del seed normal.
 *
 * La app no separa datos por dojo: un admin ve todo lo que hay en la base. Por
 * eso este seed va en una base de datos PROPIA, y se niega a correr si
 * encuentra las cuentas del seed normal.
 *
 *   DATABASE_URL=".../dojomanager_demo" npx tsx prisma/seed-demo.ts
 *
 * Es idempotente: se puede correr varias veces sin duplicar nada. Todos los
 * datos son ficticios y `.test` es un dominio reservado que no recibe correo.
 */

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { Belt, GuardianRelationship, Role } from "../src/generated/prisma/enums";

const PASSWORD_DEMO = "Dojo2026!";

function fecha(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

const ADMIN = { name: "Valeria Campos", email: "admin@dojodemo.test" };

/** El índice en esta lista es el que usan familias y alumnos. */
const PROFESORES = [
  { name: "Sensei Tomás Herrera", email: "t.herrera@dojodemo.test", code: "PROF-A3KM", phone: "555 201 0001", belt: Belt.NEGRO, specialty: "Kata e infantiles", hiredAt: "2018-02-12" },
  { name: "Sensei Paula Ibarra", email: "p.ibarra@dojodemo.test", code: "PROF-B7TR", phone: "555 201 0002", belt: Belt.NEGRO, specialty: "Kumite de competencia", hiredAt: "2019-09-02" },
  { name: "Sensei Andrés Rojas", email: "a.rojas@dojodemo.test", code: "PROF-C4WX", phone: "555 201 0003", belt: Belt.NEGRO, specialty: "Defensa personal", hiredAt: "2021-01-18" },
  { name: "Sensei Lucía Ferrer", email: "l.ferrer@dojodemo.test", code: "PROF-D9HN", phone: "555 201 0004", belt: Belt.MARRON, specialty: "Grupo juvenil", hiredAt: "2022-08-08" },
  { name: "Sensei Rubén Salas", email: "r.salas@dojodemo.test", code: "PROF-E5QZ", phone: "555 201 0005", belt: Belt.NEGRO, specialty: "Adultos y masters", hiredAt: "2023-03-06" },
];

/** Cada familia tiene UN profesor: sus hijos entrenan en el mismo grupo. */
const FAMILIAS = [
  { tutor: "Carolina Morales", email: "c.morales@dojodemo.test", phone: "555 301 0001", parentesco: GuardianRelationship.MADRE, profesor: 0, hijos: [
    { nombre: "Mateo", apellido: "Morales", nacimiento: "2016-05-14", cinta: Belt.AMARILLO },
  ] },
  { tutor: "Javier Núñez", email: "j.nunez@dojodemo.test", phone: "555 301 0002", parentesco: GuardianRelationship.PADRE, profesor: 1, hijos: [
    { nombre: "Sofía", apellido: "Núñez", nacimiento: "2013-11-02", cinta: Belt.VERDE },
    { nombre: "Emilio", apellido: "Núñez", nacimiento: "2015-07-21", cinta: Belt.NARANJA },
  ] },
  { tutor: "Daniela Ortega", email: "d.ortega@dojodemo.test", phone: "555 301 0003", parentesco: GuardianRelationship.MADRE, profesor: 2, hijos: [
    { nombre: "Regina", apellido: "Ortega", nacimiento: "2012-03-09", cinta: Belt.AZUL },
    { nombre: "Santiago", apellido: "Ortega", nacimiento: "2014-08-30", cinta: Belt.VERDE },
    { nombre: "Camila", apellido: "Ortega", nacimiento: "2018-01-17", cinta: Belt.BLANCO },
  ] },
  { tutor: "Héctor Vargas", email: "h.vargas@dojodemo.test", phone: "555 301 0004", parentesco: GuardianRelationship.PADRE, profesor: 3, hijos: [
    { nombre: "Valentina", apellido: "Vargas", nacimiento: "2010-06-25", cinta: Belt.MARRON },
  ] },
  { tutor: "Mónica Aguilar", email: "m.aguilar@dojodemo.test", phone: "555 301 0005", parentesco: GuardianRelationship.MADRE, profesor: 4, hijos: [
    { nombre: "Diego", apellido: "Aguilar", nacimiento: "2011-12-05", cinta: Belt.AZUL },
    { nombre: "Renata", apellido: "Aguilar", nacimiento: "2016-02-28", cinta: Belt.AMARILLO },
  ] },
  { tutor: "Ricardo Silva", email: "r.silva@dojodemo.test", phone: "555 301 0006", parentesco: GuardianRelationship.TUTOR, profesor: 0, hijos: [
    { nombre: "Ximena", apellido: "Silva", nacimiento: "2013-04-11", cinta: Belt.VERDE },
    { nombre: "Leonardo", apellido: "Silva", nacimiento: "2015-10-19", cinta: Belt.NARANJA },
    { nombre: "Julieta", apellido: "Silva", nacimiento: "2017-09-03", cinta: Belt.BLANCO },
  ] },
];

/** Alumnos con cuenta propia y sin tutor. */
const ALUMNOS = [
  { nombre: "Fernanda", apellido: "Cruz", email: "f.cruz@dojodemo.test", phone: "555 401 0001", nacimiento: "2004-07-16", cinta: Belt.AZUL, profesor: 1 },
  { nombre: "Alejandro", apellido: "Mejía", email: "a.mejia@dojodemo.test", phone: "555 401 0002", nacimiento: "1998-02-08", cinta: Belt.MARRON, profesor: 2 },
  { nombre: "Natalia", apellido: "Reyes", email: "n.reyes@dojodemo.test", phone: "555 401 0003", nacimiento: "2007-10-27", cinta: Belt.VERDE, profesor: 3 },
];

async function main() {
  const seedNormal = await prisma.user.findUnique({
    where: { email: "admin@dojo.com" },
    select: { id: true },
  });

  if (seedNormal) {
    throw new Error(
      "Esta base tiene los datos del seed normal. seed-demo va en una base aparte, para que el admin nuevo no los vea."
    );
  }

  const password = await hashPassword(PASSWORD_DEMO);

  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: { ...ADMIN, password, role: Role.ADMIN },
  });

  const profesores = [];

  for (const p of PROFESORES) {
    profesores.push(
      await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          name: p.name,
          email: p.email,
          password,
          role: Role.PROFESOR,
          teacherCode: p.code,
          phone: p.phone,
          belt: p.belt,
          specialty: p.specialty,
          hiredAt: fecha(p.hiredAt),
        },
      })
    );
  }

  for (const familia of FAMILIAS) {
    const tutor = await prisma.user.upsert({
      where: { email: familia.email },
      update: {},
      create: {
        name: familia.tutor,
        email: familia.email,
        password,
        role: Role.TUTOR,
      },
    });

    const teacherId = profesores[familia.profesor].id;

    for (const [indice, hijo] of familia.hijos.entries()) {
      const datos = {
        firstName: hijo.nombre,
        lastName: hijo.apellido,
        birthDate: fecha(hijo.nacimiento),
      };

      const student =
        (await prisma.student.findFirst({ where: datos })) ??
        (await prisma.student.create({
          data: {
            ...datos,
            guardianName: familia.tutor,
            guardianPhone: familia.phone,
            currentBelt: hijo.cinta,
            teacherId,
          },
        }));

      await prisma.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: student.id,
            guardianId: tutor.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          guardianId: tutor.id,
          relationship: familia.parentesco,
          isPrimary: indice === 0,
        },
      });
    }
  }

  for (const alumno of ALUMNOS) {
    const user = await prisma.user.upsert({
      where: { email: alumno.email },
      update: {},
      create: {
        name: `${alumno.nombre} ${alumno.apellido}`,
        email: alumno.email,
        password,
        role: Role.ALUMNO,
      },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        firstName: alumno.nombre,
        lastName: alumno.apellido,
        birthDate: fecha(alumno.nacimiento),
        phone: alumno.phone,
        currentBelt: alumno.cinta,
        userId: user.id,
        teacherId: profesores[alumno.profesor].id,
      },
    });
  }

  console.log("Dojo de demostración listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
