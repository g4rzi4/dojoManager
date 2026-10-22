/**
 * Datos iniciales para desarrollo.
 *
 *   npx prisma db seed
 *
 * Es idempotente (usa upsert por correo), así que puedes correrlo varias
 * veces sin duplicar nada.
 *
 * ⚠️ Las contraseñas de aquí son para DESARROLLO LOCAL. No uses este seed
 * en producción ni subas estas cuentas a un servidor público.
 */

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import {
  Belt,
  EventCategory,
  GuardianRelationship,
  NotificationKind,
  NotificationTopic,
  PaymentMethod,
  PaymentStatus,
  Role,
} from "../src/generated/prisma/enums";

const PASSWORD_DEV = "123456";

/** Construye una fecha local sin hora, para columnas @db.Date. */
function fecha(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Resta días a hoy, en UTC, para generar asistencias recientes. */
function haceDias(dias: number): Date {
  const hoy = new Date();
  return new Date(
    Date.UTC(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth(),
      hoy.getUTCDate() - dias
    )
  );
}

async function main() {
  const hash = await hashPassword(PASSWORD_DEV);

  // -------------------------------------------------------------------------
  // Administrador
  // -------------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@dojo.com" },
    update: { role: Role.ADMIN },
    create: {
      name: "Administrador",
      email: "admin@dojo.com",
      password: hash,
      role: Role.ADMIN,
    },
  });

  // -------------------------------------------------------------------------
  // Profesor (subadministrador)
  // -------------------------------------------------------------------------
  const profesor = await prisma.user.upsert({
    where: { email: "profesor@dojo.com" },
    update: { role: Role.PROFESOR, teacherCode: "PROF-7K2M" },
    create: {
      name: "Sensei Ramírez",
      email: "profesor@dojo.com",
      password: hash,
      role: Role.PROFESOR,
      // Clave fija en el seed para poder documentarla en el README. Las que
      // genera el sistema al registrar un profesor son aleatorias.
      teacherCode: "PROF-7K2M",
    },
  });

  // Segundo profesor, para comprobar que cada uno ve SOLO a sus alumnos.
  const profesora = await prisma.user.upsert({
    where: { email: "profesora@dojo.com" },
    update: { role: Role.PROFESOR, teacherCode: "PROF-3XQ8" },
    create: {
      name: "Sensei Delgado",
      email: "profesora@dojo.com",
      password: hash,
      role: Role.PROFESOR,
      teacherCode: "PROF-3XQ8",
    },
  });

  // -------------------------------------------------------------------------
  // Alumno con cuenta y expediente completo
  // -------------------------------------------------------------------------
  const alumnoUser = await prisma.user.upsert({
    where: { email: "alumno@dojo.com" },
    update: { role: Role.ALUMNO },
    create: {
      name: "Ana López",
      email: "alumno@dojo.com",
      password: hash,
      role: Role.ALUMNO,
    },
  });

  const ana = await prisma.student.upsert({
    where: { userId: alumnoUser.id },
    update: {},
    create: {
      firstName: "Ana",
      lastName: "López",
      birthDate: fecha(2012, 4, 18),
      phone: "555 123 4567",
      guardianName: "Marta López",
      guardianPhone: "555 987 6543",
      medicalNotes: "Alergia al polen. Usa inhalador en temporada de lluvias.",
      currentBelt: Belt.VERDE,
      enrolledAt: fecha(2024, 1, 15),
      userId: alumnoUser.id,
    },
  });

  // Alumno sin cuenta de acceso, para probar ese caso
  const existeLuis = await prisma.student.findFirst({
    where: { firstName: "Luis", lastName: "Hernández" },
  });

  const luis =
    existeLuis ??
    (await prisma.student.create({
      data: {
        firstName: "Luis",
        lastName: "Hernández",
        birthDate: fecha(1995, 9, 3),
        phone: "555 222 3344",
        currentBelt: Belt.AMARILLO,
        enrolledAt: fecha(2025, 6, 1),
      },
    }));

  // -------------------------------------------------------------------------
  // Tutora con DOS hijos en el dojo
  // -------------------------------------------------------------------------
  const tutora = await prisma.user.upsert({
    where: { email: "tutor@dojo.com" },
    update: { role: Role.TUTOR },
    create: {
      name: "Marta López",
      email: "tutor@dojo.com",
      password: hash,
      role: Role.TUTOR,
    },
  });

  // Segundo hijo: hermano menor de Ana, sin cuenta propia.
  const existeDiego = await prisma.student.findFirst({
    where: { firstName: "Diego", lastName: "López" },
  });

  const diego =
    existeDiego ??
    (await prisma.student.create({
      data: {
        firstName: "Diego",
        lastName: "López",
        birthDate: fecha(2016, 11, 2),
        guardianName: "Marta López",
        guardianPhone: "555 987 6543",
        currentBelt: Belt.BLANCO,
        enrolledAt: fecha(2026, 2, 10),
      },
    }));

  // Vincula a la tutora con sus dos hijos.
  for (const hijo of [ana, diego]) {
    await prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: { studentId: hijo.id, guardianId: tutora.id },
      },
      update: {},
      create: {
        studentId: hijo.id,
        guardianId: tutora.id,
        relationship: GuardianRelationship.MADRE,
        isPrimary: true,
      },
    });
  }

  // Algo de historial para Diego, para que el panel de la tutora no se vea
  // vacío en uno de los dos hijos.
  await prisma.beltPromotion.deleteMany({ where: { studentId: diego.id } });
  await prisma.beltPromotion.create({
    data: {
      studentId: diego.id,
      belt: Belt.BLANCO,
      promotedAt: fecha(2026, 2, 10),
      notes: "Inscripción inicial.",
      evaluatedById: profesor.id,
    },
  });

  await prisma.payment.upsert({
    where: {
      studentId_periodYear_periodMonth: {
        studentId: diego.id,
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
      },
    },
    update: {},
    create: {
      studentId: diego.id,
      amountCents: 70000, // $700.00, tarifa infantil
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
      status: PaymentStatus.PENDIENTE,
      registeredById: profesor.id,
    },
  });

  // -------------------------------------------------------------------------
  // Asignación de alumnos a profesores
  //
  // Ana y Diego son del Sensei Ramírez; Luis es de la Sensei Delgado. Así se
  // puede comprobar que cada profesor ve solo a su grupo.
  // -------------------------------------------------------------------------
  await prisma.student.update({
    where: { id: ana.id },
    data: { teacherId: profesor.id },
  });
  await prisma.student.update({
    where: { id: diego.id },
    data: { teacherId: profesor.id },
  });
  await prisma.student.update({
    where: { id: luis.id },
    data: { teacherId: profesora.id },
  });

  // -------------------------------------------------------------------------
  // Historial de Ana
  // -------------------------------------------------------------------------

  // Graduaciones: borramos y recreamos para que el seed sea idempotente
  // sin necesitar una clave única sobre (alumno, cinturón).
  await prisma.beltPromotion.deleteMany({ where: { studentId: ana.id } });
  await prisma.beltPromotion.createMany({
    data: [
      {
        studentId: ana.id,
        belt: Belt.BLANCO,
        promotedAt: fecha(2024, 1, 15),
        notes: "Inscripción inicial.",
        evaluatedById: profesor.id,
      },
      {
        studentId: ana.id,
        belt: Belt.AMARILLO,
        promotedAt: fecha(2024, 7, 20),
        notes: "Buen dominio de katas básicas.",
        evaluatedById: profesor.id,
      },
      {
        studentId: ana.id,
        belt: Belt.NARANJA,
        promotedAt: fecha(2025, 2, 8),
        evaluatedById: profesor.id,
      },
      {
        studentId: ana.id,
        belt: Belt.VERDE,
        promotedAt: fecha(2025, 11, 14),
        notes: "Excelente progreso en combate.",
        evaluatedById: profesor.id,
      },
    ],
  });

  // Asistencia de los últimos 30 días: lunes, miércoles y viernes.
  await prisma.attendance.deleteMany({ where: { studentId: ana.id } });
  const asistencias = [];
  for (let i = 1; i <= 30; i++) {
    const dia = haceDias(i);
    const diaSemana = dia.getUTCDay();

    if (diaSemana === 1 || diaSemana === 3 || diaSemana === 5) {
      asistencias.push({
        studentId: ana.id,
        date: dia,
        // Faltó un par de veces, para que el resumen no sea 100%.
        present: i !== 8 && i !== 17,
        recordedById: profesor.id,
      });
    }
  }
  await prisma.attendance.createMany({ data: asistencias });

  // Pagos: los últimos 4 meses, el más reciente pendiente.
  const hoy = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const pagado = i > 0;

    await prisma.payment.upsert({
      where: {
        studentId_periodYear_periodMonth: {
          studentId: ana.id,
          periodYear: year,
          periodMonth: month,
        },
      },
      update: {},
      create: {
        studentId: ana.id,
        amountCents: 85000, // $850.00
        periodYear: year,
        periodMonth: month,
        status: pagado ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
        paidAt: pagado ? fecha(year, month, 5) : null,
        registeredById: profesor.id,
      },
    });
  }

  // Observaciones del profesor
  await prisma.studentNote.deleteMany({ where: { studentId: ana.id } });
  await prisma.studentNote.createMany({
    data: [
      {
        studentId: ana.id,
        body: "Muy constante en los entrenamientos. Lista para preparar el examen de cinturón azul.",
        authorId: profesor.id,
      },
      {
        studentId: ana.id,
        body: "Se lastimó el tobillo izquierdo en el calentamiento. Reposo una semana por indicación de su mamá.",
        authorId: profesor.id,
      },
      {
        studentId: ana.id,
        body: "Ayudó a los alumnos nuevos del grupo infantil. Buena actitud de liderazgo.",
        authorId: admin.id,
      },
    ],
  });

  // Marca como pagada en efectivo la mensualidad más antigua de Ana, para
  // que se vea el método de pago en la tarjeta.
  await prisma.payment.updateMany({
    where: { studentId: ana.id, status: PaymentStatus.PAGADO, method: null },
    data: { method: PaymentMethod.EFECTIVO },
  });

  // -------------------------------------------------------------------------
  // Eventos del calendario (mes actual)
  // -------------------------------------------------------------------------
  const hoyEv = new Date();
  const y = hoyEv.getFullYear();
  const m = hoyEv.getMonth() + 1;

  const eventos = [
    { title: "Clase de karate infantil", day: 3, time: "17:00", category: EventCategory.CLASE },
    { title: "Clase de adultos", day: 3, time: "19:00", category: EventCategory.CLASE },
    { title: "Cobro de mensualidades", day: 5, time: null, category: EventCategory.PAGO },
    { title: "Examen de cinturón amarillo", day: 12, time: "10:00", category: EventCategory.EXAMEN },
    { title: "Clase de adultos", day: 12, time: "19:00", category: EventCategory.CLASE },
    { title: "Torneo regional", day: 18, time: "09:00", category: EventCategory.TORNEO },
    { title: "Clase de karate infantil", day: 21, time: "17:00", category: EventCategory.CLASE },
    { title: "Examen de cinturón verde", day: 26, time: "11:00", category: EventCategory.EXAMEN },
    { title: "Junta de profesores", day: 28, time: "18:00", category: EventCategory.CLASE },
  ];

  // Borra solo los eventos del mes en curso antes de recrearlos, para no
  // tocar los que el equipo haya creado en otros meses.
  await prisma.event.deleteMany({
    where: {
      date: { gte: fecha(y, m, 1), lt: fecha(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) },
    },
  });

  for (const ev of eventos) {
    await prisma.event.create({
      data: {
        title: ev.title,
        date: fecha(y, m, ev.day),
        time: ev.time,
        category: ev.category,
        createdById: profesor.id,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Un aviso del dojo, para que la bandeja no se vea vacía
  // -------------------------------------------------------------------------
  const destinatarios = await prisma.user.findMany({
    where: { role: { in: [Role.ALUMNO, Role.TUTOR] }, active: true },
    select: { id: true },
  });

  for (const d of destinatarios) {
    const yaExiste = await prisma.notification.findFirst({
      where: {
        userId: d.id,
        kind: NotificationKind.AVISO,
        title: "Suspensión de clases por mantenimiento",
      },
    });

    if (!yaExiste) {
      await prisma.notification.create({
        data: {
          userId: d.id,
          kind: NotificationKind.AVISO,
          topic: NotificationTopic.GENERAL,
          title: "Suspensión de clases por mantenimiento",
          body: "El próximo sábado no habrá clases porque vamos a cambiar el tatami. Las clases se reponen el domingo en el mismo horario.",
          createdById: admin.id,
        },
      });
    }
  }

  console.log("Seed completado:");
  console.log(`  ADMIN     admin@dojo.com    / ${PASSWORD_DEV}`);
  console.log(`  PROFESOR  profesor@dojo.com  / ${PASSWORD_DEV}  clave PROF-7K2M (Ana, Diego)`);
  console.log(`  PROFESOR  profesora@dojo.com / ${PASSWORD_DEV}  clave PROF-3XQ8 (Luis)`);
  console.log(`  TUTOR     tutor@dojo.com    / ${PASSWORD_DEV}  (2 hijos)`);
  console.log(`  ALUMNO    alumno@dojo.com   / ${PASSWORD_DEV}`);
  console.log("");
  console.log(`  Alumnos: ${ana.firstName} ${ana.lastName} (historial completo, con cuenta),`);
  console.log(`           ${diego.firstName} ${diego.lastName} (hijo de la tutora, sin cuenta),`);
  console.log(`           ${luis.firstName} ${luis.lastName} (sin tutor ni cuenta)`);
  console.log(`  Eventos del mes: ${eventos.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
