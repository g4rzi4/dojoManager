import { prisma } from "./prisma";
import { Role } from "../generated/prisma/enums";
import type { AuthUser } from "../middleware/auth";

/**
 * Qué alumnos puede ver cada usuario.
 *
 * Un permiso como students:read dice "puede leer alumnos", pero no CUÁLES.
 * Este archivo resuelve el alcance, que es lo que distingue los cuatro roles:
 *
 *   ADMIN     todos los alumnos del dojo
 *   PROFESOR  solo los que tiene asignados (Student.teacherId)
 *   TUTOR     solo los alumnos a su cargo (StudentGuardian)
 *   ALUMNO    solo su propio expediente
 *
 * Toda consulta que devuelva alumnos, pagos, asistencia o historial debe
 * filtrarse con esto. Si no, un profesor vería a los alumnos de otro.
 */

/** "todos" significa sin filtro; un arreglo, los ids permitidos. */
export type StudentScope = number[] | "todos";

/**
 * Alumnos ligados al usuario por lazo familiar: su propio expediente si es
 * ALUMNO, sus hijos si es TUTOR.
 *
 * Es lo que alimenta el panel familiar. Devuelve [] para admin y profesores,
 * que no tienen hijos en el dojo por el hecho de trabajar ahí.
 */
export async function familyStudentIds(user: AuthUser): Promise<number[]> {
  if (user.role === Role.ALUMNO) {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return student ? [student.id] : [];
  }

  if (user.role === Role.TUTOR) {
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: user.id },
      select: { studentId: true },
    });

    return links.map((l) => l.studentId);
  }

  return [];
}

/** El alcance completo de lectura del usuario, según su rol. */
export async function visibleStudentIds(
  user: AuthUser
): Promise<StudentScope> {
  if (user.role === Role.ADMIN) {
    return "todos";
  }

  if (user.role === Role.PROFESOR) {
    const asignados = await prisma.student.findMany({
      where: { teacherId: user.id },
      select: { id: true },
    });

    return asignados.map((s) => s.id);
  }

  return familyStudentIds(user);
}

/** ¿Puede este usuario consultar el expediente de este alumno? */
export async function canViewStudent(
  user: AuthUser,
  studentId: number
): Promise<boolean> {
  const scope = await visibleStudentIds(user);

  if (scope !== "todos") return scope.includes(studentId);

  // "Todos" son los de su dojo. Hay que preguntarlo: este id viene de la
  // petición y podría ser de un alumno de otro dojo.
  return (await prisma.student.count({ where: { id: studentId } })) > 0;
}

/**
 * ¿Puede este usuario MODIFICAR a este alumno?
 *
 * Además de estar en su alcance, hace falta el permiso de escritura: un
 * tutor ve el expediente de su hijo pero no lo edita.
 */
export async function canManageStudent(
  user: AuthUser,
  studentId: number
): Promise<boolean> {
  if (user.role !== Role.ADMIN && user.role !== Role.PROFESOR) {
    return false;
  }

  return canViewStudent(user, studentId);
}

/**
 * Convierte un alcance en el filtro de Prisma correspondiente.
 *
 * Devuelve undefined para "todos" (sin filtro). Para un arreglo vacío
 * devuelve un filtro imposible, no undefined: ese detalle importa, porque
 * confundirlos haría que un profesor sin alumnos viera a TODOS.
 */
export function scopeToStudentFilter(
  scope: StudentScope
): { id: { in: number[] } } | undefined {
  if (scope === "todos") return undefined;

  return { id: { in: scope } };
}

/** Igual que el anterior, pero para tablas que apuntan a un alumno. */
export function scopeToStudentIdFilter(
  scope: StudentScope
): { studentId: { in: number[] } } | undefined {
  if (scope === "todos") return undefined;

  return { studentId: { in: scope } };
}
