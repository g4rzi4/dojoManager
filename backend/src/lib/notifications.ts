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

/** Llamar cuando un alumno reporta el pago de un evento. Avisa al profesor. */
export async function notifyEventPaymentReported(
  enrollmentId: number,
  teacherUserId: number,
  eventTitle: string,
  amountCents: number
) {
  const monto = (amountCents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return createAutomatic([
    {
      userId: teacherUserId,
      topic: NotificationTopic.PAGO,
      title: "Pago de evento por confirmar",
      body: `Un alumno reportó un pago de ${monto} para "${eventTitle}". Confírmalo para inscribirlo.`,
      link: "/eventos",
      dedupeKey: `cobro-evento-reportado-${enrollmentId}`,
    },
  ]);
}

/**
 * Llamar cuando el profesor inscribe a un alumno en un evento.
 *
 * Le dice al alumno y a sus tutores EN QUÉ MODALIDADES va y cuánto debe
 * pagar, que es justo lo que necesitan saber para ir a pagar.
 */
export async function notifyEnrolledByTeacher(
  enrollmentId: number,
  studentId: number,
  eventTitle: string,
  modalidades: string[],
  amountCents: number,
  categoria: string | null
) {
  const destinatarios = await audienceForStudent(studentId);

  const monto = (amountCents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  const lista = modalidades.length > 0 ? modalidades.join(" y ") : "el evento";

  return createAutomatic(
    destinatarios.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: `Te inscribieron en ${eventTitle}`,
      body: `Participas en ${lista}${
        categoria ? ` · ${categoria}` : ""
      }. Son ${monto}. Quedarás inscrito en cuanto tu profesor confirme el pago.`,
      link: "/eventos",
      dedupeKey: `inscripcion-profesor-${enrollmentId}-${userId}`,
    }))
  );
}

/** Llamar al confirmar o rechazar el pago. Avisa al alumno y a sus tutores. */
export async function notifyEventPaymentResolved(
  enrollmentId: number,
  studentId: number,
  confirmado: boolean,
  eventTitle?: string,
  modalidades: string[] = []
) {
  const destinatarios = await audienceForStudent(studentId);

  // Repetir en qué modalidades va: es el dato que la familia necesita el
  // día del torneo, y no tienen por qué recordar lo que eligieron.
  const detalle =
    modalidades.length > 0 ? ` Participa en ${modalidades.join(" y ")}.` : "";

  const evento = eventTitle ? ` de ${eventTitle}` : " del evento";

  return createAutomatic(
    destinatarios.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: confirmado ? "Inscripción confirmada" : "Pago rechazado",
      body: confirmado
        ? `Tu profesor confirmó el pago${evento} y ya quedaste inscrito.${detalle}`
        : `Tu profesor no pudo confirmar el pago${evento}. Acércate con él.`,
      link: "/eventos",
      dedupeKey: `cobro-evento-${confirmado ? "ok" : "no"}-${enrollmentId}-${userId}`,
    }))
  );
}

/**
 * Llamar cuando un evento se paga con PayPal. Ahí no confirma el profesor: el
 * pago ya está verificado, así que se avisa a la familia y a él.
 */
export async function notifyEventPaidOnline(
  enrollmentId: number,
  studentId: number,
  teacherUserId: number | null,
  eventTitle: string,
  modalidades: string[],
  amountCents: number
) {
  const familia = await audienceForStudent(studentId);

  const monto = (amountCents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  const detalle =
    modalidades.length > 0 ? ` Participa en ${modalidades.join(" y ")}.` : "";

  return createAutomatic([
    ...familia.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: "Inscripción confirmada",
      body: `Recibimos tu pago de ${monto} con PayPal para "${eventTitle}" y ya quedaste inscrito.${detalle}`,
      link: "/eventos",
      dedupeKey: `cobro-evento-paypal-${enrollmentId}-${userId}`,
    })),
    ...(teacherUserId === null
      ? []
      : [
          {
            userId: teacherUserId,
            topic: NotificationTopic.PAGO,
            title: "Pago con PayPal recibido",
            body: `Un alumno pagó ${monto} con PayPal para "${eventTitle}". Ya quedó inscrito; no tienes que confirmar nada.`,
            link: "/eventos",
            dedupeKey: `cobro-evento-paypal-profesor-${enrollmentId}`,
          },
        ]),
  ]);
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
