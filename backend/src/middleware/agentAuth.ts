import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

/**
 * Middleware de seguridad para las rutas del agente (/api/agent/*).
 *
 * Estas rutas exponen información sensible de alumnos y familias (teléfonos,
 * correos electrónicos, nombres y estado de sus adeudos). Por seguridad,
 * nunca deben ser públicas y exigen una API key válida configurada en el servidor.
 *
 * Acepta la clave mediante dos mecanismos estándar:
 *   1. Encabezado 'x-api-key': <AGENT_API_KEY>
 *   2. Encabezado 'Authorization': Bearer <AGENT_API_KEY>
 */
export function requireAgentApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!config.agentApiKey) {
    return res.status(500).json({
      success: false,
      message:
        "La variable de entorno AGENT_API_KEY no está configurada en el servidor.",
    });
  }

  const xApiKey = req.headers["x-api-key"];
  const authHeader = req.headers.authorization;

  let providedKey: string | undefined;

  if (typeof xApiKey === "string" && xApiKey.trim().length > 0) {
    providedKey = xApiKey.trim();
  } else if (authHeader?.startsWith("Bearer ")) {
    providedKey = authHeader.slice("Bearer ".length).trim();
  }

  if (!providedKey || providedKey !== config.agentApiKey) {
    return res.status(401).json({
      success: false,
      message:
        "API key inválida o ausente. Envía un encabezado 'x-api-key' o 'Authorization: Bearer <key>' válido.",
    });
  }

  next();
}
