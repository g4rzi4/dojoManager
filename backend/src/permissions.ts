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
 *
 * OJO: hay accesos que NO se resuelven con permisos, porque dependen de a
 * quién pertenece el dato. El alumno viendo su expediente y el tutor viendo
 * el de sus hijos se verifican comparando contra el token, en
 * routes/students.routes.ts. Un permiso no puede expresar "solo los míos".
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
  /// Redactar avisos y mandarlos a otros usuarios.
  | "notifications:send"
  /// Ver todos los dojos y sumarles administradores. Solo el superadministrador.
  | "platform:manage"
  /// Consultar lo propio: su expediente, sus pagos, sus notificaciones.
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
  "notifications:send",
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
  "notifications:send",
  "self:read",
];

/**
 * El tutor no administra nada del dojo. Ve el calendario y, por la relación
 * StudentGuardian, los expedientes y pagos de los alumnos a su cargo.
 *
 * Nota que NO tiene students:read ni payments:read: esos permisos dan acceso
 * a TODOS los alumnos. El acceso a sus hijos se resuelve por relación.
 */
const TUTOR_PERMISSIONS: Permission[] = ["events:read", "self:read"];

/** El alumno ve el calendario del dojo y sus propios datos. */
const ALUMNO_PERMISSIONS: Permission[] = ["events:read", "self:read"];

/**
 * El superadministrador administra la plataforma, no los dojos: a propósito
 * no tiene students:read ni payments:read, y su cuenta no es de ningún dojo
 * real, así que no ve datos de alumnos.
 */
const SUPERADMIN_PERMISSIONS: Permission[] = [
  "platform:manage",
  "self:read",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPERADMIN]: SUPERADMIN_PERMISSIONS,
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.PROFESOR]: PROFESOR_PERMISSIONS,
  [Role.TUTOR]: TUTOR_PERMISSIONS,
  [Role.ALUMNO]: ALUMNO_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
