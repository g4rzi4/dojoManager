export type Role = "ADMIN" | "PROFESOR" | "ALUMNO";

export type Permission =
  | "students:read"
  | "students:write"
  | "events:read"
  | "events:write"
  | "payments:read"
  | "payments:write"
  | "reports:read"
  | "teachers:read"
  | "teachers:write"
  | "settings:write"
  | "self:read";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  /** Expediente del alumno, si esta cuenta es de un alumno. */
  studentId: number | null;
  /**
   * Permisos que envió el backend al iniciar sesión.
   *
   * No duplicamos la matriz de roles en el frontend a propósito: el backend
   * es la única fuente de verdad y manda la lista ya resuelta. Aquí solo se
   * usa para decidir qué menús mostrar; la autorización real la aplica el
   * servidor en cada petición.
   */
  permissions: Permission[];
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  PROFESOR: "Profesor",
  ALUMNO: "Alumno",
};
