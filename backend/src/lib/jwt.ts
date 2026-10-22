import jwt from "jsonwebtoken";

import { config } from "../config";
import type { Role } from "../generated/prisma/enums";

export type TokenPayload = {
  /** Id del usuario. */
  sub: number;
  role: Role;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresInSeconds,
  });
}

/**
 * Verifica la firma y la expiración del token.
 *
 * Devuelve null en lugar de lanzar: un token inválido es un caso normal
 * (expiró, el usuario lo editó, viene de otro entorno), no un error del
 * servidor.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.sub === "number" &&
      typeof decoded.role === "string"
    ) {
      return { sub: decoded.sub, role: decoded.role as Role };
    }

    return null;
  } catch {
    return null;
  }
}
