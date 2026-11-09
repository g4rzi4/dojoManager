import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Pagos
        </h1>
        <p className="mt-2 text-slate-600">
          {esVistaPropia
            ? "Historial de mensualidades y lo que queda por cubrir."
            : "Historial de mensualidades de todo el dojo."}
        </p>
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
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Por cubrir
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  data.resumen.totalPendienteCents > 0
                    ? "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {formatMoney(data.resumen.totalPendienteCents)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {data.resumen.pendientes}{" "}
                {data.resumen.pendientes === 1
                  ? "mensualidad"
                  : "mensualidades"}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Registros
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {data.resumen.pagos}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                mensualidades en total
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Al día
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {data.resumen.pagos - data.resumen.pendientes}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                mensualidades pagadas
              </p>
            </Card>
          </div>

          {/* Tabla */}
          <section className="mt-6">
            {data.payments.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Receipt size={26} aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-bold text-slate-900">
                  No hay pagos registrados
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Cuando el dojo registre una mensualidad, aparecerá aquí.
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Historial de mensualidades
                    </caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
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
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {p.studentName}
                          </td>
                          <td className="px-4 py-3 text-slate-900 first-letter:uppercase">
                            {formatPeriod(p.periodYear, p.periodMonth)}
                          </td>
                          <td className="px-4 py-3 text-slate-900">
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
                          <td className="px-4 py-3 text-slate-600">
                            {p.method ? PAYMENT_METHOD_LABELS[p.method] : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 first-letter:uppercase">
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
