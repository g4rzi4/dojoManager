import { useEffect, useState } from "react";
import { Check, Trophy } from "lucide-react";

import Card from "./Card";
import {
  BELT_LABELS,
  BELT_STYLES,
  type Belt,
  type BeltPromotionEntry,
} from "../types/student";
import { fromDateKey } from "../utils/date";

/** El orden de las cintas sale del catálogo, de blanca a negra. */
const CINTAS = Object.keys(BELT_LABELS) as Belt[];

type Props = {
  currentBelt: Belt;
  graduaciones: BeltPromotionEntry[];
};

function fechaCorta(key: string): string {
  return fromDateKey(key).toLocaleDateString("es-MX", {
    month: "short",
    year: "numeric",
  });
}

/**
 * El avance del alumno hacia la cinta negra.
 *
 * Marca las cintas que ya obtuvo, con la fecha de su graduación si está
 * registrada, y resalta la actual. Las graduaciones pueden faltar en alumnos
 * que llegaron con cinta: por eso lo obtenido se decide por la cinta actual y
 * no por el historial.
 */
function CaminoDeCintas({ currentBelt, graduaciones }: Props) {
  const actual = CINTAS.indexOf(currentBelt);
  const avance = Math.round((actual / (CINTAS.length - 1)) * 100);
  const siguiente = CINTAS[actual + 1];

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // La graduación más reciente a cada cinta. El historial viene del más
  // reciente al más viejo, así que la primera que aparece gana.
  const fechas = new Map<Belt, string>();
  for (const g of graduaciones) {
    if (!fechas.has(g.belt)) fechas.set(g.belt, g.promotedAt);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-neutral-800">
            Camino a la cinta negra
          </h3>
          <p className="text-sm text-neutral-600">
            {siguiente
              ? `Siguiente meta: cinta ${BELT_LABELS[siguiente].toLowerCase()}`
              : "Llegó a la cinta más alta del dojo"}
          </p>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700 tabular-nums">
          {!siguiente && <Trophy size={15} aria-hidden="true" />}
          {avance}% recorrido
        </span>
      </div>

      {/* Barra de avance */}
      <div
        role="progressbar"
        aria-label="Avance hacia la cinta negra"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={avance}
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: visible ? `${avance}%` : "0%" }}
        />
      </div>

      {/* Cintas */}
      <ol className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-7">
        {CINTAS.map((cinta, i) => {
          const obtenida = i <= actual;
          const esActual = i === actual;
          const fecha = fechas.get(cinta);

          return (
            <li
              key={cinta}
              className="flex flex-col items-center gap-2 text-center"
              aria-current={esActual ? "step" : undefined}
            >
              <span
                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-transform duration-300 motion-reduce:transition-none ${
                  BELT_STYLES[cinta]
                } ${obtenida ? "" : "opacity-30 grayscale"} ${
                  esActual
                    ? "scale-110 ring-4 ring-violet-200 ring-offset-2"
                    : ""
                }`}
              >
                {obtenida && !esActual && (
                  <Check size={18} strokeWidth={3} aria-hidden="true" />
                )}
                {esActual && (
                  <span
                    aria-hidden="true"
                    className="absolute -inset-1 animate-ping rounded-2xl border-2 border-violet-400 opacity-40 motion-reduce:hidden"
                  />
                )}
              </span>

              <span
                className={`text-xs leading-tight ${
                  esActual
                    ? "font-bold text-violet-700"
                    : obtenida
                      ? "font-semibold text-neutral-800"
                      : "text-neutral-500"
                }`}
              >
                {BELT_LABELS[cinta]}
                <span className="sr-only">
                  {esActual
                    ? " (cinta actual)"
                    : obtenida
                      ? " (obtenida)"
                      : " (pendiente)"}
                </span>
              </span>

              {fecha && (
                <span className="-mt-1 text-[0.7rem] text-neutral-500">
                  {fechaCorta(fecha)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export default CaminoDeCintas;
