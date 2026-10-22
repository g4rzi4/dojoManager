import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Clock, Trash2 } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import EventForm from "../components/EventForm";
import { ApiError, deleteEvent, getEvents } from "../services/api";
import { can, getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "../types/event";
import { formatLongDate, fromDateKey, toDateKey } from "../utils/date";

function Events() {
  const user = getUser();
  const puedeEditar = can(user, "events:write");

  const [events, setEvents] = useState<DojoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  function cargar() {
    return getEvents()
      .then(setEvents)
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? e.message
            : "No fue posible cargar los eventos."
        );
      });
  }

  useEffect(() => {
    let activo = true;

    getEvents()
      .then((data) => {
        if (activo) setEvents(data);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar los eventos."
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

  async function quitar(event: DojoEvent) {
    // Confirmación antes de borrar: es irreversible y un clic de más en una
    // lista es fácil.
    const seguro = window.confirm(
      `¿Quitar "${event.title}" del calendario? No se puede deshacer.`
    );

    if (!seguro) return;

    setBorrando(event.id);
    setError("");

    try {
      await deleteEvent(event.id);
      await cargar();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No fue posible quitar el evento."
      );
    } finally {
      setBorrando(null);
    }
  }

  /** Eventos de hoy en adelante, agrupados por día y en orden cronológico. */
  const upcomingByDay = useMemo(() => {
    const todayKey = toDateKey(new Date());

    const upcoming = events
      .filter((event) => event.date >= todayKey)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? "")
      );

    const grouped = new Map<string, DojoEvent[]>();

    for (const event of upcoming) {
      const list = grouped.get(event.date);
      if (list) {
        list.push(event);
      } else {
        grouped.set(event.date, [event]);
      }
    }

    return [...grouped.entries()];
  }, [events]);

  return (
    <DashboardLayout>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Eventos
          </h1>
          <p className="mt-2 text-slate-600">
            Clases, exámenes de cinturón, torneos y fechas de cobro.
          </p>
        </div>

        {puedeEditar && (
          <button
            type="button"
            onClick={() => setAgregando((v) => !v)}
            aria-expanded={agregando}
            className="
              flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600
              px-4 py-2.5 text-sm font-semibold text-white
              transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
            "
          >
            <CalendarPlus size={17} aria-hidden="true" />
            Agregar evento
          </button>
        )}
      </header>

      {agregando && puedeEditar && (
        <div className="mt-6">
          <EventForm
            onCreado={async () => {
              setAgregando(false);
              await cargar();
            }}
            onCancelar={() => setAgregando(false)}
          />
        </div>
      )}

      {error && (
        <Card className="mt-6 border-red-200 p-6">
          <p className="font-semibold text-red-800">Ocurrió un problema</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      )}

      <section className="mt-8" aria-label="Próximos eventos">
        {loading ? (
          <div className="space-y-3">
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
          </div>
        ) : upcomingByDay.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CalendarDays size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-slate-900">
              No hay eventos próximos
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {puedeEditar
                ? "Agrega el primero con el botón de arriba."
                : "Los eventos que programe el dojo aparecerán aquí."}
            </p>
          </Card>
        ) : (
          <ul className="space-y-6">
            {upcomingByDay.map(([dateKey, dayEvents]) => (
              <li key={dateKey}>
                <h2 className="text-sm font-semibold text-slate-900 first-letter:uppercase">
                  {formatLongDate(fromDateKey(dateKey))}
                </h2>

                <ul className="mt-3 space-y-2">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <Card className="flex items-center gap-4 p-4">
                        <span
                          className={`h-10 w-1.5 shrink-0 rounded-full ${
                            CATEGORY_STYLES[event.category].dot
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">
                            {event.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                            {event.time ? (
                              <>
                                <Clock size={14} aria-hidden="true" />
                                {event.time}
                              </>
                            ) : (
                              "Todo el día"
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                            CATEGORY_STYLES[event.category].chip
                          }`}
                        >
                          {CATEGORY_LABELS[event.category]}
                        </span>

                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => quitar(event)}
                            disabled={borrando === event.id}
                            aria-label={`Quitar ${event.title} del calendario`}
                            className="
                              flex h-11 w-11 shrink-0 cursor-pointer items-center
                              justify-center rounded-lg text-slate-500
                              transition-colors duration-200
                              motion-reduce:transition-none
                              hover:bg-red-50 hover:text-red-700
                              focus:ring-2 focus:ring-blue-600 focus:outline-none
                              disabled:cursor-not-allowed disabled:opacity-50
                            "
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Events;
