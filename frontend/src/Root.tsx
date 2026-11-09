import { useSyncExternalStore } from "react";

import App from "./App";
import {
  getPreferences,
  subscribeToPreferences,
} from "./services/preferences";

/**
 * La llave vuelve a montar la app al cambiar de idioma: los textos se traducen
 * con t() durante el render, así que ninguno se queda en el idioma anterior.
 */
function Root() {
  const { language } = useSyncExternalStore(
    subscribeToPreferences,
    getPreferences
  );

  return <App key={language} />;
}

export default Root;
