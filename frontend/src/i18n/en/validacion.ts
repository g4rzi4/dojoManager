/** Mensajes de la validación de campos del backend (middleware/validarCampos.ts). */
export const validacion: Record<string, string> = {
  "El nombre solo puede tener letras, espacios, puntos, apóstrofos y guiones.":
    "The name can only contain letters, spaces, periods, apostrophes and hyphens.",
  "El apellido solo puede tener letras, espacios, puntos, apóstrofos y guiones.":
    "The last name can only contain letters, spaces, periods, apostrophes and hyphens.",
  "El nombre del tutor solo puede tener letras, espacios, puntos, apóstrofos y guiones.":
    "The guardian's name can only contain letters, spaces, periods, apostrophes and hyphens.",
  "El nombre del administrador solo puede tener letras, espacios, puntos, apóstrofos y guiones.":
    "The administrator's name can only contain letters, spaces, periods, apostrophes and hyphens.",
  "El teléfono solo puede tener números, espacios, paréntesis, guiones y el signo +.":
    "The phone number can only contain digits, spaces, parentheses, hyphens and the + sign.",
  "El teléfono del tutor solo puede tener números, espacios, paréntesis, guiones y el signo +.":
    "The guardian's phone number can only contain digits, spaces, parentheses, hyphens and the + sign.",
  "El texto no puede contener etiquetas HTML ni código.":
    "The text can't contain HTML tags or code.",
  "El texto tiene caracteres no permitidos.": "The text contains characters that aren't allowed.",
};
