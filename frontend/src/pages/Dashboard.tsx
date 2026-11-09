import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import EventCalendar from "../components/EventCalendar";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { getUser } from "../services/session";
import { getEvents } from "../services/api";
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
        <PageHeading module="inicio"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          Hola, {user?.name ?? "Administrador"}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
          Este es el panel de administración de tu dojo.
        </p></PageHeading>
      </header>

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
