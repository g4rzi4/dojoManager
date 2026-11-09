import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import Card from "./Card";
import type { DojoEvent } from "../types/event";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "../types/event";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatLongDate,
  isSameDay,
  toDateKey,
} from "../utils/date";

type Props = {
  events: DojoEvent[];
};

function EventCalendar({ events }: Props) {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<Date>(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Agrupa los eventos por día una sola vez, en lugar de filtrar la lista
  // completa dentro de cada una de las 42 celdas.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DojoEvent[]>();

    for (const event of events) {
      const list = map.get(event.date);
      if (list) {
        list.push(event);
      } else {
        map.set(event.date, [event]);
      }
    }

    // Los eventos sin hora van primero; el resto en orden cronológico.
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }

    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const selectedEvents = eventsByDay.get(toDateKey(selected)) ?? [];

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(today);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {/* Cuadrícula del mes */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-900">
            <span className="capitalize">{MONTH_NAMES[month]}</span> {year}
          </h2>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToToday}
              className="
                mr-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold
                text-violet-700 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-violet-50
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              "
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Mes anterior"
              className="
                flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl
                text-neutral-600 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-neutral-100 hover:text-neutral-900
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              "
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Mes siguiente"
              className="
                flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl
                text-neutral-600 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-neutral-100 hover:text-neutral-900
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              "
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Encabezado de días */}
        <div className="mt-5 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-2 text-center text-xs font-semibold text-neutral-600"
              aria-hidden="true"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const dayEvents = eventsByDay.get(toDateKey(day)) ?? [];
            const inMonth = day.getMonth() === month;
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selected);

            return (
              <button
                key={day.getTime()}
                type="button"
                onClick={() => setSelected(day)}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${formatLongDate(day)}${
                  dayEvents.length > 0
                    ? `, ${dayEvents.length} ${
                        dayEvents.length === 1 ? "evento" : "eventos"
                      }`
                    : ", sin eventos"
                }`}
                className={`
                  flex min-h-16 cursor-pointer flex-col items-center gap-1 rounded-2xl
                  px-1 py-2 transition-colors duration-200
                  motion-reduce:transition-none
                  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                  ${
                    isSelected
                      ? "bg-violet-600 text-white"
                      : inMonth
                        ? "text-neutral-900 hover:bg-neutral-100"
                        : "text-neutral-400 hover:bg-neutral-50"
                  }
                `}
              >
                <span
                  className={`
                    flex h-7 w-7 items-center justify-center rounded-full text-sm
                    ${
                      isToday && !isSelected
                        ? "bg-violet-100 font-bold text-violet-800"
                        : isSelected
                          ? "font-bold"
                          : "font-medium"
                    }
                  `}
                >
                  {day.getDate()}
                </span>

                {/* Máximo 3 puntos; si hay más, se indica con "+n" */}
                {dayEvents.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected
                            ? "bg-white"
                            : CATEGORY_STYLES[event.category].dot
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span
                        className={`text-[10px] font-semibold ${
                          isSelected ? "text-white" : "text-neutral-600"
                        }`}
                      >
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-200 pt-4">
          {(
            Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>
          ).map((category) => (
            <span
              key={category}
              className="flex items-center gap-2 text-xs text-neutral-700"
            >
              <span
                className={`h-2 w-2 rounded-full ${CATEGORY_STYLES[category].dot}`}
              />
              {CATEGORY_LABELS[category]}
            </span>
          ))}
        </div>
      </Card>

      {/* Detalle del día seleccionado */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold text-neutral-800">
          {isSameDay(selected, today) ? "Hoy" : "Día seleccionado"}
        </h3>

        <p className="mt-1 font-bold text-neutral-900 first-letter:uppercase">
          {formatLongDate(selected)}
        </p>

        {selectedEvents.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-600">
            No hay eventos programados para este día.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {selectedEvents.map((event) => (
              <li
                key={event.id}
                className={`rounded-2xl border p-3 ${
                  CATEGORY_STYLES[event.category].chip
                }`}
              >
                <p className="text-sm font-semibold">{event.title}</p>

                <p className="mt-1 flex items-center gap-1.5 text-xs opacity-90">
                  {event.time ? (
                    <>
                      <Clock size={13} aria-hidden="true" />
                      {event.time}
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  {CATEGORY_LABELS[event.category]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default EventCalendar;
