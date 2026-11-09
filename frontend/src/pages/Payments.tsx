import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import ModuleTile from "../components/ModuleTile";
import PageHeading from "../components/PageHeading";
import OpcionesDePago from "../components/OpcionesDePago";
import type { ModuleKey } from "../lib/modules";
import { ApiError, getPayments, resolveCharge } from "../services/api";
import { can, getUser } from "../services/session";
import type {
  ChargeStatus,
  ChargeType,
  PaymentRow,
  PaymentsResponse,
} from "../types/payment";
import {
  CHARGE_STATUS_LABELS,
  CHARGE_STATUS_STYLES,
  CHARGE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../types/payment";
import { formatLongDate, fromDateKey } from "../utils/date";
import { formatMoney, formatPeriod } from "../utils/format";

/** Cada cobro lleva el color del módulo del que viene. */
const MODULO_DE_COBRO: Record<ChargeType, ModuleKey> = {
  MENSUALIDAD: "pagos",
  EVENTO: "eventos",
  EQUIPO: "equipo",
};

type Filtro = "TODOS" | "PENDIENTES" | "PAGADOS";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "PENDIENTES", etiqueta: "Pendientes" },
  { valor: "PAGADOS", etiqueta: "Pagados" },
];

const ABIERTOS: ChargeStatus[] = [
  "PENDIENTE",
  "VENCIDO",
  "POR_CONFIRMAR",
  "EN_REVISION",
];

function coincide(fila: PaymentRow, filtro: Filtro): boolean {
  if (filtro === "PAGADOS") return fila.estado === "PAGADO";
  if (filtro === "PENDIENTES") return ABIERTOS.includes(fila.estado);

  return true;
}

function conceptoDe(fila: PaymentRow): string {
  if (fila.concepto) return fila.concepto;

  return fila.periodYear && fila.periodMonth
    ? formatPeriod(fila.periodYear, fila.periodMonth)
    : CHARGE_TYPE_LABELS[fila.tipo];
}

function montoDe(fila: PaymentRow): string {
  return fila.amountCents === null
    ? "Por confirmar"
    : formatMoney(fila.amountCents);
}

function Payments() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  // Pagan las familias. Un profesor también ve "propios" (su grupo), pero
  // esos cobros no le toca pagarlos a él.
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

  const recargar = () => setRecarga((n) => n + 1);
  const visibles = data?.payments.filter((p) => coincide(p, filtro)) ?? [];

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="pagos">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            Pagos
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            Mensualidades, eventos, uniformes y protecciones: lo pagado y lo
            que queda por cubrir.
          </p>
        </PageHeading>
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card className="col-span-2 p-4 sm:col-span-1">
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
                {data.resumen.pendientes === 1 ? "cobro" : "cobros"}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-semibold text-neutral-600">
                Registros
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {data.resumen.pagos}
              </p>
              <p className="mt-1 text-xs text-neutral-600">cobros en total</p>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-semibold text-neutral-600">Al día</p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {data.resumen.pagados}
              </p>
              <p className="mt-1 text-xs text-neutral-600">cobros pagados</p>
            </Card>
          </div>

          {/* Historial */}
          <section className="mt-6">
            {data.payments.length > 0 && (
              <div
                role="group"
                aria-label="Filtrar cobros"
                className="mb-4 flex w-fit rounded-2xl border border-neutral-300 bg-white p-1"
              >
                {FILTROS.map(({ valor, etiqueta }) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltro(valor)}
                    aria-pressed={filtro === valor}
                    className={`
                      min-h-9 cursor-pointer rounded-xl px-3 py-1.5 text-sm font-semibold
                      transition-colors duration-200 motion-reduce:transition-none
                      focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                      ${
                        filtro === valor
                          ? "bg-violet-50 text-violet-700"
                          : "text-neutral-600 hover:text-neutral-900"
                      }
                    `}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            )}

            {visibles.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
                  <Receipt size={26} aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-bold text-neutral-900">
                  {data.payments.length === 0
                    ? "No hay pagos registrados"
                    : "No hay cobros con ese filtro"}
                </h2>
                {data.payments.length === 0 && (
                  <p className="mt-2 text-sm text-neutral-600">
                    Cuando haya una mensualidad, un evento o una solicitud de
                    equipo, aparecerá aquí.
                  </p>
                )}
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-neutral-100 md:hidden">
                  {visibles.map((p) => (
                    <li key={`${p.tipo}-${p.id}`} className="p-4">
                      <div className="flex items-start gap-3">
                        <ModuleTile
                          module={MODULO_DE_COBRO[p.tipo]}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold break-words text-neutral-800 first-letter:uppercase">
                            {conceptoDe(p)}
                          </p>
                          <p className="text-sm break-words text-neutral-600">
                            {CHARGE_TYPE_LABELS[p.tipo]} · {p.studentName}
                          </p>
                        </div>
                        <p className="shrink-0 font-bold text-neutral-800">
                          {montoDe(p)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <EstadoCobro estado={p.estado} />
                        {p.method && (
                          <span className="text-sm text-neutral-600">
                            {PAYMENT_METHOD_LABELS[p.method]}
                          </span>
                        )}
                        <div className="ml-auto">
                          <AccionesCobro
                            fila={p}
                            esFamilia={puedePagar}
                            onCambio={recargar}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="relative hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Historial de cobros</caption>
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-600">
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Concepto
                        </th>
                        {/* Sirve en todos los casos: el tutor puede tener
                            varios hijos. */}
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Alumno
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
                        <th scope="col" className="px-4 py-3 font-semibold">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((p) => (
                        <tr
                          key={`${p.tipo}-${p.id}`}
                          className="border-b border-neutral-100 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ModuleTile
                                module={MODULO_DE_COBRO[p.tipo]}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold break-words text-neutral-900 first-letter:uppercase">
                                  {conceptoDe(p)}
                                </p>
                                <p className="text-xs text-neutral-600">
                                  {CHARGE_TYPE_LABELS[p.tipo]}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-neutral-900">
                            {p.studentName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-neutral-900">
                            {montoDe(p)}
                          </td>
                          <td className="px-4 py-3">
                            <EstadoCobro estado={p.estado} />
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {p.method ? PAYMENT_METHOD_LABELS[p.method] : "—"}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 first-letter:uppercase">
                            {p.paidAt
                              ? formatLongDate(fromDateKey(p.paidAt))
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <AccionesCobro
                              fila={p}
                              esFamilia={puedePagar}
                              onCambio={recargar}
                            />
                          </td>
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

/** La familia paga; el admin o el profesor confirman lo que le reportaron. */
function AccionesCobro({
  fila,
  esFamilia,
  onCambio,
}: {
  fila: PaymentRow;
  esFamilia: boolean;
  onCambio: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function resolver(confirmar: boolean) {
    setGuardando(true);
    setError("");

    try {
      await resolveCharge(fila.tipo, fila.id, confirmar);
      onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No fue posible guardar el cambio."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (esFamilia) {
    return fila.pagable ? (
      <OpcionesDePago tipo={fila.tipo} id={fila.id} onCambio={onCambio} />
    ) : null;
  }

  if (fila.estado !== "POR_CONFIRMAR") return null;

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={() => resolver(true)}
          className="
            min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm
            font-semibold whitespace-nowrap text-white transition-colors duration-200
            motion-reduce:transition-none hover:bg-violet-700
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          Confirmar pago
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => resolver(false)}
          className="
            min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-white px-4
            py-2 text-sm font-semibold whitespace-nowrap text-neutral-700
            transition-colors duration-200 motion-reduce:transition-none hover:bg-neutral-50
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          No lo recibí
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function EstadoCobro({ estado }: { estado: ChargeStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CHARGE_STATUS_STYLES[estado]}`}
    >
      {CHARGE_STATUS_LABELS[estado]}
    </span>
  );
}

export default Payments;
