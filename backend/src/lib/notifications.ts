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

/** Destinatarios de una solicitud: su profesor o, si no tiene, los administradores. */
async function responsablesDeEquipo(teacherId: number | null): Promise<number[]> {
  if (teacherId !== null) return [teacherId];

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true },
  });

  return admins.map((a) => a.id);
}

/** Llamar cuando una familia solicita equipo. */
export async function notifyEquipmentRequested(
  requestId: number,
  teacherId: number | null,
  studentName: string,
  piezas: number
) {
  const responsables = await responsablesDeEquipo(teacherId);

  return createAutomatic(
    responsables.map((userId) => ({
      userId,
      topic: NotificationTopic.GENERAL,
      title: "Nueva solicitud de equipo",
      body: `Se solicitaron ${piezas} ${piezas === 1 ? "pieza" : "piezas"} para ${studentName}. Confirma disponibilidad y precio.`,
      link: "/uniformes",
      dedupeKey: `equipo-solicitado-${requestId}-${userId}`,
    }))
  );
}

/** Llamar cuando cambia el estado de una solicitud. Avisa a la familia. */
export async function notifyEquipmentUpdated(
  requestId: number,
  studentId: number,
  estado: "CONFIRMADO" | "RECHAZADO" | "PAGADO" | "ENTREGADO",
  amountCents: number | null
) {
  const familia = await audienceForStudent(studentId);

  const monto =
    amountCents === null
      ? ""
      : (amountCents / 100).toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        });

  const texto = {
    CONFIRMADO: ["Tu equipo está listo para pagarse", `Tu profesor confirmó la solicitud por ${monto}. Ya puedes pagarla.`],
    RECHAZADO: ["No se pudo surtir tu solicitud", "Tu profesor no pudo surtir la solicitud de equipo. Acércate con él."],
    PAGADO: ["Recibimos tu pago de equipo", `Tu pago de ${monto} quedó registrado. Te avisaremos cuando se entregue.`],
    ENTREGADO: ["Tu equipo fue entregado", "Tu profesor marcó la solicitud como entregada."],
  }[estado];

  return createAutomatic(
    familia.map((userId) => ({
      userId,
      topic: estado === "PAGADO" ? NotificationTopic.PAGO : NotificationTopic.GENERAL,
      title: texto[0],
      body: texto[1],
      link: "/uniformes",
      dedupeKey: `equipo-${estado.toLowerCase()}-${requestId}-${userId}`,
    }))
  );
}

/** Llamar cuando el equipo se paga con PayPal. Avisa a quien debe entregarlo. */
export async function notifyEquipmentPaidOnline(
  requestId: number,
  teacherId: number | null,
  amountCents: number
) {
  const responsables = await responsablesDeEquipo(teacherId);

  const monto = (amountCents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return createAutomatic(
    responsables.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: "Equipo pagado con PayPal",
      body: `Se pagó una solicitud de equipo por ${monto}. Ya puedes entregarla.`,
      link: "/uniformes",
      dedupeKey: `equipo-paypal-${requestId}-${userId}`,
    }))
  );
}

/** Llamar cuando una familia reporta un pago en efectivo o transferencia. */
export async function notifyChargeReported(
  clave: string,
  responsableId: number | null,
  concepto: string,
  amountCents: number | null,
  metodo: string
) {
  const responsables = await responsablesDeEquipo(responsableId);

  const monto =
    amountCents === null
      ? ""
      : ` de ${(amountCents / 100).toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}`;

  return createAutomatic(
    responsables.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: "Pago por confirmar",
      body: `Una familia reportó un pago${monto} por ${metodo} de "${concepto}". Confírmalo cuando lo recibas.`,
      link: "/pagos",
      // Con la hora: si se rechaza, la familia puede volver a reportarlo.
      dedupeKey: `cobro-reportado-${clave}-${userId}-${Date.now()}`,
    }))
  );
}

/** Llamar al confirmar o rechazar un pago reportado. Avisa a la familia. */
export async function notifyChargeResolved(
  clave: string,
  studentId: number,
  concepto: string,
  confirmado: boolean
) {
  const familia = await audienceForStudent(studentId);

  return createAutomatic(
    familia.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: confirmado ? "Pago confirmado" : "Pago no confirmado",
      body: confirmado
        ? `Se confirmó tu pago de "${concepto}".`
        : `No se pudo confirmar tu pago de "${concepto}". Acércate con tu profesor.`,
      link: "/pagos",
      dedupeKey: `cobro-resuelto-${clave}-${userId}-${Date.now()}`,
    }))
  );
}

/**
 * Llamar al enviar un recordatorio de pago aprobado desde el asistente de
 * cobranza. Llega al alumno y a sus tutores. Devuelve a cuántos les llegó.
 */
export async function notifyPaymentReminder(
  studentId: number,
  mensaje: string
): Promise<number> {
  const destinatarios = await audienceForStudent(studentId);
  const ahora = Date.now();

  await createAutomatic(
    destinatarios.map((userId) => ({
      userId,
      topic: NotificationTopic.PAGO,
      title: "Recordatorio de pago",
      body: mensaje,
      link: "/pagos",
      // Con la hora: el dojo puede volver a recordar el mismo adeudo.
      dedupeKey: `recordatorio-${studentId}-${userId}-${ahora}`,
    }))
  );

  return destinatarios.length;
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
