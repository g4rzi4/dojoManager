import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import { getEvents } from "../services/events";
import type { DojoEvent } from "../types/event";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "../types/event";
import { formatLongDate, fromDateKey, toDateKey } from "../utils/date";

function Events() {
  const [events, setEvents] = useState<DojoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    getEvents()
      .then((data) => {
        if (activo) setEvents(data);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

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
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Eventos
        </h1>
        <p className="mt-2 text-slate-600">
          Clases, exámenes de cinturón, torneos y fechas de cobro.
        </p>
      </header>

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
              Los eventos que programes aparecerán aquí.
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
