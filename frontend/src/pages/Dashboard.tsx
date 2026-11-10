import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import EventCalendar from "../components/EventCalendar";
import IngresosDelDojo from "../components/IngresosDelDojo";
import Card from "../components/Card";
import ShortcutCard from "../components/ShortcutCard";
import PageHeading from "../components/PageHeading";
import { getUser } from "../services/session";
import { getEvents, getPayments } from "../services/api";
import type { DojoEvent } from "../types/event";
import type { PaymentsResponse } from "../types/payment";
import { formatLongDate, fromDateKey, toDateKey } from "../utils/date";
import { formatMoney } from "../utils/format";

function Dashboard() {
  const user = getUser();

  const [events, setEvents] = useState<DojoEvent[]>([]);
  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    getEvents()
      .then((data) => {
        // Evita escribir estado si el componente ya se desmontó.
        if (activo) setEvents(data);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    getPayments()
      .then((data) => {
        if (activo) setPayments(data);
      })
      // Sin este resumen el calendario sigue siendo útil.
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  // Las fechas son "AAAA-MM-DD" y vienen en orden, así que basta comparar texto.
  const hoy = toDateKey(new Date());
  const proximo = events.find((e) => e.date >= hoy);
  const pendientes = payments?.resumen.pendientes ?? 0;

  return (
    <DashboardLayout>
      {/* Saludo */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading module="inicio"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          Hola, {user?.name ?? "Administrador"}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
          Este es el panel de administración de tu dojo.
        </p></PageHeading>

        <Link
          to="/pagos"
          className="
            flex min-h-11 items-center rounded-2xl bg-violet-600 px-4 py-2.5 text-sm
            font-semibold text-white transition-colors duration-200
            motion-reduce:transition-none hover:bg-violet-700
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
          "
        >
          Ver pagos
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ShortcutCard
          to="/pagos"
          module="pagos"
          label="Por cubrir"
          value={payments ? formatMoney(payments.resumen.totalPendienteCents) : "—"}
          hint={`${pendientes} ${pendientes === 1 ? "cobro" : "cobros"}`}
          alert={pendientes > 0}
        />
        <ShortcutCard
          to="/eventos"
          module="eventos"
          label="Próximo evento"
          value={proximo ? proximo.title : "Sin eventos"}
          hint={
            proximo
              ? formatLongDate(fromDateKey(proximo.date))
              : "No hay eventos próximos"
          }
        />
      </div>

      {/* Ingresos y métodos de pago */}
      {payments && (
        <section className="mt-8" aria-label="Ingresos del dojo">
          <IngresosDelDojo payments={payments.payments} />
        </section>
      )}

      {/* Calendario de eventos */}
      <section className="mt-8" aria-labelledby="titulo-calendario">
        <h2
          id="titulo-calendario"
          className="mb-4 text-lg font-bold text-neutral-800"
        >
          Calendario de eventos
        </h2>

        {loading ? (
          // Reserva el espacio del calendario para que la página no salte
          // cuando terminen de cargar los eventos.
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card className="h-[30rem] animate-pulse motion-reduce:animate-none" />
            <Card className="h-[30rem] animate-pulse motion-reduce:animate-none" />
          </div>
        ) : (
          <EventCalendar events={events} />
        )}
      </section>
    </DashboardLayout>
  );
}

export default Dashboard;
