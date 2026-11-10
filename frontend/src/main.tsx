import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Root from "./Root";
import { getMe } from "./services/api";
import { applyPreferences } from "./services/preferences";
import { getToken } from "./services/session";

/**
 * Trae las preferencias de la cuenta al abrir la app, por si se cambiaron
 * desde otro dispositivo. Si falla, se queda con las de este navegador.
 */
if (getToken()) {
  getMe()
    .then(({ user }) => applyPreferences(user.preferences))
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
