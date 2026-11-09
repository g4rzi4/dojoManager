import { Router } from "express";

import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { ROLE_PERMISSIONS } from "../permissions";
import { FontSize, Language, Role, Theme } from "../generated/prisma/enums";

const router = Router();

/** Las preferencias tal como las recibe el frontend. */
function preferencesOf(user: {
  language: Language;
  theme: Theme;
  fontSize: FontSize;
}) {
  return {
    language: user.language,
    theme: user.theme,
    fontSize: user.fontSize,
  };
}

/**
 * El login no exige sesión, así que es el lugar natural para probar
 * contraseñas a lo bruto. 10 intentos cada 5 minutos por IP.
 */
const limiteLogin = rateLimit({
  maximo: 10,
  ventanaSegundos: 300,
  mensaje:
    "Demasiados intentos de inicio de sesión. Espera unos minutos y vuelve a intentarlo.",
});

/**
 * POST /auth/login
 *
 * Devuelve el token y el usuario, incluyendo sus permisos para que el
 * frontend sepa qué menús mostrar sin tener que duplicar la lógica.
 */
router.post("/login", limiteLogin, async (req, res) => {
  const { email, password, teacherCode } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Debes enviar correo y contraseña.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { student: { select: { id: true } } },
  });

  // Mismo mensaje y mismo código si el correo no existe o si la contraseña
  // es incorrecta: distinguirlos le revelaría a un atacante qué correos
  // están registrados.
  const credencialesInvalidas = () =>
    res.status(401).json({
      success: false,
      message: "Correo o contraseña incorrectos.",
    });

  if (!user) {
    return credencialesInvalidas();
  }

  const passwordOk = await verifyPassword(password, user.password);

  if (!passwordOk) {
    return credencialesInvalidas();
  }

  /**
   * Tercer factor para profesores: además de correo y contraseña, su clave.
   *
   * Se verifica DESPUÉS de la contraseña y con el mismo mensaje genérico, a
   * propósito. Si dijéramos "la clave es incorrecta", le confirmaríamos a
   * quien ya robó una contraseña que ese correo pertenece a un profesor y
   * que solo le falta la clave.
   *
   * La comparación normaliza mayúsculas y espacios porque la clave se dicta
   * en voz alta y se escribe a mano.
   */
  if (user.role === Role.PROFESOR) {
    const claveEsperada = user.teacherCode;

    const claveRecibida =
      typeof teacherCode === "string" ? teacherCode.trim().toUpperCase() : "";

    if (!claveEsperada || claveRecibida !== claveEsperada) {
      return credencialesInvalidas();
    }
  }

  if (!user.active) {
    return res.status(403).json({
      success: false,
      message: "Tu cuenta está desactivada. Contacta al administrador.",
    });
  }

  const token = signToken({ sub: user.id, role: user.role });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherCode: user.teacherCode,
      // Si es alumno, su expediente, para poder mandarlo a su tarjeta.
      studentId: user.student?.id ?? null,
      permissions: ROLE_PERMISSIONS[user.role],
      preferences: preferencesOf(user),
    },
  });
});

/**
 * GET /auth/me
 *
 * Permite al frontend revalidar la sesión al recargar la página, en lugar de
 * confiar ciegamente en lo que quedó guardado en localStorage.
 */
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { student: { select: { id: true } } },
  });

  if (!user || !user.active) {
    return res.status(401).json({
      success: false,
      message: "La cuenta ya no está disponible.",
    });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherCode: user.teacherCode,
      studentId: user.student?.id ?? null,
      permissions: ROLE_PERMISSIONS[user.role],
      preferences: preferencesOf(user),
    },
  });
});

/**
 * PATCH /auth/me/preferences
 *
 * Solo pide sesión: son los cuatro roles y cada quien cambia las suyas. El id
 * sale del token, así que nadie puede tocar las preferencias de otra cuenta.
 */
router.patch("/me/preferences", requireAuth, async (req, res) => {
  const { language, theme, fontSize } = req.body ?? {};

  const esValido = (valor: unknown, opciones: object) =>
    valor === undefined || Object.values(opciones).includes(valor);

  if (
    !esValido(language, Language) ||
    !esValido(theme, Theme) ||
    !esValido(fontSize, FontSize)
  ) {
    return res.status(400).json({
      success: false,
      message: "Alguna de las preferencias no es válida.",
    });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { language, theme, fontSize },
  });

  return res.json({ success: true, preferences: preferencesOf(user) });
});

export default router;
