import bcrypt from "bcryptjs";

/**
 * Costo de bcrypt. 10 rondas tarda ~100ms, que es el balance habitual entre
 * seguridad y no dejar colgado el login. Subirlo hace el hash más lento de
 * romper por fuerza bruta, pero también más lento para el usuario.
 */
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
