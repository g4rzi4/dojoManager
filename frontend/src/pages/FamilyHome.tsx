import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronRight, IdCard, Receipt, Users } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import EventCalendar from "../components/EventCalendar";
import { ApiError, getEvents, getMyStudents, getNotifications, getPayments } from "../services/api";
import { getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import type { MyStudent, PaymentsResponse } from "../types/payment";
import type { AppNotification } from "../types/notification";
import { BELT_LABELS, BELT_STYLES } from "../types/student";
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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Hola, {user?.name ?? "bienvenido"}
        </h1>
        <p className="mt-2 text-slate-600">
          {esTutor
            ? "Aquí puedes consultar el expediente de tus hijos, el calendario del dojo y sus pagos."
            : "Aquí puedes consultar tu expediente, el calendario del dojo y tus pagos."}
        </p>
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
              icon={Receipt}
              label="Por cubrir"
              value={formatMoney(totalPendiente)}
              hint={`${payments?.resumen.pendientes ?? 0} mensualidades`}
              alert={totalPendiente > 0}
            />
            <ShortcutCard
              to="/notificaciones"
              icon={Bell}
              label="Notificaciones"
              value={String(sinLeer)}
              hint={sinLeer === 1 ? "sin leer" : "sin leer"}
              alert={sinLeer > 0}
            />
            <ShortcutCard
              to="/eventos"
              icon={Users}
              label={esTutor ? "Hijos inscritos" : "Mi expediente"}
              value={String(students.length)}
              hint={esTutor ? "en el dojo" : "activo"}
            />
          </div>

          {/* Expedientes */}
          <section className="mt-8" aria-labelledby="titulo-expedientes">
            <h2
              id="titulo-expedientes"
              className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase"
            >
              {esTutor ? "Mis hijos" : "Mi expediente"}
            </h2>

            {students.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <IdCard size={26} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">
                  No hay expedientes ligados a tu cuenta
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {esTutor
                    ? "Pide al administrador del dojo que ligue a tus hijos a tu cuenta de tutor."
                    : "Pide al administrador del dojo que ligue tu expediente a tu cuenta."}
                </p>
              </Card>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/alumnos/${s.id}`}
                      className="
                        block rounded-2xl transition-shadow duration-200
                        motion-reduce:transition-none
                        hover:shadow-xl
                        focus:ring-2 focus:ring-blue-600 focus:outline-none
                      "
                    >
                      <Card className="cursor-pointer p-5">
                        <div className="flex items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                            {s.firstName.charAt(0).toUpperCase()}
                            {s.lastName.charAt(0).toUpperCase()}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                              {s.firstName} {s.lastName}
                            </p>
                            <span
                              className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                BELT_STYLES[s.currentBelt]
                              }`}
                            >
                              Cinta {BELT_LABELS[s.currentBelt].toLowerCase()}
                            </span>
                          </div>

                          <ChevronRight
                            size={20}
                            aria-hidden="true"
                            className="shrink-0 text-slate-400"
                          />
                        </div>

                        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
                          <div>
                            <dt className="text-xs text-slate-600">
                              Graduaciones
                            </dt>
                            <dd className="mt-0.5 font-bold text-slate-900">
                              {s.graduaciones}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-600">Clases</dt>
                            <dd className="mt-0.5 font-bold text-slate-900">
                              {s.asistencias}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-600">
                              Por pagar
                            </dt>
                            <dd
                              className={`mt-0.5 font-bold ${
                                s.totalPendienteCents > 0
                                  ? "text-amber-700"
                                  : "text-slate-900"
                              }`}
                            >
                              {formatMoney(s.totalPendienteCents)}
                            </dd>
                          </div>
                        </dl>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Calendario */}
          <section className="mt-8" aria-labelledby="titulo-calendario">
            <h2
              id="titulo-calendario"
              className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase"
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
  icon: typeof Receipt;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
};

function ShortcutCard({
  to,
  icon: Icon,
  label,
  value,
  hint,
  alert = false,
}: ShortcutCardProps) {
  return (
    <Link
      to={to}
      className="
        block rounded-2xl transition-shadow duration-200
        motion-reduce:transition-none
        hover:shadow-xl
        focus:ring-2 focus:ring-blue-600 focus:outline-none
      "
    >
      <Card className="cursor-pointer p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          <Icon size={18} aria-hidden="true" className="text-slate-400" />
        </div>
        <p
          className={`mt-2 text-2xl font-bold ${
            alert ? "text-amber-700" : "text-slate-900"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-600">{hint}</p>
      </Card>
    </Link>
  );
}

export default FamilyHome;
