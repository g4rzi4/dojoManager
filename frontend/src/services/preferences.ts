export type Language = "ES" | "EN";
export type Theme = "LIGHT" | "DARK";
export type FontSize = "SMALL" | "NORMAL" | "LARGE";

export type Preferences = {
  language: Language;
  theme: Theme;
  fontSize: FontSize;
};

const STORAGE_KEY = "preferences";

const DEFAULTS: Preferences = {
  language: "ES",
  theme: "LIGHT",
  fontSize: "NORMAL",
};

/**
 * En porcentaje y no en píxeles para respetar el tamaño que la persona ya
 * configuró en su navegador. Tailwind mide en rem, así que escala toda la app.
 *
 * El script de index.html repite estos valores: corre antes de que cargue
 * este módulo para que la página no parpadee al abrirse.
 */
const FONT_SCALE: Record<FontSize, string> = {
  SMALL: "90%",
  NORMAL: "100%",
  LARGE: "115%",
};

const THEME_COLOR: Record<Theme, string> = {
  LIGHT: "#fafafa",
  DARK: "#16161a",
};

/**
 * Lee de localStorage, que puede traer basura de una versión anterior de la
 * app o de alguien editándolo a mano, así que cada campo se valida.
 */
function readStored(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

    return {
      language: stored?.language === "EN" ? "EN" : DEFAULTS.language,
      theme: stored?.theme === "DARK" ? "DARK" : DEFAULTS.theme,
      fontSize:
        stored?.fontSize === "SMALL" || stored?.fontSize === "LARGE"
          ? stored.fontSize
          : DEFAULTS.fontSize,
    };
  } catch {
    return DEFAULTS;
  }
}

function paint({ language, theme, fontSize }: Preferences) {
  const root = document.documentElement;

  root.lang = language === "EN" ? "en-US" : "es-MX";
  root.dataset.theme = theme === "DARK" ? "dark" : "light";
  root.style.fontSize = FONT_SCALE[fontSize];

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

let current = readStored();
paint(current);

const listeners = new Set<() => void>();

export function getPreferences(): Preferences {
  return current;
}

export function subscribeToPreferences(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Aplica las preferencias a la pantalla y las recuerda en este navegador.
 *
 * Se recuerdan aquí además de en la cuenta para pintar bien la página desde
 * el primer instante, antes de que responda el servidor, y en las pantallas
 * sin sesión (login e inscripción por QR).
 */
export function applyPreferences(next: Preferences) {
  current = next;
  paint(next);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento (modo privado) siguen valiendo para esta visita.
  }

  listeners.forEach((listener) => listener());
}
