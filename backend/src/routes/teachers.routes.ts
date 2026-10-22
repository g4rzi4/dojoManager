import { Router } from "express";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { generateTeacherCode } from "../lib/teacherCode";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Role } from "../generated/prisma/enums";

const router = Router();

/** Mínimo de la contraseña. Corta y obligatoria es peor que ninguna regla. */
const MIN_PASSWORD = 8;

/**
 * GET /teachers
 *
 * Lista de profesores con su clave y cuántos alumnos tiene cada uno.
 * Solo el administrador: teachers:read no lo tiene nadie más.
 */
router.get(
  "/",
  requireAuth,
  requirePermission("teachers:read"),
  async (_req, res) => {
    const teachers = await prisma.user.findMany({
      where: { role: Role.PROFESOR },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        teacherCode: true,
        active: true,
        createdAt: true,
        _count: { select: { studentsTaught: true } },
      },
    });

    return res.json({
      success: true,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        teacherCode: t.teacherCode,
        active: t.active,
        alumnos: t._count.studentsTaught,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  }
);

/**
 * POST /teachers
 *
 * Registra un profesor y le genera su clave única.
 *
 * Solo el ADMIN. El permiso teachers:write no lo tiene ningún otro rol, así
 * que un profesor no puede crear más profesores.
 */
router.post(
  "/",
  requireAuth,
  requirePermission("teachers:write"),
  async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length === 0 ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan el nombre, el correo o la contraseña.",
      });
    }

    const correo = email.trim().toLowerCase();

    if (!correo.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "El correo no es válido.",
      });
    }

    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      });
    }

    const yaExiste = await prisma.user.findUnique({
      where: { email: correo },
      select: { id: true },
    });

    if (yaExiste) {
      // 409 y no 400: la petición es correcta, el conflicto es de estado.
      return res.status(409).json({
        success: false,
        message: "Ya hay una cuenta con ese correo.",
      });
    }

    const [hash, teacherCode] = await Promise.all([
      hashPassword(password),
      generateTeacherCode(),
    ]);

    const teacher = await prisma.user.create({
      data: {
        name: name.trim(),
        email: correo,
        password: hash,
        role: Role.PROFESOR,
        teacherCode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacherCode: true,
        active: true,
      },
    });

    return res.status(201).json({ success: true, teacher });
  }
);

/**
 * PATCH /teachers/:id/active
 *
 * Da de alta o de baja a un profesor. Baja lógica: desactivar le impide
 * iniciar sesión, pero conserva su rastro en el historial de los alumnos
 * (quién evaluó cada graduación, quién registró cada pago).
 */
router.patch(
  "/:id/active",
  requireAuth,
  requirePermission("teachers:write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { active } = req.body ?? {};

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "El id del profesor no es válido.",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Indica si la cuenta queda activa o inactiva.",
      });
    }

    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes desactivar tu propia cuenta.",
      });
    }

    const teacher = await prisma.user.findFirst({
      where: { id, role: Role.PROFESOR },
      select: { id: true },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No existe ese profesor.",
      });
    }

    await prisma.user.update({ where: { id }, data: { active } });

    return res.json({ success: true });
  }
);

export default router;
