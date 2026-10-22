import { Router } from "express";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { canManageStudent } from "../lib/access";
import {
  DIAS_DE_VIGENCIA,
  MENSAJES_INVALIDA,
  expiryDate,
  generateToken,
  invitationUrl,
  validarInvitacion,
} from "../lib/invitations";
import { requireAuth, requirePermission } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import {
  GuardianRelationship,
  InvitationKind,
  Role,
} from "../generated/prisma/enums";

const router = Router();

const MIN_PASSWORD = 8;

/**
 * Límite para los endpoints públicos.
 *
 * 20 peticiones cada 10 minutos por IP. Suficiente para que una familia
 * llene el formulario con calma, y corta en seco cualquier intento de
 * adivinar tokens por fuerza bruta.
 */
const limitePublico = rateLimit({
  maximo: 20,
  ventanaSegundos: 600,
  mensaje:
    "Demasiados intentos desde esta conexión. Espera unos minutos y vuelve a intentarlo.",
});

function parseFecha(valor: unknown): Date | null {
  if (typeof valor !== "string" || valor.trim().length === 0) return null;

  const partes = valor.trim().split("-").map(Number);

  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null;

  // UTC sin hora, igual que el resto de columnas @db.Date.
  return new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim().length > 0
    ? valor.trim()
    : null;
}

// ---------------------------------------------------------------------------
// Privado: generar y administrar invitaciones
// ---------------------------------------------------------------------------

/**
 * POST /invitations
 *
 * Genera una invitación. La hacen ADMIN y PROFESOR (students:write).
 *
 * Para `kind: "TUTOR"` se puede mandar `studentId` y el tutor quedará ligado
 * a ese alumno además de los hijos que dé de alta en el formulario.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const { kind, studentId, note } = req.body ?? {};

    if (kind !== InvitationKind.TUTOR && kind !== InvitationKind.ALUMNO) {
      return res.status(400).json({
        success: false,
        message: "Indica si la invitación es para un ALUMNO o para un TUTOR.",
      });
    }

    let alumnoLigado: number | null = null;

    if (studentId !== undefined && studentId !== null) {
      const id = Number(studentId);

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: "El id del alumno no es válido.",
        });
      }

      // Un profesor no puede generar invitaciones sobre alumnos de otro.
      if (!(await canManageStudent(req.user!, id))) {
        return res.status(403).json({
          success: false,
          message: "Ese alumno no está en tu grupo.",
        });
      }

      alumnoLigado = id;
    }

    const token = generateToken();

    const invitation = await prisma.invitation.create({
      data: {
        token,
        kind,
        createdById: req.user!.id,
        studentId: alumnoLigado,
        note: texto(note),
        expiresAt: expiryDate(),
      },
    });

    return res.status(201).json({
      success: true,
      invitation: {
        id: invitation.id,
        kind: invitation.kind,
        token: invitation.token,
        url: invitationUrl(invitation.token),
        expiresAt: invitation.expiresAt.toISOString(),
        note: invitation.note,
        diasDeVigencia: DIAS_DE_VIGENCIA,
      },
    });
  }
);

/**
 * GET /invitations
 *
 * Las invitaciones que generó quien pregunta. Un profesor no ve las de otro.
 */
router.get(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const invitations = await prisma.invitation.findMany({
      where: { createdById: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
    });

    const ahora = new Date();

    return res.json({
      success: true,
      invitations: invitations.map((i) => ({
        id: i.id,
        kind: i.kind,
        token: i.token,
        url: invitationUrl(i.token),
        note: i.note,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
        usada: i.usedAt !== null,
        caducada: i.usedAt === null && i.expiresAt < ahora,
        alumnoLigado: i.student
          ? `${i.student.firstName} ${i.student.lastName}`
          : null,
      })),
    });
  }
);

/**
 * DELETE /invitations/:id
 *
 * Revoca una invitación que todavía no se usó, por ejemplo si el enlace se
 * mandó por error a la persona equivocada.
 */
router.delete(
  "/:id",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id de la invitación no es válido.",
      });
    }

    // createdById en el where: así nadie revoca la invitación de otro.
    const result = await prisma.invitation.deleteMany({
      where: { id, createdById: req.user!.id },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "No encontramos esa invitación entre las tuyas.",
      });
    }

    return res.json({ success: true });
  }
);

// ---------------------------------------------------------------------------
// Público: el formulario que llena la familia
//
// Estos dos endpoints NO exigen sesión. El token es lo único que los
// protege, así que van con limitador de peticiones y nunca revelan datos
// más allá de lo necesario para pintar el formulario.
// ---------------------------------------------------------------------------

/**
 * GET /invitations/public/:token
 *
 * Dice qué formulario mostrar. Devuelve solo el nombre del dojo/profesor y
 * el tipo: nada de datos de otras familias.
 */
router.get("/public/:token", limitePublico, async (req, res) => {
  const estado = await validarInvitacion(String(req.params.token));

  if (!estado.ok) {
    return res.status(404).json({
      success: false,
      motivo: estado.motivo,
      message: MENSAJES_INVALIDA[estado.motivo],
    });
  }

  const { invitation } = estado;

  if (!invitation.createdBy.active) {
    return res.status(404).json({
      success: false,
      motivo: "no-existe",
      message: MENSAJES_INVALIDA["no-existe"],
    });
  }

  return res.json({
    success: true,
    invitation: {
      kind: invitation.kind,
      invitadoPor: invitation.createdBy.name,
      expiresAt: invitation.expiresAt.toISOString(),
      // Si la invitación es para sumar un tutor a un alumno concreto, se
      // muestra su nombre para que el tutor confirme que es su hijo.
      alumnoLigado: invitation.student
        ? `${invitation.student.firstName} ${invitation.student.lastName}`
        : null,
    },
  });
});

/**
 * POST /invitations/public/:token
 *
 * Recibe el formulario y crea las cuentas y expedientes.
 *
 * Todo en una transacción: si algo falla a medias, no queremos un tutor sin
 * hijos o un alumno sin cuenta. Y se sella la invitación dentro de la misma
 * transacción, para que no se pueda usar dos veces.
 */
router.post("/public/:token", limitePublico, async (req, res) => {
  const estado = await validarInvitacion(String(req.params.token));

  if (!estado.ok) {
    return res.status(404).json({
      success: false,
      motivo: estado.motivo,
      message: MENSAJES_INVALIDA[estado.motivo],
    });
  }

  const { invitation } = estado;

  if (!invitation.createdBy.active) {
    return res.status(404).json({
      success: false,
      message: MENSAJES_INVALIDA["no-existe"],
    });
  }

  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "El correo electrónico no es válido.",
    });
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return res.status(400).json({
      success: false,
      message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    });
  }

  const correo = email.trim().toLowerCase();

  const yaExiste = await prisma.user.findUnique({
    where: { email: correo },
    select: { id: true },
  });

  if (yaExiste) {
    return res.status(409).json({
      success: false,
      message:
        "Ya hay una cuenta con ese correo. Si es tuya, inicia sesión; si no, usa otro.",
    });
  }

  // Quién será el profesor responsable de los alumnos que se creen: el que
  // generó la invitación, si es profesor. Si la generó el admin, quedan sin
  // asignar y él los reparte después.
  const teacherId =
    invitation.createdBy.role === Role.PROFESOR
      ? invitation.createdBy.id
      : null;

  const hash = await hashPassword(password);

  // -------------------------------------------------------------------------
  // Caso ALUMNO: se registra él mismo
  // -------------------------------------------------------------------------
  if (invitation.kind === InvitationKind.ALUMNO) {
    const firstName = texto(req.body?.firstName);
    const lastName = texto(req.body?.lastName);

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Escribe tu nombre y tu apellido.",
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: correo,
          password: hash,
          role: Role.ALUMNO,
        },
        select: { id: true },
      });

      const student = await tx.student.create({
        data: {
          firstName,
          lastName,
          birthDate: parseFecha(req.body?.birthDate),
          phone: texto(req.body?.phone),
          guardianName: texto(req.body?.guardianName),
          guardianPhone: texto(req.body?.guardianPhone),
          medicalNotes: texto(req.body?.medicalNotes),
          teacherId,
          userId: user.id,
        },
        select: { id: true },
      });

      // Sella la invitación. updateMany con usedAt: null hace que si dos
      // envíos llegan a la vez, solo el primero la cierre.
      const sellada = await tx.invitation.updateMany({
        where: { id: invitation.id, usedAt: null },
        data: {
          usedAt: new Date(),
          createdUserId: user.id,
          createdStudentId: student.id,
        },
      });

      if (sellada.count === 0) {
        // Otro envío ganó la carrera: deshacemos todo.
        throw new Error("INVITACION_YA_USADA");
      }

      return { userId: user.id, studentId: student.id };
    });

    return res.status(201).json({
      success: true,
      message: "Listo, tu registro quedó hecho. Ya puedes iniciar sesión.",
      ...resultado,
    });
  }

  // -------------------------------------------------------------------------
  // Caso TUTOR: sus datos y los de sus hijos
  // -------------------------------------------------------------------------
  const name = texto(req.body?.name);
  const children = req.body?.children;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Escribe tu nombre completo.",
    });
  }

  if (!Array.isArray(children)) {
    return res.status(400).json({
      success: false,
      message: "Faltan los datos de tus hijos.",
    });
  }

  // Sin alumno ligado, el tutor tiene que dar de alta al menos un hijo; si
  // no, quedaría una cuenta de tutor que no puede consultar nada.
  if (children.length === 0 && !invitation.studentId) {
    return res.status(400).json({
      success: false,
      message: "Agrega al menos un hijo o hija.",
    });
  }

  if (children.length > 10) {
    return res.status(400).json({
      success: false,
      message: "Son demasiados. Si tienes más de 10, avísale al dojo.",
    });
  }

  const hijos: { firstName: string; lastName: string; body: unknown }[] = [];

  for (const [i, hijo] of children.entries()) {
    const firstName = texto(hijo?.firstName);
    const lastName = texto(hijo?.lastName);

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: `Falta el nombre o el apellido del hijo número ${i + 1}.`,
      });
    }

    hijos.push({ firstName, lastName, body: hijo });
  }

  const parentesco: GuardianRelationship =
    req.body?.relationship === "MADRE" || req.body?.relationship === "PADRE"
      ? req.body.relationship
      : GuardianRelationship.TUTOR;

  const telefonoTutor = texto(req.body?.phone);

  const resultado = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: correo,
        password: hash,
        role: Role.TUTOR,
      },
      select: { id: true },
    });

    const creados: number[] = [];

    for (const hijo of hijos) {
      const body = hijo.body as Record<string, unknown>;

      const student = await tx.student.create({
        data: {
          firstName: hijo.firstName,
          lastName: hijo.lastName,
          birthDate: parseFecha(body?.birthDate),
          phone: texto(body?.phone),
          // El contacto del tutor se copia como texto además de la relación:
          // así el profesor lo ve en la tarjeta sin tener que abrir la cuenta.
          guardianName: name,
          guardianPhone: telefonoTutor,
          medicalNotes: texto(body?.medicalNotes),
          teacherId,
        },
        select: { id: true },
      });

      await tx.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: user.id,
          relationship: parentesco,
          isPrimary: true,
        },
      });

      creados.push(student.id);
    }

    // Si la invitación venía ligada a un alumno existente, lo suma.
    if (invitation.studentId) {
      await tx.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: invitation.studentId,
            guardianId: user.id,
          },
        },
        update: { relationship: parentesco },
        create: {
          studentId: invitation.studentId,
          guardianId: user.id,
          relationship: parentesco,
          isPrimary: false,
        },
      });
    }

    const sellada = await tx.invitation.updateMany({
      where: { id: invitation.id, usedAt: null },
      data: {
        usedAt: new Date(),
        createdUserId: user.id,
        createdStudentId: creados[0] ?? null,
      },
    });

    if (sellada.count === 0) {
      throw new Error("INVITACION_YA_USADA");
    }

    return { userId: user.id, hijosCreados: creados.length };
  });

  return res.status(201).json({
    success: true,
    message: "Listo, tu registro quedó hecho. Ya puedes iniciar sesión.",
    ...resultado,
  });
});

export default router;
