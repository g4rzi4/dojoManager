import { prisma } from "./prisma";
import { beltLabel } from "./belts";
import {
  NotificationKind,
  NotificationTopic,
  PaymentStatus,
} from "../generated/prisma/enums";

/**
 * Creación de notificaciones.
 *
 * Hay dos clases:
 *
 *   AUTOMATICA  las crea el sistema cuando pasa algo. Llevan `dedupeKey`
 *               para no repetirse: si el mismo hecho se evalúa diez veces,
 *               la notificación se crea una sola.
 *
 *   AVISO       las redacta un humano del dojo (ADMIN o PROFESOR) y se
 *               mandan a varios destinatarios a la vez.
 *
 * Los demás módulos deben llamar a estas funciones cuando hagan su CRUD.
 * Por ejemplo, feature/students al registrar una graduación debe llamar a
 * notifyBeltPromotion, para que al alumno y a sus tutores les llegue.
 */

/**
 * Crea una notificación automática, ignorándola si ya existía.
 *
 * Usa el índice único (userId, dedupeKey): si ya hay una para ese hecho,
 * createMany con skipDuplicates no hace nada en lugar de fallar.
 */
async function createAutomatic(entries: {
  userId: number;
  topic: NotificationTopic;
  title: string;
  body: string;
  link?: string;
  dedupeKey: string;
}[]) {
  if (entries.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: entries.map((e) => ({
      userId: e.userId,
      kind: NotificationKind.AUTOMATICA,
      topic: e.topic,
      title: e.title,
      body: e.body,
      link: e.link ?? null,
      dedupeKey: e.dedupeKey,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * A qué usuarios hay que avisarle de algo de este alumno: él mismo, si tiene
 * cuenta, y todos sus tutores.
 */
export async function audienceForStudent(
  studentId: number
): Promise<number[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      userId: true,
      guardians: { select: { guardianId: true } },
    },
  });

  if (!student) return [];

  const ids = student.guardians.map((g) => g.guardianId);

  if (student.userId) ids.push(student.userId);

  // Un tutor podría ser también el alumno en casos raros; sin duplicados.
  return [...new Set(ids)];
}

/**
 * Revisa los pagos pendientes o vencidos de los alumnos indicados y crea las
 * notificaciones que falten.
 *
 * Se llama al consultar las notificaciones, en lugar de con una tarea
 * programada: el proyecto no tiene un cron corriendo, y así el aviso aparece
 * igual sin infraestructura extra. Es idempotente por el dedupeKey, así que
 * llamarlo en cada carga no genera duplicados.
 */
export async function syncPaymentNotifications(studentIds: number[]) {
  if (studentIds.length === 0) return 0;

  const pendientes = await prisma.payment.findMany({
    where: {
      studentId: { in: studentIds },
      status: { in: [PaymentStatus.PENDIENTE, PaymentStatus.VENCIDO] },
    },
    select: {
      id: true,
      studentId: true,
      periodYear: true,
      periodMonth: true,
      status: true,
      amountCents: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const entries: Parameters<typeof createAutomatic>[0] = [];

  for (const pago of pendientes) {
    const destinatarios = await audienceForStudent(pago.studentId);
    const monto = (pago.amountCents / 100).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
    const vencido = pago.status === PaymentStatus.VENCIDO;

    for (const userId of destinatarios) {
      entries.push({
        userId,
        topic: NotificationTopic.PAGO,
        title: vencido ? "Mensualidad vencida" : "Mensualidad pendiente",
        body: `${pago.student.firstName} ${pago.student.lastName}: ${monto} del periodo ${pago.periodMonth}/${pago.periodYear}.`,
        link: "/pagos",
        dedupeKey: `pago-${pago.status.toLowerCase()}-${pago.id}`,
      });
    }
  }

  return createAutomatic(entries);
}

/** Llamar al registrar una graduación de cinta. */
export async function notifyBeltPromotion(
  promotionId: number,
  studentId: number,
  belt: string
) {
  const destinatarios = await audienceForStudent(studentId);

  return createAutomatic(
    destinatarios.map((userId) => ({
      userId,
      topic: NotificationTopic.GRADUACION,
      title: "Nueva graduación",
      body: `Se registró la cinta ${beltLabel(belt)}. ¡Felicidades!`,
      link: "/mi-tarjeta",
      dedupeKey: `graduacion-${promotionId}-${userId}`,
    }))
  );
}

/** Llamar al registrar una falta. */
export async function notifyAbsence(
  attendanceId: number,
  studentId: number,
  date: string
) {
  const destinatarios = await audienceForStudent(studentId);

  return createAutomatic(
    destinatarios.map((userId) => ({
      userId,
      topic: NotificationTopic.ASISTENCIA,
      title: "Falta registrada",
      body: `Se registró una ausencia el ${date}.`,
      link: "/mi-tarjeta",
      dedupeKey: `falta-${attendanceId}-${userId}`,
    }))
  );
}

/** Llamar al crear un evento, para avisar a quienes reciben el calendario. */
export async function notifyNewEvent(
  eventId: number,
  title: string,
  date: string,
  userIds: number[]
) {
  return createAutomatic(
    userIds.map((userId) => ({
      userId,
      topic: NotificationTopic.EVENTO,
      title: "Nuevo evento en el calendario",
      body: `${title} — ${date}.`,
      link: "/eventos",
      dedupeKey: `evento-${eventId}-${userId}`,
    }))
  );
}

/**
 * Manda un aviso redactado por el dojo.
 *
 * Sin dedupeKey a propósito: si el profesor quiere repetir el mismo aviso,
 * debe poder. En Postgres los NULL no colisionan en el índice único.
 */
export async function sendAnnouncement(params: {
  authorId: number;
  title: string;
  body: string;
  recipientIds: number[];
}) {
  const { authorId, title, body, recipientIds } = params;

  if (recipientIds.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      kind: NotificationKind.AVISO,
      topic: NotificationTopic.GENERAL,
      title,
      body,
      createdById: authorId,
    })),
  });

  return result.count;
}
