import { getPreferences } from "../services/preferences";
import { en } from "./en";

type Params = Record<string, string | number>;

/**
 * Traduce un texto de la interfaz al idioma de la persona.
 *
 * La llave es el propio texto en español, así que las pantallas se siguen
 * leyendo igual y un texto sin traducir se muestra en español en lugar de
 * romperse. Los valores variables van como {nombre}:
 *
 *   t("Hola, {nombre}", { nombre: user.name })
 *
 * Lee el idioma al llamarse, y main.tsx vuelve a montar la app cuando cambia.
 * Por eso t() va dentro del render: una constante a nivel de módulo guarda el
 * texto en español y se traduce donde se muestra, t(ROLE_LABELS[role]).
 */
export function t(text: string, params?: Params): string {
  const template =
    getPreferences().language === "EN" ? (en[text] ?? text) : text;

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/** Formato regional de fechas para el idioma actual. */
export function getLocale(): string {
  return getPreferences().language === "EN" ? "en-US" : "es-MX";
}
