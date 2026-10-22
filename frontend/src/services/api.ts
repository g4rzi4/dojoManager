import type { SessionUser } from "../types/user";
import type { StudentCard, StudentListItem } from "../types/student";
import type { MyStudent, PaymentsResponse } from "../types/payment";
import type { AppNotification, Audience } from "../types/notification";
import type { DojoEvent, EventCategory } from "../types/event";
import type { Teacher } from "../types/teacher";
import { clearSession, getToken } from "./session";

const API_URL = "http://localhost:3000";

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

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; token: string; user: SessionUser }> {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
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
// Eventos
// ---------------------------------------------------------------------------

export async function createEvent(params: {
  title: string;
  date: string;
  time?: string;
  category: EventCategory;
}): Promise<{ event: DojoEvent }> {
  return request("/events", { method: "POST", body: params });
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${id}`, { method: "DELETE" });
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
