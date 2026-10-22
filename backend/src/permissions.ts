import { Role } from "./generated/prisma/enums";

/**
 * Permisos del sistema, en formato "recurso:acción".
 *
 * Esta matriz es la ÚNICA fuente de verdad. El frontend no la duplica: al
 * iniciar sesión el backend le manda la lista ya resuelta del usuario, y la
 * usa solo para decidir qué menús mostrar.
 *
 * Eso es cosmético. Quien autoriza de verdad es este archivo, vía
 * requirePermission en cada ruta, porque el frontend se puede manipular
 * desde el navegador. Nunca confíes en que el menú estaba oculto.
 *
 * Si agregas un permiso, agrégalo al tipo Permission del frontend
 * (frontend/src/types/user.ts) para mantener el autocompletado.
 */
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
  /// El alumno consultando su propia tarjeta, y nada más.
  | "self:read";

const ADMIN_PERMISSIONS: Permission[] = [
  "students:read",
  "students:write",
  "events:read",
  "events:write",
  "payments:read",
  "payments:write",
  "reports:read",
  "teachers:read",
  "teachers:write",
  "settings:write",
  "self:read",
];

/**
 * El profesor es subadministrador: puede todo menos administrar profesores
 * y la configuración del dojo.
 */
const PROFESOR_PERMISSIONS: Permission[] = [
  "students:read",
  "students:write",
  "events:read",
  "events:write",
  "payments:read",
  "payments:write",
  "reports:read",
  "self:read",
];

const ALUMNO_PERMISSIONS: Permission[] = ["self:read"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.PROFESOR]: PROFESOR_PERMISSIONS,
  [Role.ALUMNO]: ALUMNO_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
