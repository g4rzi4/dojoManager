import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import ModuleTile from "../components/ModuleTile";
import PageHeading from "../components/PageHeading";
import EventCalendar from "../components/EventCalendar";
import FamilyStudentCards from "../components/FamilyStudentCards";
import { ApiError, getEvents, getMyStudents, getNotifications, getPayments } from "../services/api";
import { getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import type { ModuleKey } from "../lib/modules";
import type { MyStudent, PaymentsResponse } from "../types/payment";
import type { AppNotification } from "../types/notification";
import { formatMoney } from "../utils/format";

/**
 * Panel de inicio para ALUMNO y TUTOR.
 *
 * Es la misma pantalla para los dos roles, porque lo que ven es casi igual.
 * La diferencia la marca cuántos expedientes trae /students/mine: uno si es
 * alumno, los hijos a su cargo si es tutor.
 */
function FamilyHome() {
  const user = getUser();
  const esTutor = user?.role === "TUTOR";

  const [students, setStudents] = useState<MyStudent[]>([]);
  const [events, setEvents] = useState<DojoEvent[]>([]);
  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    // En paralelo: son cuatro consultas independientes y encadenarlas
    // multiplicaría por cuatro el tiempo de carga.
    Promise.all([
      getMyStudents(),
      getEvents(),
      getPayments(),
      getNotifications(),
    ])
      .then(([misAlumnos, misEventos, misPagos, misNotis]) => {
        if (!activo) return;

        setStudents(misAlumnos);
        setEvents(misEventos);
        setPayments(misPagos);
        setNotifications(misNotis.notifications);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar tu información."
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const sinLeer = notifications.filter((n) => !n.read).length;
  const totalPendiente = payments?.resumen.totalPendienteCents ?? 0;

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="inicio"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          Hola, {user?.name ?? "bienvenido"}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
          {esTutor
            ? "Aquí puedes consultar el expediente de tus hijos, el calendario del dojo y sus pagos."
            : "Aquí puedes consultar tu expediente, el calendario del dojo y tus pagos."}
        </p></PageHeading>
      </header>

      {error && (
        <Card className="mt-6 border-red-200 p-6">
          <p className="font-semibold text-red-800">
            No se pudo cargar la información
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="mt-8 space-y-6">
          <Card className="h-32 animate-pulse motion-reduce:animate-none" />
          <Card className="h-96 animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          {/* Atajos */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ShortcutCard
              to="/pagos"
              module="pagos"
              label="Por cubrir"
              value={formatMoney(totalPendiente)}
              hint={`${payments?.resumen.pendientes ?? 0} mensualidades`}
              alert={totalPendiente > 0}
            />
            <ShortcutCard
              to="/notificaciones"
              module="notificaciones"
              label="Notificaciones"
              value={String(sinLeer)}
              hint="sin leer"
              alert={sinLeer > 0}
            />
            <ShortcutCard
              to="/eventos"
              module="alumnos"
              label={esTutor ? "Hijos inscritos" : "Mi expediente"}
              value={String(students.length)}
              hint={esTutor ? "en el dojo" : "activo"}
            />
          </div>

          {/* Expedientes completos */}
          <section className="mt-8" aria-labelledby="titulo-expedientes">
            <h2
              id="titulo-expedientes"
              className="mb-4 text-lg font-bold text-neutral-800"
            >
              {esTutor
                ? students.length > 1
                  ? "Tarjetas de mis hijos"
                  : "Tarjeta de mi hijo"
                : "Mi tarjeta"}
            </h2>

            <FamilyStudentCards students={students} />
          </section>

          {/* Calendario */}
          <section className="mt-8" aria-labelledby="titulo-calendario">
            <h2
              id="titulo-calendario"
              className="mb-4 text-lg font-bold text-neutral-800"
            >
              Calendario del dojo
            </h2>
            <EventCalendar events={events} />
          </section>
        </>
      )}
    </DashboardLayout>
  );
}

type ShortcutCardProps = {
  to: string;
  module: ModuleKey;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
};

function ShortcutCard({
  to,
  module,
  label,
  value,
  hint,
  alert = false,
}: ShortcutCardProps) {
  return (
    <Link
      to={to}
      className="
        block rounded-[1.75rem] transition-transform duration-200
        motion-reduce:transition-none
        hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
      "
    >
      <Card className="flex cursor-pointer items-center gap-4 p-5">
        <ModuleTile module={module} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-600">{label}</p>
          <p
            className={`text-[1.75rem] leading-tight font-bold ${
              alert ? "text-amber-700" : "text-neutral-800"
            }`}
          >
            {value}
          </p>
          <p className="text-sm text-neutral-600">{hint}</p>
        </div>
      </Card>
    </Link>
  );
}

export default FamilyHome;
