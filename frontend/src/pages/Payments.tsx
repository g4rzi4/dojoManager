import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import PagarConPayPal from "../components/PagarConPayPal";
import { ApiError, getPayments } from "../services/api";
import { can, getUser } from "../services/session";
import type { PaymentsResponse } from "../types/payment";
import { PAYMENT_METHOD_LABELS } from "../types/payment";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "../types/student";
import { formatLongDate, fromDateKey } from "../utils/date";
import { formatMoney, formatPeriod } from "../utils/format";

function Payments() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  // Pagan las familias. Un profesor también ve "propios" (su grupo), pero
  // esas mensualidades no le toca pagarlas a él.
  const puedePagar = !can(getUser(), "events:write");

  useEffect(() => {
    let activo = true;

    getPayments()
      .then((res) => {
        if (activo) setData(res);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar los pagos."
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [recarga]);

  // El alcance lo decide el backend según el rol, no el frontend.
  const esVistaPropia = data?.alcance === "propios";

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="pagos"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          Pagos
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
          {esVistaPropia
            ? "Historial de mensualidades y lo que queda por cubrir."
            : "Historial de mensualidades de todo el dojo."}
        </p></PageHeading>
      </header>

      {loading ? (
        <div className="mt-8 space-y-3">
          <Card className="h-24 animate-pulse motion-reduce:animate-none" />
          <Card className="h-64 animate-pulse motion-reduce:animate-none" />
        </div>
      ) : error ? (
        <Card className="mt-8 border-red-200 p-6">
          <p className="font-semibold text-red-800">
            No se pudieron cargar los pagos
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      ) : data ? (
        <>
          {/* Resumen */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-semibold text-neutral-600">
                Por cubrir
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  data.resumen.totalPendienteCents > 0
                    ? "text-amber-700"
                    : "text-neutral-900"
                }`}
              >
                {formatMoney(data.resumen.totalPendienteCents)}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {data.resumen.pendientes}{" "}
                {data.resumen.pendientes === 1
                  ? "mensualidad"
                  : "mensualidades"}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-semibold text-neutral-600">
                Registros
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {data.resumen.pagos}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                mensualidades en total
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-semibold text-neutral-600">
                Al día
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {data.resumen.pagos - data.resumen.pendientes}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                mensualidades pagadas
              </p>
            </Card>
          </div>

          {/* Tabla */}
          <section className="mt-6">
            {data.payments.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
                  <Receipt size={26} aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-bold text-neutral-900">
                  No hay pagos registrados
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Cuando el dojo registre una mensualidad, aparecerá aquí.
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-neutral-100 md:hidden">
                  {data.payments.map((p) => (
                    <li key={p.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold break-words text-neutral-800">
                            {p.studentName}
                          </p>
                          <p className="text-sm text-neutral-600 first-letter:uppercase">
                            {formatPeriod(p.periodYear, p.periodMonth)}
                          </p>
                        </div>
                        <p className="shrink-0 font-bold text-neutral-800">
                          {formatMoney(p.amountCents)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            PAYMENT_STATUS_STYLES[p.status]
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </span>
                        {p.method && (
                          <span className="text-sm text-neutral-600">
                            {PAYMENT_METHOD_LABELS[p.method]}
                          </span>
                        )}
                        {puedePagar && p.status !== "PAGADO" && (
                          <div className="ml-auto">
                            <PagarConPayPal
                              tipo="MENSUALIDAD"
                              id={p.id}
                              onPagado={() => setRecarga((n) => n + 1)}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="relative hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Historial de mensualidades
                    </caption>
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-600">
                        {/* La columna de alumno sirve en los dos casos: el
                            tutor puede tener varios hijos. */}
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Alumno
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Mes
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Monto
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Estado
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Método
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Fecha de pago
                        </th>
                        {puedePagar && (
                          <th scope="col" className="px-4 py-3 font-semibold">
                            <span className="sr-only">Pagar</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-neutral-100 last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-neutral-900">
                            {p.studentName}
                          </td>
                          <td className="px-4 py-3 text-neutral-900 first-letter:uppercase">
                            {formatPeriod(p.periodYear, p.periodMonth)}
                          </td>
                          <td className="px-4 py-3 text-neutral-900">
                            {formatMoney(p.amountCents)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                PAYMENT_STATUS_STYLES[p.status]
                              }`}
                            >
                              {PAYMENT_STATUS_LABELS[p.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {p.method ? PAYMENT_METHOD_LABELS[p.method] : "—"}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 first-letter:uppercase">
                            {p.paidAt
                              ? formatLongDate(fromDateKey(p.paidAt))
                              : "—"}
                          </td>
                          {puedePagar && (
                            <td className="px-4 py-3">
                              {p.status !== "PAGADO" && (
                                <PagarConPayPal
                                  tipo="MENSUALIDAD"
                                  id={p.id}
                                  onPagado={() => setRecarga((n) => n + 1)}
                                />
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </>
      ) : null}
    </DashboardLayout>
  );
}

export default Payments;
