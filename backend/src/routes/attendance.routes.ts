import { Router } from "express";

import { prisma } from "../lib/prisma";
import { scopeToStudentFilter, visibleStudentIds } from "../lib/access";
import { dateOnly, hoyEnElDojo, parseDateOnly } from "../lib/dates";
import { notifyAbsence } from "../lib/notifications";
import { requireAuth, requirePermission } from "../middleware/auth";

const router = Router();

/** Más registros que esto en un envío no es un grupo: es un error. */
const MAXIMO_POR_ENVIO = 1000;

function fechaLarga(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * GET /attendance?date=AAAA-MM-DD
 *
 * La lista de un día: los alumnos activos del grupo de quien pregunta, con su
 * marca si ya la tienen. `present` es null cuando todavía no se ha pasado lista.
 */
router.get(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const texto = req.query.date ?? hoyEnElDojo();
    const fecha = parseDateOnly(texto);

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: "La fecha debe venir como AAAA-MM-DD.",
      });
    }

    const scope = await visibleStudentIds(req.user!);

    const students = await prisma.student.findMany({
      where: {
        // Un alumno dado de baja no aparece, salvo que ya tenga marca ese
        // día: así se puede consultar y corregir una lista antigua.
        OR: [{ active: true }, { attendance: { some: { date: fecha } } }],
        ...scopeToStudentFilter(scope),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentBelt: true,
        teacher: { select: { name: true } },
        attendance: { where: { date: fecha }, select: { present: true } },
      },
    });

    return res.json({
      success: true,
      date: dateOnly(fecha),
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        currentBelt: s.currentBelt,
        teacherName: s.teacher?.name ?? null,
        present: s.attendance[0]?.present ?? null,
      })),
    });
  }
);

/**
 * PUT /attendance  { date, records: [{ studentId, present }] }
 *
 * Guarda la lista de un día. `present: null` quita la marca, para corregir a
 * quien se marcó por error. A cada falta nueva se le avisa a la familia.
 */
router.put(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const { date, records } = req.body ?? {};
    const fecha = parseDateOnly(date);

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: "La fecha debe venir como AAAA-MM-DD.",
      });
    }

    if (date > hoyEnElDojo()) {
      return res.status(400).json({
        success: false,
        message: "No se puede pasar lista de un día que todavía no llega.",
      });
    }

    const validos =
      Array.isArray(records) &&
      records.length > 0 &&
      records.length <= MAXIMO_POR_ENVIO &&
      records.every(
        (r) =>
          Number.isInteger(r?.studentId) &&
          (r.present === true || r.present === false || r.present === null)
      );

    if (!validos) {
      return res.status(400).json({
        success: false,
        message: "La lista de asistencia no es válida.",
      });
    }

    const lista = records as { studentId: number; present: boolean | null }[];
    const ids = [...new Set(lista.map((r) => r.studentId))];

    if (ids.length !== lista.length) {
      return res.status(400).json({
        success: false,
        message: "Un alumno viene repetido en la lista.",
      });
    }

    // El alcance se comprueba aquí, en el servidor: el cliente podría mandar
    // el id de un alumno de otro grupo.
    const scope = await visibleStudentIds(req.user!);
    const permitidos = await prisma.student.count({
      // Con AND y no con spread: los dos filtros son sobre `id` y uno pisaría
      // al otro, contando al grupo completo en lugar de la lista recibida.
      where: { AND: [{ id: { in: ids } }, scopeToStudentFilter(scope) ?? {}] },
    });

    if (permitidos !== ids.length) {
      return res.status(403).json({
        success: false,
        message: "La lista incluye alumnos que no están en tu grupo.",
      });
    }

    const anteriores = await prisma.attendance.findMany({
      where: { date: fecha, studentId: { in: ids } },
      select: { studentId: true, present: true },
    });
    const marcaAnterior = new Map(
      anteriores.map((a) => [a.studentId, a.present])
    );

    const marcas = lista.filter(
      (r): r is { studentId: number; present: boolean } => r.present !== null
    );
    const sinMarca = lista
      .filter((r) => r.present === null)
      .map((r) => r.studentId);

    const [, ...guardadas] = await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: { date: fecha, studentId: { in: sinMarca } },
      }),
      ...marcas.map((r) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: fecha } },
          create: {
            studentId: r.studentId,
            date: fecha,
            present: r.present,
            recordedById: req.user!.id,
          },
          update: { present: r.present, recordedById: req.user!.id },
        })
      ),
    ]);

    // El aviso va fuera de la transacción: si falla, la lista ya quedó guardada.
    for (const marca of guardadas) {
      if (!marca.present && marcaAnterior.get(marca.studentId) !== false) {
        try {
          await notifyAbsence(marca.id, marca.studentId, fechaLarga(fecha));
        } catch (error) {
          console.error("[asistencia] no se pudo notificar la falta", error);
        }
      }
    }

    return res.json({
      success: true,
      guardadas: marcas.length,
      message: "Asistencia guardada.",
    });
  }
);

export default router;
