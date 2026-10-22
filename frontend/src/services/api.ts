import type { SessionUser } from "../types/user";
import type { StudentCard, StudentListItem } from "../types/student";
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
