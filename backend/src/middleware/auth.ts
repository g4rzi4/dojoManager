import type { NextFunction, Request, Response } from "express";

import { conDojo } from "../lib/dojoContext";
import { verifyToken } from "../lib/jwt";
import { can, type Permission } from "../permissions";
import type { Role } from "../generated/prisma/enums";

/** Usuario autenticado que el middleware adjunta a la petición. */
export type AuthUser = {
  id: number;
  role: Role;
};

// Extiende el Request de Express para que req.user tenga tipo en todo el
// backend, en lugar de usar (req as any).user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Exige un token válido. Deja el usuario en req.user.
 *
 * Solo confía en el token, no en nada que mande el cliente en el body: el
 * rol sale de la firma, así que nadie puede autoproclamarse ADMIN.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Falta el token de autenticación.",
    });
  }

  const payload = verifyToken(header.slice("Bearer ".length));

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Tu sesión expiró o el token no es válido. Inicia sesión otra vez.",
    });
  }

  req.user = { id: payload.sub, role: payload.role };

  // Todo lo que siga en esta petición queda limitado al dojo del token.
  conDojo(payload.dojoId, next);
}

/**
 * Exige un permiso concreto. Usar SIEMPRE después de requireAuth.
 *
 *   router.post("/", requireAuth, requirePermission("students:write"), handler)
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Falta el token de autenticación.",
      });
    }

    if (!can(req.user.role, permission)) {
      // 403 y no 404: el recurso existe, lo que falta es permiso.
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para hacer esto.",
      });
    }

    next();
  };
}
