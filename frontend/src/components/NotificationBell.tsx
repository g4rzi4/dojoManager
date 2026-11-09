import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";

import { getNotifications } from "../services/api";

/**
 * Campana con el número de notificaciones sin leer.
 *
 * Consulta una sola vez al montar. No hace polling a propósito: para un dojo
 * no vale la pena una petición cada pocos segundos, y la cuenta se actualiza
 * al navegar entre pantallas. Si más adelante quieren avisos en vivo, el
 * lugar correcto sería SSE o websockets, no un intervalo.
 */
function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let activo = true;

    getNotifications()
      .then((data) => {
        if (activo) setUnread(data.unread);
      })
      // Si falla, la campana se queda en cero: no vale romper la pantalla
      // completa porque no se pudo contar las notificaciones.
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  const etiqueta =
    unread === 0
      ? "Notificaciones"
      : `Notificaciones, ${unread} sin leer`;

  return (
    <Link
      to="/notificaciones"
      aria-label={etiqueta}
      className="
        relative flex h-11 w-11 items-center justify-center rounded-xl
        text-neutral-600 transition-colors duration-200
        motion-reduce:transition-none
        hover:bg-neutral-100 hover:text-neutral-900
        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
      "
    >
      <Bell size={21} aria-hidden="true" />

      {unread > 0 && (
        <span
          aria-hidden="true"
          className="
            absolute top-1.5 right-1 flex min-w-5 items-center justify-center
            rounded-full bg-red-600 px-1 text-[11px] font-bold text-white
          "
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
