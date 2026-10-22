import type { Permission, SessionUser } from "../types/user";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Devuelve el usuario de la sesión actual, o null si no hay sesión.
 *
 * Lee de localStorage, que puede traer basura de una versión anterior de la
 * app o de alguien editándolo a mano, así que validamos la forma mínima.
 */
export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;

    if (
      typeof parsed?.name !== "string" ||
      typeof parsed?.role !== "string" ||
      !Array.isArray(parsed?.permissions)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * ¿El usuario tiene este permiso?
 *
 * Solo para decidir qué se muestra en pantalla. La autorización real la
 * aplica el backend en cada petición: ocultar un botón no protege nada,
 * porque cualquiera puede llamar a la API directamente.
 */
export function can(
  user: SessionUser | null,
  permission: Permission
): boolean {
  return user?.permissions.includes(permission) ?? false;
}

/** A dónde mandar al usuario después de iniciar sesión, según su rol. */
export function homePathFor(user: SessionUser): string {
  // Alumno y tutor comparten el panel familiar; el backend decide cuántos
  // expedientes trae ese panel.
  if (user.role === "ALUMNO" || user.role === "TUTOR") {
    return "/inicio";
  }

  return "/dashboard";
}
