import type { NextFunction, Request, Response } from "express";

/**
 * Revisa el texto de TODA petición antes de que llegue a una ruta, para todos
 * los roles. Cada campo acepta solo lo que le corresponde:
 *
 * - Nombres de personas: letras (con acentos y ñ), espacios, punto,
 *   apóstrofo y guion.
 * - Teléfonos: números, espacios, paréntesis, guion, punto y "+".
 * - Correos: formato de correo.
 * - El resto (notas, títulos, avisos…): texto libre, pero sin etiquetas HTML,
 *   sin "javascript:" y sin caracteres de control.
 *
 * Está aquí y no en cada ruta para que ninguna se quede sin revisar, tampoco
 * las que se agreguen después. React ya muestra todo como texto, así que esto
 * no es lo único que impide ejecutar código: evita que se guarde basura.
 *
 * Para un campo nuevo con formato propio, agrega su nombre a las listas.
 */

const NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const TELEFONO = /^\+?[0-9 ().-]+$/;
const CORREO = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** Algo que parece etiqueta HTML o código: "<b", "</", "<!", "<?", "javascript:". */
const CODIGO = /<\s*[a-z!/?]|javascript\s*:/i;
/** Caracteres de control, salvo salto de línea, retorno y tabulador. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** Nunca se tocan: deben poder llevar cualquier carácter. */
const SIN_REVISAR = new Set(["password", "adminPassword", "token"]);

const NOMBRES_DE_PERSONA: Record<string, string> = {
  firstName: "El nombre solo puede tener letras, espacios, puntos, apóstrofos y guiones.",
  lastName: "El apellido solo puede tener letras, espacios, puntos, apóstrofos y guiones.",
  guardianName: "El nombre del tutor solo puede tener letras, espacios, puntos, apóstrofos y guiones.",
  adminName: "El nombre del administrador solo puede tener letras, espacios, puntos, apóstrofos y guiones.",
};

/**
 * "name" es el nombre de una persona solo en estas rutas. En otras es, por
 * ejemplo, una modalidad de evento ("Kumite +60 kg"), que sí lleva números.
 */
const RUTAS_CON_NOMBRE_DE_PERSONA = ["/teachers", "/guardians", "/invitations/public", "/platform"];

const TELEFONOS: Record<string, string> = {
  phone: "El teléfono solo puede tener números, espacios, paréntesis, guiones y el signo +.",
  guardianPhone: "El teléfono del tutor solo puede tener números, espacios, paréntesis, guiones y el signo +.",
};

const CORREOS = new Set(["email", "adminEmail"]);

const MENSAJE_CODIGO = "El texto no puede contener etiquetas HTML ni código.";
const MENSAJE_CONTROL = "El texto tiene caracteres no permitidos.";

function revisar(campo: string, valor: string, nombreEsPersona: boolean): string | null {
  const texto = valor.trim();

  // Vacío: si el campo es obligatorio, la ruta lo dice con su propio mensaje.
  if (texto === "") return null;

  if (CONTROL.test(valor)) return MENSAJE_CONTROL;

  const mensajeNombre =
    NOMBRES_DE_PERSONA[campo] ??
    (campo === "name" && nombreEsPersona
      ? "El nombre solo puede tener letras, espacios, puntos, apóstrofos y guiones."
      : null);

  if (mensajeNombre) {
    return NOMBRE.test(texto) && texto.length <= 80 ? null : mensajeNombre;
  }

  if (TELEFONOS[campo]) {
    const digitos = texto.replace(/\D/g, "").length;
    return TELEFONO.test(texto) && digitos >= 7 && digitos <= 15
      ? null
      : TELEFONOS[campo];
  }

  if (CORREOS.has(campo)) {
    return CORREO.test(texto) && texto.length <= 254
      ? null
      : "El correo electrónico no es válido.";
  }

  return CODIGO.test(valor) ? MENSAJE_CODIGO : null;
}

/** Recorre el cuerpo completo, también objetos y listas anidados. */
function buscarError(
  valor: unknown,
  campo: string,
  nombreEsPersona: boolean
): { campo: string; message: string } | null {
  if (SIN_REVISAR.has(campo)) return null;

  if (typeof valor === "string") {
    const message = revisar(campo, valor, nombreEsPersona);
    return message ? { campo, message } : null;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const error = buscarError(item, campo, nombreEsPersona);
      if (error) return error;
    }
    return null;
  }

  if (valor && typeof valor === "object") {
    for (const [clave, interno] of Object.entries(valor)) {
      const error = buscarError(interno, clave, nombreEsPersona);
      if (error) return error;
    }
  }

  return null;
}

export function validarCampos(req: Request, res: Response, next: NextFunction) {
  // El webhook de PayPal trae el formato de PayPal y se verifica por firma.
  if (req.path === "/paypal/webhook" || req.body === undefined) return next();

  const nombreEsPersona = RUTAS_CON_NOMBRE_DE_PERSONA.some((r) =>
    req.path.startsWith(r)
  );
  const error = buscarError(req.body, "", nombreEsPersona);

  if (error) {
    return res.status(400).json({
      success: false,
      campo: error.campo,
      message: error.message,
    });
  }

  next();
}
