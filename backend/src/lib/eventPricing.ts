import { prisma } from "./prisma";

/**
 * Qué precio se cobra por cada modalidad.
 *
 * El administrador fija el precio BASE del evento. Cada profesor puede
 * ajustarlo para SUS alumnos sin afectar a los demás grupos: un profesor
 * que no ajusta nada cobra el base.
 *
 * Qué lista aplica lo decide el profesor al que se acredita el cobro, que
 * es quien recibe el dinero:
 *
 *   - El alumno escribe una clave al reportar  -> la del dueño de esa clave
 *   - El profesor inscribe a su alumno         -> la suya
 */

export type ModalidadConPrecio = {
  id: number;
  name: string;
  /** El que se cobra a este profesor. */
  priceCents: number;
  /** El que fijó el administrador. */
  basePriceCents: number;
  /** Verdadero si el profesor tiene su propio precio. */
  personalizado: boolean;
};

type ModalidadBase = { id: number; name: string; priceCents: number };

/**
 * Aplica los ajustes de un profesor sobre la lista base de modalidades.
 *
 * Con teacherId nulo devuelve los precios base, que es lo que ve el
 * administrador y lo que se usa cuando no hay profesor de por medio.
 */
export async function preciosParaProfesor(
  modalidades: ModalidadBase[],
  teacherId: number | null
): Promise<ModalidadConPrecio[]> {
  if (modalidades.length === 0) return [];

  const ajustes =
    teacherId === null
      ? []
      : await prisma.teacherModalityPrice.findMany({
          where: {
            teacherId,
            modalityId: { in: modalidades.map((m) => m.id) },
          },
          select: { modalityId: true, priceCents: true },
        });

  const porModalidad = new Map(
    ajustes.map((a) => [a.modalityId, a.priceCents])
  );

  return modalidades.map((m) => {
    const propio = porModalidad.get(m.id);

    return {
      id: m.id,
      name: m.name,
      priceCents: propio ?? m.priceCents,
      basePriceCents: m.priceCents,
      personalizado: propio !== undefined,
    };
  });
}

/**
 * El profesor cuyos precios le tocan a un alumno.
 *
 * Es el que lo tiene asignado. Sirve para que la familia vea en pantalla lo
 * que realmente va a pagar, antes de escribir ninguna clave.
 */
export async function profesorDeAlumno(
  studentId: number
): Promise<number | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { teacherId: true },
  });

  return student?.teacherId ?? null;
}
