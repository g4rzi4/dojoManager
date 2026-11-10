import { Router } from "express";

import { prisma } from "../lib/prisma";
import { marcarMensualidadesVencidas } from "../lib/mensualidades";
import { requireAgentApiKey } from "../middleware/agentAuth";
import { PaymentStatus } from "../generated/prisma/enums";

const router = Router();

// Todas las rutas de /api/agent/* exigen API key para proteger teléfonos y correos
router.use(requireAgentApiKey);

/**
 * Genera la marca de tiempo actual con la zona horaria del dojo (UTC-6).
 * Ejemplo: "2026-11-09T20:30:00-06:00"
 */
function fechaConsultaActual(): string {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const get = (type: string) => partes.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-06:00`;
}

type PagoMoroso = {
  pagoId: number;
  mes: string;
  monto: number;
  estado: string;
};

type AlumnoMoroso = {
  alumnoId: number;
  alumno: string;
  tutor: string | null;
  telefono: string | null;
  email: string | null;
  montoAdeudado: number;
  pagos: PagoMoroso[];
};

/**
 * GET /api/agent/unpaid
 *
 * Devuelve la lista de alumnos con mensualidades pendientes o vencidas,
 * estructurada con el formato exacto acordado por el equipo para el agente de Claude:
 *
 * {
 *   "fechaConsulta": "2026-11-05T09:00:00-06:00",
 *   "totalAlumnos": 2,
 *   "montoTotalAdeudado": 2100,
 *   "alumnos": [
 *     {
 *       "alumnoId": 14,
 *       "alumno": "Sofía Cruz",
 *       "tutor": "Mariana Cruz",
 *       "telefono": "+5215512345678",
 *       "email": "mariana@ejemplo.com",
 *       "montoAdeudado": 1400,
 *       "pagos": [
 *         { "pagoId": 201, "mes": "2026-10", "monto": 700, "estado": "PENDIENTE" },
 *         { "pagoId": 215, "mes": "2026-11", "monto": 700, "estado": "PENDIENTE" }
 *       ]
 *     }
 *   ]
 * }
 */
router.get("/unpaid", async (_req, res) => {
  // Aseguramos que las mensualidades de meses concluidos pasen a VENCIDO
  await marcarMensualidadesVencidas();

  const mensualidades = await prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.PENDIENTE, PaymentStatus.VENCIDO] },
      reportedAt: null, // No cobramos si la familia ya reportó que pagó y está por confirmar
    },
    include: {
      student: {
        include: {
          user: { select: { email: true } },
          guardians: {
            include: {
              guardian: { select: { name: true, email: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
  });

  const alumnosMap = new Map<number, AlumnoMoroso>();

  for (const m of mensualidades) {
    const s = m.student;
    let alumnoEntry = alumnosMap.get(s.id);

    if (!alumnoEntry) {
      // Determinamos el contacto del tutor o del alumno si no tiene tutor
      const primaryGuardianRel =
        s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];

      let tutor: string | null = null;
      let telefono: string | null = null;
      let email: string | null = null;

      if (primaryGuardianRel) {
        tutor = primaryGuardianRel.guardian.name;
        telefono =
          s.guardianPhone ??
          primaryGuardianRel.guardian.phone ??
          s.phone ??
          null;
        email = primaryGuardianRel.guardian.email ?? s.user?.email ?? null;
      } else if (s.guardianName) {
        tutor = s.guardianName;
        telefono = s.guardianPhone ?? s.phone ?? null;
        email = s.user?.email ?? null;
      } else {
        tutor = null;
        telefono = s.phone ?? null;
        email = s.user?.email ?? null;
      }

      alumnoEntry = {
        alumnoId: s.id,
        alumno: `${s.firstName} ${s.lastName}`,
        tutor,
        telefono,
        email,
        montoAdeudado: 0,
        pagos: [],
      };

      alumnosMap.set(s.id, alumnoEntry);
    }

    const montoEnPesos = Math.round(m.amountCents / 100);
    const mesFormateado = `${m.periodYear}-${String(m.periodMonth).padStart(2, "0")}`;

    alumnoEntry.pagos.push({
      pagoId: m.id,
      mes: mesFormateado,
      monto: montoEnPesos,
      estado: m.status,
    });

    alumnoEntry.montoAdeudado += montoEnPesos;
  }

  const alumnos = Array.from(alumnosMap.values()).sort(
    (a, b) => b.montoAdeudado - a.montoAdeudado
  );

  const montoTotalAdeudado = alumnos.reduce(
    (total, a) => total + a.montoAdeudado,
    0
  );

  return res.json({
    fechaConsulta: fechaConsultaActual(),
    totalAlumnos: alumnos.length,
    montoTotalAdeudado,
    alumnos,
  });
});

export default router;
