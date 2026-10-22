import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import EventCalendar from "../components/EventCalendar";
import Card from "../components/Card";
import { getUser } from "../services/session";
import { getEvents } from "../services/events";
import type { DojoEvent } from "../types/event";

function Dashboard() {
  const user = getUser();

  const [events, setEvents] = useState<DojoEvent[]>([]);
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

    return () => {
      activo = false;
    };
  }, []);

  return (
    <DashboardLayout>
      {/* Saludo */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Hola, {user?.name ?? "Administrador"}
        </h1>
        <p className="mt-2 text-slate-600">
          Este es el panel de administración de tu dojo.
        </p>
      </header>

      {/* Calendario de eventos */}
      <section className="mt-8" aria-labelledby="titulo-calendario">
        <h2
          id="titulo-calendario"
          className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase"
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
