import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellOff, Check, CheckCheck, Megaphone, Settings2 } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import AnnouncementForm from "../components/AnnouncementForm";
import {
  ApiError,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/api";
import { can, getUser } from "../services/session";
import { t, getLocale } from "../i18n";
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
            : t("No fue posible cargar las notificaciones.")
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
              : t("No fue posible cargar las notificaciones.")
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading module="notificaciones">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Notificaciones")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {sinLeer === 0
              ? t("Estás al día.")
              : t("Tienes {n} sin leer.", { n: sinLeer })}
          </p>
        </PageHeading>

        <div className="flex flex-wrap gap-2">
          {sinLeer > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="
                flex cursor-pointer items-center gap-2 rounded-2xl border
                border-neutral-300 bg-surface px-4 py-2.5 text-sm font-semibold
                text-neutral-700 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-neutral-50
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              "
            >
              <CheckCheck size={17} aria-hidden="true" />
              {t("Marcar todas como leídas")}
            </button>
          )}

          {puedeMandarAvisos && (
            <button
              type="button"
              onClick={() => setComponiendo((v) => !v)}
              aria-expanded={componiendo}
              className="
                flex cursor-pointer items-center gap-2 rounded-2xl bg-violet-600
                px-4 py-2.5 text-sm font-semibold text-white
                transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-violet-700
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              "
            >
              <Megaphone size={17} aria-hidden="true" />
              {t("Mandar un aviso")}
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
              {t("No se pudieron cargar las notificaciones")}
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
              <BellOff size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-neutral-900">
              {t("No tienes notificaciones")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t(
                "Aquí llegarán los avisos del dojo y los recordatorios de pagos, graduaciones y eventos."
              )}
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <Card
                  className={`p-4 ${
                    n.read ? "" : "border-violet-300 bg-violet-50/50"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        TOPIC_STYLES[n.topic]
                      }`}
                    >
                      {t(TOPIC_LABELS[n.topic])}
                    </span>

                    {n.kind === "AVISO" && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-300 bg-surface px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        <Megaphone size={12} aria-hidden="true" />
                        {t("Del dojo")}
                      </span>
                    )}

                    {n.kind === "AUTOMATICA" && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-300 bg-surface px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        <Settings2 size={12} aria-hidden="true" />
                        {t("Automática")}
                      </span>
                    )}

                    {!n.read && (
                      <span className="ml-auto shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                        {t("Sin leer")}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 font-semibold text-neutral-900">
                    {n.title}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-700">{n.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-xs text-neutral-600">
                      {new Date(n.createdAt).toLocaleString(getLocale(), {
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
                          rounded text-xs font-semibold text-violet-700
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:text-violet-900
                          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                        "
                      >
                        {t("Ver detalle")}
                      </Link>
                    )}

                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => marcarLeida(n.id)}
                        className="
                          ml-auto flex cursor-pointer items-center gap-1.5 rounded-xl
                          px-2 py-1 text-xs font-semibold text-neutral-600
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:bg-neutral-100 hover:text-neutral-900
                          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                        "
                      >
                        <Check size={14} aria-hidden="true" />
                        {t("Marcar como leída")}
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
