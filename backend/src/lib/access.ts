import { prisma } from "./prisma";
import { can } from "../permissions";
import type { AuthUser } from "../middleware/auth";

/**
 * Accesos que dependen de A QUIÉN pertenece el dato, no de un permiso.
 *
 * Un permiso como students:read es "todos los alumnos". Esto resuelve el otro
 * caso: "solo los míos", que es lo que necesitan el alumno y el tutor.
 */

/**
 * Ids de los alumnos que este usuario puede consultar por relación propia:
 * su propio expediente si es ALUMNO, los alumnos a su cargo si es TUTOR.
 *
 * Devuelve [] para admin y profesores: ellos no pasan por aquí, entran por
 * el permiso students:read.
 */
export async function ownStudentIds(user: AuthUser): Promise<number[]> {
  if (user.role === "ALUMNO") {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return student ? [student.id] : [];
  }

  if (user.role === "TUTOR") {
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: user.id },
      select: { studentId: true },
    });

    return links.map((l) => l.studentId);
  }

  return [];
}

/**
 * ¿Puede este usuario ver el expediente de este alumno?
 *
 * Verdadero si tiene students:read (admin, profesor) o si el alumno es suyo
 * (su propio expediente, o un hijo a su cargo).
 */
export async function canViewStudent(
  user: AuthUser,
  studentId: number
): Promise<boolean> {
  if (can(user.role, "students:read")) {
    return true;
  }

  const propios = await ownStudentIds(user);
  return propios.includes(studentId);
}
