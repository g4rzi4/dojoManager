import type { SessionUser } from "../types/user";
import type { StudentCard, StudentListItem } from "../types/student";
import type { MyStudent, PaymentsResponse } from "../types/payment";
import type { AppNotification, Audience } from "../types/notification";
import type { DojoEvent, EventCategory } from "../types/event";
import type { Teacher, TeacherCard, TeacherUpdate } from "../types/teacher";
import type { CategoryCatalog, EventEnrollment } from "../types/eventPayment";
import type {
  EnrollGuardianPayload,
  EnrollStudentPayload,
  InvitationKind,
  InvitationRow,
  NewInvitation,
  PublicInvitation,
} from "../types/invitation";
import type {
  EquipmentProduct,
  EquipmentRequest,
  NewEquipmentItem,
} from "../types/equipment";
import type { DojoClass, NewDojoClass } from "../types/dojoClass";
import { clearSession, getToken } from "./session";

/**
 * Dirección del backend.
 *
 * Configurable porque "localhost" solo funciona dentro de la computadora. Al
 * abrir la app desde un celular —por ejemplo escaneando un QR de
 * inscripción— hay que apuntar a la IP de red local. Ver frontend/.env.example.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** Error de la API con su código HTTP, para distinguir 403 de 404. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  /** Si es false, no manda el token (para el login). */
  auth?: boolean;
};

async function request<T>(
  path: string,
  { method = "GET", body, auth = true }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch solo rechaza por fallo de red, no por códigos 4xx/5xx.
    throw new ApiError(0, "No fue posible conectar con el servidor.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // El token expiró o es inválido: borramos la sesión para que la app
    // deje de intentar usarlo y el guard mande al login.
    if (response.status === 401 && auth) {
      clearSession();
    }

    throw new ApiError(
      response.status,
      data?.message ?? "Ocurrió un error inesperado."
    );
  }

  return data as T;
}

/**
 * Inicia sesión.
 *
 * `teacherCode` es el tercer factor de los profesores. Si la cuenta es de
 * profesor y no coincide, el backend responde con el MISMO mensaje que una
 * contraseña incorrecta, a propósito: decir "falta la clave" le confirmaría
 * a quien ya robó una contraseña que solo le falta ese dato.
 */
export async function login(
  email: string,
  password: string,
  teacherCode?: string
): Promise<{ success: boolean; token: string; user: SessionUser }> {
  return request("/auth/login", {
    method: "POST",
    body: { email, password, teacherCode },
    auth: false,
  });
}

export async function getMe(): Promise<{ user: SessionUser }> {
  return request("/auth/me");
}

export async function getStudents(): Promise<StudentListItem[]> {
  const data = await request<{ students: StudentListItem[] }>("/students");
  return data.students;
}

/** La tarjeta de un alumno. Pasa "me" para la del alumno con sesión abierta. */
export async function getStudentCard(
  id: number | "me"
): Promise<StudentCard> {
  const data = await request<{ student: StudentCard }>(`/students/${id}`);
  return data.student;
}

/**
 * Los alumnos que puede consultar quien tiene la sesión: su propio
 * expediente si es alumno, sus hijos si es tutor.
 *
 * No recibe parámetros a propósito: el backend resuelve el alcance desde el
 * token, así nadie puede pedir los hijos de otra familia.
 */
export async function getMyStudents(): Promise<MyStudent[]> {
  const data = await request<{ students: MyStudent[] }>("/students/mine");
  return data.students;
}

export async function getEvents(): Promise<DojoEvent[]> {
  const data = await request<{ events: DojoEvent[] }>("/events");
  return data.events;
}

export async function getPayments(): Promise<PaymentsResponse> {
  return request<PaymentsResponse>("/payments");
}

export async function getPayPalConfig(): Promise<{
  enabled: boolean;
  clientId: string | null;
  currency: string;
}> {
  return request("/paypal/config");
}

/** Solo indica qué cobro se paga: el monto lo decide el backend. */
export async function createPayPalOrder(
  tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO",
  id: number
): Promise<{ orderId: string }> {
  return request("/paypal/orders", { method: "POST", body: { tipo, id } });
}

/** Avisa que se pagó fuera de línea. No lo marca como pagado. */
export async function reportCharge(
  tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO",
  id: number,
  method: "EFECTIVO" | "TRANSFERENCIA"
): Promise<{ message: string }> {
  return request(`/payments/${tipo}/${id}/report`, {
    method: "POST",
    body: { method },
  });
}

/** El admin o el profesor confirman si recibieron el pago reportado. */
export async function resolveCharge(
  tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO",
  id: number,
  confirmar: boolean
): Promise<{ message: string }> {
  return request(`/payments/${tipo}/${id}/resolve`, {
    method: "POST",
    body: { confirmar },
  });
}

export async function getClasses(): Promise<DojoClass[]> {
  const data = await request<{ classes: DojoClass[] }>("/classes");
  return data.classes;
}

export async function createClass(clase: NewDojoClass): Promise<DojoClass> {
  const data = await request<{ class: DojoClass }>("/classes", {
    method: "POST",
    body: clase,
  });
  return data.class;
}

export async function deleteClass(id: number): Promise<void> {
  await request(`/classes/${id}`, { method: "DELETE" });
}

export async function getEquipmentCatalog(): Promise<EquipmentProduct[]> {
  const data = await request<{ products: EquipmentProduct[] }>(
    "/equipment/catalog"
  );
  return data.products;
}

export async function getEquipmentRequests(): Promise<EquipmentRequest[]> {
  const data = await request<{ requests: EquipmentRequest[] }>(
    "/equipment/requests"
  );
  return data.requests;
}

/** No manda precios: el backend los toma del modelo elegido. */
export async function createEquipmentRequest(params: {
  studentId: number;
  items: NewEquipmentItem[];
  note?: string;
}): Promise<{ message: string }> {
  return request("/equipment/requests", { method: "POST", body: params });
}

export async function updateEquipmentRequest(
  id: number,
  body: {
    accion: "confirmar" | "rechazar" | "pagado" | "entregado";
    prices?: { itemId: number; priceCents: number }[];
    method?: "EFECTIVO" | "TRANSFERENCIA";
    staffNote?: string;
  }
): Promise<{ message: string }> {
  return request(`/equipment/requests/${id}`, { method: "PATCH", body });
}

export async function capturePayPalOrder(
  orderId: string
): Promise<{ message: string }> {
  return request(`/paypal/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
  });
}

export async function getNotifications(): Promise<{
  unread: number;
  notifications: AppNotification[];
}> {
  return request("/notifications");
}

export async function markNotificationRead(id: number): Promise<void> {
  await request(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request("/notifications/read-all", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Profesores (solo administrador)
// ---------------------------------------------------------------------------

export async function getTeachers(): Promise<Teacher[]> {
  const data = await request<{ teachers: Teacher[] }>("/teachers");
  return data.teachers;
}

/** Registra un profesor. El backend le genera su clave única. */
export async function createTeacher(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ teacher: Teacher }> {
  return request("/teachers", { method: "POST", body: params });
}

/** La ficha del profesor. La ve el admin, y cada profesor la suya. */
export async function getTeacherCard(id: number): Promise<{
  teacher: TeacherCard;
  puedeVerNotasAdmin: boolean;
}> {
  return request(`/teachers/${id}`);
}

export async function updateTeacher(
  id: number,
  cambios: TeacherUpdate
): Promise<void> {
  await request(`/teachers/${id}`, { method: "PATCH", body: cambios });
}

export async function setTeacherActive(
  id: number,
  active: boolean
): Promise<void> {
  await request(`/teachers/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
}

// ---------------------------------------------------------------------------
// Alumnos y tutores
// ---------------------------------------------------------------------------

export async function createStudent(params: {
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  medicalNotes?: string;
  /** Clave del profesor al que queda asignado. */
  teacherCode?: string;
}): Promise<{ student: { id: number } }> {
  return request("/students", { method: "POST", body: params });
}

/**
 * Edita la ficha de un alumno. Admin y profesores, cada profesor sobre los
 * alumnos de su grupo.
 *
 * Solo se mandan los campos que cambian.
 */
export async function updateStudent(
  id: number,
  cambios: {
    firstName?: string;
    lastName?: string;
    birthDate?: string | null;
    phone?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    medicalNotes?: string | null;
    currentBelt?: string;
    active?: boolean;
    /** Reasignar de profesor. Solo el admin puede pasarlo a otro. */
    teacherCode?: string | null;
  }
): Promise<{ message: string }> {
  return request(`/students/${id}`, { method: "PATCH", body: cambios });
}

/** Da de baja a un alumno. Es baja lógica: conserva su historial. */
export async function deactivateStudent(id: number): Promise<void> {
  await request(`/students/${id}`, { method: "DELETE" });
}

/**
 * Registra un tutor y lo liga a un alumno. Si el correo ya pertenece a un
 * tutor existente, solo lo liga (caso de la madre con un segundo hijo).
 */
export async function createGuardian(params: {
  studentId: number;
  email: string;
  name?: string;
  password?: string;
  relationship?: "MADRE" | "PADRE" | "TUTOR";
  isPrimary?: boolean;
}): Promise<{ cuentaCreada: boolean; message: string }> {
  return request("/guardians", { method: "POST", body: params });
}

export async function unlinkGuardian(
  studentId: number,
  guardianId: number
): Promise<void> {
  await request(`/guardians/${studentId}/${guardianId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Invitaciones de inscripción
// ---------------------------------------------------------------------------

/** Genera una invitación. Devuelve el enlace que se vuelve QR. */
export async function createInvitation(params: {
  kind: InvitationKind;
  /** Para ligar el tutor a un alumno que ya existe. */
  studentId?: number;
  note?: string;
}): Promise<{ invitation: NewInvitation }> {
  return request("/invitations", { method: "POST", body: params });
}

export async function getInvitations(): Promise<InvitationRow[]> {
  const data = await request<{ invitations: InvitationRow[] }>("/invitations");
  return data.invitations;
}

export async function revokeInvitation(id: number): Promise<void> {
  await request(`/invitations/${id}`, { method: "DELETE" });
}

/**
 * Lee una invitación por su token. Sin sesión: la llama quien abre el enlace.
 *
 * `auth: false` es importante. Si mandara el token de quien tenga sesión
 * abierta en ese navegador, el formulario se comportaría distinto según
 * quién lo abra.
 */
export async function getPublicInvitation(
  token: string
): Promise<PublicInvitation> {
  const data = await request<{ invitation: PublicInvitation }>(
    `/invitations/public/${token}`,
    { auth: false }
  );
  return data.invitation;
}

/** Envía el formulario de inscripción. Sin sesión. */
export async function submitEnrollment(
  token: string,
  payload: EnrollStudentPayload | EnrollGuardianPayload
): Promise<{ message: string }> {
  return request(`/invitations/public/${token}`, {
    method: "POST",
    body: payload,
    auth: false,
  });
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export async function createEvent(params: {
  title: string;
  date: string;
  time?: string;
  category: EventCategory;
  /** Si hay que pagar para participar. */
  requiresPayment?: boolean;
  /** Costo en CENTAVOS. Se usa solo si el evento NO tiene modalidades. */
  priceCents?: number;
  /** Modalidades con su costo. Si hay, el total es la suma de las elegidas. */
  modalities?: { name: string; priceCents: number }[];
}): Promise<{ event: DojoEvent }> {
  return request("/events", { method: "POST", body: params });
}

/**
 * Edita un evento, incluidos los costos por modalidad.
 *
 * Las modalidades con `id` se actualizan, las que no lo traen se crean, y
 * las que faltan en la lista se borran. El backend rechaza borrar una que ya
 * tenga alumnos inscritos.
 */
export async function updateEvent(
  id: string,
  cambios: {
    title?: string;
    date?: string;
    time?: string | null;
    category?: EventCategory;
    requiresPayment?: boolean;
    priceCents?: number | null;
    modalities?: { id?: number; name: string; priceCents: number }[];
  }
): Promise<{ message: string }> {
  return request(`/events/${id}`, { method: "PATCH", body: cambios });
}

/**
 * El profesor inscribe a uno de sus alumnos, eligiendo sus modalidades.
 *
 * La inscripción nace sin pagar: al alumno y a sus tutores les llega la
 * notificación con lo que deben, y quedan inscritos cuando el profesor
 * confirme el pago.
 */
export async function enrollStudentInEvent(
  eventId: string,
  params: {
    studentId: number;
    modalityIds?: number[];
    gender?: string;
    beltClass?: string;
    ageCategory?: string;
    note?: string;
  }
): Promise<{ message: string }> {
  return request(`/events/${eventId}/enroll`, {
    method: "POST",
    body: params,
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${id}`, { method: "DELETE" });
}

/**
 * El alumno o tutor reporta que ya pagó un evento, con la clave del profesor.
 *
 * No manda el id del profesor: escribe la clave y el servidor la resuelve.
 * Si mandara un id, cualquiera podría acreditar cobros a un profesor que
 * nunca vio el dinero.
 */
export async function reportEventPayment(
  eventId: string,
  params: {
    teacherCode: string;
    studentId?: number;
    /** Modalidades elegidas. Obligatorio si el evento tiene modalidades. */
    modalityIds?: number[];
    /** Los tres van juntos o ninguno. */
    gender?: string;
    beltClass?: string;
    ageCategory?: string;
    method?: string;
    note?: string;
  }
): Promise<{ message: string }> {
  return request(`/events/${eventId}/report-payment`, {
    method: "POST",
    body: params,
  });
}

/**
 * El catálogo de categorías de competencia, con sus rangos de edad.
 *
 * Lo sirve el backend para no duplicar la tabla en el frontend.
 */
export async function getCategoryCatalog(): Promise<CategoryCatalog> {
  return request<CategoryCatalog & { success: boolean }>("/events/categories");
}

/** Los reportes de pago de un evento. El profesor ve los de su clave. */
export async function getEventEnrollments(eventId: string): Promise<{
  alcance: "todos" | "mi-clave";
  enrollments: EventEnrollment[];
}> {
  return request(`/events/${eventId}/enrollments`);
}

/** Confirma o rechaza un pago. Confirmar inscribe al alumno. */
export async function resolveEventPayment(
  eventId: string,
  enrollmentId: number,
  confirmar: boolean
): Promise<{ message: string }> {
  return request(`/events/${eventId}/enrollments/${enrollmentId}`, {
    method: "PATCH",
    body: { confirmar },
  });
}

/** Manda un aviso del dojo. Requiere el permiso notifications:send. */
export async function sendAnnouncement(params: {
  title: string;
  body: string;
  audience: Audience;
}): Promise<{ enviadas: number }> {
  return request("/notifications/announcements", {
    method: "POST",
    body: params,
  });
}
