import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellOff, Check, CheckCheck, Megaphone, Settings2 } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import AnnouncementForm from "../components/AnnouncementForm";
import {
  ApiError,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/api";
import { can, getUser } from "../services/session";
import type { AppNotification } from "../types/notification";
import { TOPIC_LABELS, TOPIC_STYLES } from "../types/notification";

function Notifications() {
  const user = getUser();
  const puedeMandarAvisos = can(user, "notifications:send");

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [componiendo, setComponiendo] = useState(false);

  function cargar() {
    return getNotifications()
      .then((data) => setItems(data.notifications))
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? e.message
            : "No fue posible cargar las notificaciones."
        );
      });
  }

  useEffect(() => {
    let activo = true;

    getNotifications()
      .then((data) => {
        if (activo) setItems(data.notifications);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar las notificaciones."
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  async function marcarLeida(id: number) {
    // Actualiza la pantalla de inmediato y luego confirma con el servidor:
    // esperar la respuesta para un simple "visto" se siente lento.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await markNotificationRead(id);
    } catch {
      // Si falló, recargamos para no dejar la pantalla mintiendo.
      await cargar();
    }
  }

  async function marcarTodas() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllNotificationsRead();
    } catch {
      await cargar();
    }
  }

  const sinLeer = items.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-2 text-slate-600">
            {sinLeer === 0
              ? "Estás al día."
              : `Tienes ${sinLeer} sin leer.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sinLeer > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="
                flex cursor-pointer items-center gap-2 rounded-xl border
                border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold
                text-slate-700 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-slate-50
                focus:ring-2 focus:ring-blue-600 focus:outline-none
              "
            >
              <CheckCheck size={17} aria-hidden="true" />
              Marcar todas como leídas
            </button>
          )}

          {puedeMandarAvisos && (
            <button
              type="button"
              onClick={() => setComponiendo((v) => !v)}
              aria-expanded={componiendo}
              className="
                flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600
                px-4 py-2.5 text-sm font-semibold text-white
                transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-blue-700
                focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
              "
            >
              <Megaphone size={17} aria-hidden="true" />
              Mandar un aviso
            </button>
          )}
        </div>
      </header>

      {componiendo && puedeMandarAvisos && (
        <div className="mt-6">
          <AnnouncementForm
            onEnviado={async () => {
              setComponiendo(false);
              await cargar();
            }}
            onCancelar={() => setComponiendo(false)}
          />
        </div>
      )}

      <section className="mt-8">
        {loading ? (
          <div className="space-y-3">
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
          </div>
        ) : error ? (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              No se pudieron cargar las notificaciones
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BellOff size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-slate-900">
              No tienes notificaciones
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Aquí llegarán los avisos del dojo y los recordatorios de pagos,
              graduaciones y eventos.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <Card
                  className={`p-4 ${
                    n.read ? "" : "border-l-4 border-l-blue-600"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        TOPIC_STYLES[n.topic]
                      }`}
                    >
                      {TOPIC_LABELS[n.topic]}
                    </span>

                    {n.kind === "AVISO" && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Megaphone size={12} aria-hidden="true" />
                        Del dojo
                      </span>
                    )}

                    {n.kind === "AUTOMATICA" && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Settings2 size={12} aria-hidden="true" />
                        Automática
                      </span>
                    )}

                    {!n.read && (
                      <span className="ml-auto shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        Sin leer
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 font-semibold text-slate-900">
                    {n.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-700">{n.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-xs text-slate-600">
                      {new Date(n.createdAt).toLocaleString("es-MX", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {n.author && ` · ${n.author}`}
                    </p>

                    {n.link && (
                      <Link
                        to={n.link}
                        className="
                          rounded text-xs font-semibold text-blue-700
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:text-blue-900
                          focus:ring-2 focus:ring-blue-600 focus:outline-none
                        "
                      >
                        Ver detalle
                      </Link>
                    )}

                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => marcarLeida(n.id)}
                        className="
                          ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg
                          px-2 py-1 text-xs font-semibold text-slate-600
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:bg-slate-100 hover:text-slate-900
                          focus:ring-2 focus:ring-blue-600 focus:outline-none
                        "
                      >
                        <Check size={14} aria-hidden="true" />
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Notifications;
