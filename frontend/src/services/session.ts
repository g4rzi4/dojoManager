export type SessionUser = {
  id: number;
  name: string;
  email: string;
};

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
 * Lee de localStorage, que puede contener basura de una versión anterior de
 * la app o de alguien editándolo a mano, así que el parseo va en try/catch.
 */
export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (typeof parsed?.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
