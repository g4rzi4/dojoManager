import { Router } from "express";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { canManageStudent } from "../lib/access";
import { requireAuth, requirePermission } from "../middleware/auth";
import { GuardianRelationship, Role } from "../generated/prisma/enums";

const router = Router();

const MIN_PASSWORD = 8;

/**
 * POST /guardians
 *
 * Registra una cuenta de tutor y la liga a un alumno.
 *
 * Lo pueden hacer el ADMIN y los PROFESOR, pero un profesor solo sobre los
 * alumnos de su grupo: si no, podría darle a un desconocido acceso al
 * expediente de un alumno ajeno.
 *
 * Si el correo ya pertenece a un tutor existente, lo liga en lugar de
 * fallar: es el caso normal de la madre que inscribe a su segundo hijo.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const { name, email, password, studentId, relationship, isPrimary } =
      req.body ?? {};

    const alumnoId = Number(studentId);

    if (!Number.isInteger(alumnoId) || alumnoId < 1) {
      return res.status(400).json({
        success: false,
        message: "Indica a qué alumno se liga el tutor.",
      });
    }

    if (!(await canManageStudent(req.user!, alumnoId))) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está en tu grupo.",
      });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "El correo del tutor no es válido.",
      });
    }

    const correo = email.trim().toLowerCase();
    const parentesco: GuardianRelationship =
      relationship === "MADRE" || relationship === "PADRE"
        ? relationship
        : GuardianRelationship.TUTOR;

    const existente = await prisma.user.findUnique({
      where: { email: correo },
      select: { id: true, role: true, name: true },
    });

    let guardianId: number;
    let creada = false;

    if (existente) {
      // Solo ligamos cuentas que ya sean de tutor. Convertir a un alumno o a
      // un profesor en tutor cambiaría sus permisos de forma inesperada.
      if (existente.role !== Role.TUTOR) {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe una cuenta con ese correo y no es de tutor. Usa otro correo.",
        });
      }

      guardianId = existente.id;
    } else {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El tutor necesita un nombre.",
        });
      }

      if (typeof password !== "string" || password.length < MIN_PASSWORD) {
        return res.status(400).json({
          success: false,
          message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
        });
      }

      const nuevo = await prisma.user.create({
        data: {
          name: name.trim(),
          email: correo,
          password: await hashPassword(password),
          role: Role.TUTOR,
        },
        select: { id: true },
      });

      guardianId = nuevo.id;
      creada = true;
    }

    // upsert y no create: si ya estaba ligado a ese alumno, no es un error.
    await prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: { studentId: alumnoId, guardianId },
      },
      update: {
        relationship: parentesco,
        isPrimary: isPrimary === true,
      },
      create: {
        studentId: alumnoId,
        guardianId,
        relationship: parentesco,
        isPrimary: isPrimary === true,
      },
    });

    return res.status(201).json({
      success: true,
      cuentaCreada: creada,
      message: creada
        ? "Tutor registrado y ligado al alumno."
        : "El tutor ya tenía cuenta; se ligó a este alumno.",
    });
  }
);

/**
 * DELETE /guardians/:studentId/:guardianId
 *
 * Quita el acceso de un tutor a un alumno. No borra la cuenta del tutor:
 * puede seguir teniendo otros hijos en el dojo.
 */
router.delete(
  "/:studentId/:guardianId",
  requireAuth,
  requirePermission("students:write"),
  async (req, res) => {
    const studentId = Number(req.params.studentId);
    const guardianId = Number(req.params.guardianId);

    if (
      !Number.isInteger(studentId) ||
      studentId < 1 ||
      !Number.isInteger(guardianId) ||
      guardianId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Los identificadores no son válidos.",
      });
    }

    if (!(await canManageStudent(req.user!, studentId))) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está en tu grupo.",
      });
    }

    const result = await prisma.studentGuardian.deleteMany({
      where: { studentId, guardianId },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Ese tutor no estaba ligado a este alumno.",
      });
    }

    return res.json({ success: true });
  }
);

export default router;
