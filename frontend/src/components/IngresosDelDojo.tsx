import { useEffect, useState } from "react";

import Card from "./Card";
import ModuleTile from "./ModuleTile";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentRow,
} from "../types/payment";
import { MONTH_NAMES } from "../utils/date";
import { formatMoney } from "../utils/format";

/** Cuántos meses hacia atrás muestra la gráfica, contando el actual. */
const MESES = 6;

const METODOS: { method: PaymentMethod; color: string }[] = [
  { method: "PAYPAL", color: "bg-sky-500" },
  { method: "EFECTIVO", color: "bg-emerald-500" },
  { method: "TRANSFERENCIA", color: "bg-amber-400" },
];

type Props = {
  payments: PaymentRow[];
};

/**
 * Lo cobrado en los últimos meses y cómo se pagó.
 *
 * Se calcula con los cobros que el panel ya descarga, sin pedir nada nuevo al
 * backend. Solo cuenta lo PAGADO y con fecha: lo que está por confirmar
 * todavía no es dinero en caja.
 */
function IngresosDelDojo({ payments }: Props) {
  // Las barras crecen desde cero al montar. Con reduced motion la transición
  // se desactiva y aparecen directamente a su altura.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const pagados = payments.filter(
    (p) => p.estado === "PAGADO" && p.paidAt && p.amountCents
  );

  // Claves "AAAA-MM" de los últimos meses, del más viejo al actual.
  const hoy = new Date();
  const meses = Array.from({ length: MESES }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES - 1 - i), 1);
    return {
      clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      nombre: MONTH_NAMES[d.getMonth()],
      totalCents: 0,
    };
  });

  for (const p of pagados) {
    const mes = meses.find((m) => p.paidAt!.startsWith(m.clave));
    if (mes) mes.totalCents += p.amountCents!;
  }

  const maximo = Math.max(...meses.map((m) => m.totalCents), 1);
  const totalPeriodo = meses.reduce((s, m) => s + m.totalCents, 0);

  const porMetodo = METODOS.map(({ method, color }) => ({
    method,
    color,
    totalCents: pagados
      .filter((p) => p.method === method)
      .reduce((s, p) => s + p.amountCents!, 0),
  }));
  const totalMetodos = porMetodo.reduce((s, m) => s + m.totalCents, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Ingresos por mes */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ModuleTile module="pagos" size="sm" />
            <div>
              <h2 className="text-lg font-bold text-neutral-800">
                Ingresos de los últimos {MESES} meses
              </h2>
              <p className="text-sm text-neutral-600">
                Cobros confirmados como pagados
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold text-violet-700 tabular-nums">
            {formatMoney(totalPeriodo)}
          </p>
        </div>

        {totalPeriodo === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-600">
            Todavía no hay cobros pagados en este periodo. Cuando se confirmen,
            aparecerán aquí.
          </p>
        ) : (
          <ol className="mt-6 flex h-52 items-end gap-2 sm:gap-4">
            {meses.map((m, i) => {
              const altura = (m.totalCents / maximo) * 100;
              const actual = i === meses.length - 1;

              return (
                <li
                  key={m.clave}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[0.7rem] font-semibold text-neutral-600 tabular-nums opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none sm:text-xs">
                    {formatMoney(m.totalCents)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`w-full max-w-14 rounded-t-xl rounded-b-md transition-[height] duration-700 ease-out motion-reduce:transition-none ${
                      actual
                        ? "bg-gradient-to-t from-violet-600 to-fuchsia-500"
                        : "bg-violet-200 group-hover:bg-violet-300"
                    }`}
                    style={{
                      height: visible ? `${Math.max(altura, m.totalCents ? 4 : 1)}%` : "0%",
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                  <span
                    className={`text-xs capitalize ${
                      actual ? "font-bold text-violet-700" : "text-neutral-600"
                    }`}
                  >
                    {m.nombre.slice(0, 3)}
                    <span className="sr-only">
                      : {formatMoney(m.totalCents)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {/* Cómo pagan las familias */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-neutral-800">
          Cómo pagan las familias
        </h2>
        <p className="text-sm text-neutral-600">Todo lo cobrado, por método</p>

        {totalMetodos === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-600">
            Aún no hay pagos registrados.
          </p>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="mt-6 flex h-4 overflow-hidden rounded-full bg-neutral-100"
            >
              {porMetodo.map(({ method, color, totalCents }) => (
                <span
                  key={method}
                  className={`${color} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
                  style={{
                    width: visible ? `${(totalCents / totalMetodos) * 100}%` : "0%",
                  }}
                />
              ))}
            </div>

            <ul className="mt-5 space-y-3">
              {porMetodo.map(({ method, color, totalCents }) => (
                <li
                  key={method}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-neutral-700">
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full ${color}`}
                    />
                    {PAYMENT_METHOD_LABELS[method]}
                  </span>
                  <span className="text-neutral-600 tabular-nums">
                    {formatMoney(totalCents)}
                    <span className="ml-2 inline-block w-10 text-right font-semibold text-neutral-800">
                      {Math.round((totalCents / totalMetodos) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

export default IngresosDelDojo;
