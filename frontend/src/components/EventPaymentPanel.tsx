import { useEffect, useState } from "react";
import { Check, KeyRound, Receipt, X } from "lucide-react";

import Card from "./Card";
import {
  ApiError,
  getEventEnrollments,
  reportEventPayment,
  resolveEventPayment,
} from "../services/api";
import { can, getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import type { EventEnrollment } from "../types/eventPayment";
import {
  EVENT_PAYMENT_LABELS,
  EVENT_PAYMENT_STYLES,
} from "../types/eventPayment";
import type { MyStudent } from "../types/payment";
import { formatMoney } from "../utils/format";

type Props = {
  event: DojoEvent;
  /** Alumnos a cargo de quien consulta. Vacío para admin y profesores. */
  misAlumnos: MyStudent[];
  onCambio: () => void | Promise<void>;
};

/**
 * Pago e inscripción a un evento.
 *
 * Muestra una cosa distinta según quién lo abra:
 *
 *  - ALUMNO o TUTOR: el formulario para reportar que ya pagó, con la clave
 *    que le dio su profesor.
 *  - PROFESOR o ADMIN: la lista de reportes para confirmar o rechazar.
 *
 * El profesor solo ve los acreditados a SU clave; el admin, todos. Eso lo
 * decide el backend, no esta pantalla.
 */
function EventPaymentPanel({ event, misAlumnos, onCambio }: Props) {
  const user = getUser();
  const puedeGestionar = can(user, "events:write");

  if (puedeGestionar) {
    return <GestionCobros event={event} onCambio={onCambio} />;
  }

  return (
    <ReportarPago event={event} misAlumnos={misAlumnos} onCambio={onCambio} />
  );
}

// ---------------------------------------------------------------------------
// Alumno o tutor: reportar el pago
// ---------------------------------------------------------------------------

function ReportarPago({
  event,
  misAlumnos,
  onCambio,
}: {
  event: DojoEvent;
  misAlumnos: MyStudent[];
  onCambio: () => void | Promise<void>;
}) {
  const [teacherCode, setTeacherCode] = useState("");
  const [studentId, setStudentId] = useState<number | "">(
    misAlumnos.length === 1 ? misAlumnos[0].id : ""
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Lo que ya reportaron los alumnos a cargo, según el backend.
  const yaReportados = event.misAlumnos ?? [];

  const pendientes = misAlumnos.filter(
    (a) => !yaReportados.some((r) => r.studentId === a.id)
  );

  const valido =
    teacherCode.trim().length > 0 &&
    (pendientes.length === 1 || studentId !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!valido || enviando) return;

    setEnviando(true);
    setError("");
    setExito("");

    try {
      const res = await reportEventPayment(event.id, {
        teacherCode: teacherCode.trim(),
        studentId:
          studentId === ""
            ? pendientes.length === 1
              ? pendientes[0].id
              : undefined
            : Number(studentId),
      });

      setExito(res.message);
      setTeacherCode("");
      await onCambio();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No fue posible reportar el pago."
      );
    } finally {
      setEnviando(false);
    }
  }

  const inputClase = `
    w-full rounded-xl border border-slate-300 bg-white px-4 py-3
    outline-none transition-all
    focus:border-blue-600 focus:ring-4 focus:ring-blue-100
  `;

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold text-slate-900">
        <Receipt size={18} aria-hidden="true" className="text-slate-400" />
        Pago del evento
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Cuesta{" "}
        <strong className="text-slate-900">
          {formatMoney(event.priceCents ?? 0)}
        </strong>
        . Paga con tu profesor y luego repórtalo aquí con su clave.
      </p>

      {/* Estado de los que ya reportaron */}
      {yaReportados.length > 0 && (
        <ul className="mt-4 space-y-2">
          {yaReportados.map((r) => {
            const alumno = misAlumnos.find((a) => a.id === r.studentId);

            return (
              <li
                key={r.studentId}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                  EVENT_PAYMENT_STYLES[r.status]
                }`}
              >
                <span className="font-medium">
                  {alumno
                    ? `${alumno.firstName} ${alumno.lastName}`
                    : "Alumno"}
                </span>
                <span className="font-semibold">
                  {EVENT_PAYMENT_LABELS[r.status]}
                  {r.enrolled && " · inscrito"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pendientes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Ya reportaste el pago de todos tus alumnos para este evento.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {pendientes.length > 1 && (
            <div className="space-y-2">
              <label
                htmlFor={`ep-alumno-${event.id}`}
                className="block text-sm font-medium text-slate-700"
              >
                ¿De quién es el pago?
              </label>
              <select
                id={`ep-alumno-${event.id}`}
                value={studentId}
                onChange={(e) =>
                  setStudentId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={`${inputClase} cursor-pointer`}
              >
                <option value="">Elige un alumno</option>
                {pendientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor={`ep-clave-${event.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              Clave de tu profesor
            </label>
            <input
              id={`ep-clave-${event.id}`}
              type="text"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="PROF-7K2M"
              aria-describedby={`ep-clave-ayuda-${event.id}`}
              className={`${inputClase} font-mono`}
            />
            <p
              id={`ep-clave-ayuda-${event.id}`}
              className="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <KeyRound size={12} aria-hidden="true" />
              Tu profesor te la comparte. Con ella el cobro queda registrado a
              su nombre.
            </p>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          {exito && (
            <p className="text-sm font-medium text-emerald-700" role="status">
              {exito}
            </p>
          )}

          <button
            type="submit"
            disabled={!valido || enviando}
            className="
              cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {enviando ? "Reportando..." : "Ya pagué"}
          </button>
        </form>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profesor o admin: confirmar los pagos
// ---------------------------------------------------------------------------

function GestionCobros({
  event,
  onCambio,
}: {
  event: DojoEvent;
  onCambio: () => void | Promise<void>;
}) {
  const [enrollments, setEnrollments] = useState<EventEnrollment[]>([]);
  const [alcance, setAlcance] = useState<"todos" | "mi-clave">("mi-clave");
  const [error, setError] = useState("");
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [cargado, setCargado] = useState(false);

  function cargar() {
    return getEventEnrollments(event.id)
      .then((res) => {
        setEnrollments(res.enrollments);
        setAlcance(res.alcance);
        setError("");
      })
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? e.message
            : "No fue posible cargar los pagos."
        );
      })
      .finally(() => setCargado(true));
  }

  useEffect(() => {
    let activo = true;

    getEventEnrollments(event.id)
      .then((res) => {
        if (activo) {
          setEnrollments(res.enrollments);
          setAlcance(res.alcance);
        }
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
        if (activo) setCargado(true);
      });

    return () => {
      activo = false;
    };
  }, [event.id]);

  async function resolver(id: number, confirmar: boolean) {
    setResolviendo(id);

    try {
      await resolveEventPayment(event.id, id, confirmar);
      await cargar();
      await onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible registrar la decisión."
      );
    } finally {
      setResolviendo(null);
    }
  }

  const inscritos = enrollments.filter((e) => e.enrolled).length;
  const porConfirmar = enrollments.filter(
    (e) => e.status === "REPORTADO"
  ).length;

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold text-slate-900">
        <Receipt size={18} aria-hidden="true" className="text-slate-400" />
        Pagos e inscritos
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Cuesta{" "}
        <strong className="text-slate-900">
          {formatMoney(event.priceCents ?? 0)}
        </strong>
        . {inscritos} inscrito{inscritos === 1 ? "" : "s"}
        {porConfirmar > 0 && `, ${porConfirmar} por confirmar`}.
        {alcance === "mi-clave" && " Solo los de tu clave."}
      </p>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      {!cargado ? (
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
      ) : enrollments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Nadie ha reportado pago todavía. Comparte tu clave con tus alumnos
          para que lo reporten.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {enrollments.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {e.studentName}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {formatMoney(e.amountCents)} · reportado el{" "}
                  {new Date(e.reportedAt).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                  })}
                  {alcance === "todos" &&
                    e.acreditadoA &&
                    ` · a ${e.acreditadoA}`}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  EVENT_PAYMENT_STYLES[e.status]
                }`}
              >
                {EVENT_PAYMENT_LABELS[e.status]}
              </span>

              {e.enrolled && (
                <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  Inscrito
                </span>
              )}

              {e.status === "REPORTADO" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => resolver(e.id, true)}
                    disabled={resolviendo === e.id}
                    className="
                      flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600
                      px-3 py-2 text-xs font-semibold text-white
                      transition-colors duration-200
                      motion-reduce:transition-none
                      hover:bg-emerald-700
                      focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    <Check size={14} aria-hidden="true" />
                    Confirmar
                  </button>

                  <button
                    type="button"
                    onClick={() => resolver(e.id, false)}
                    disabled={resolviendo === e.id}
                    className="
                      flex cursor-pointer items-center gap-1.5 rounded-lg border
                      border-slate-300 bg-white px-3 py-2 text-xs font-semibold
                      text-slate-700 transition-colors duration-200
                      motion-reduce:transition-none
                      hover:bg-red-50 hover:text-red-700
                      focus:ring-2 focus:ring-blue-600 focus:outline-none
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    <X size={14} aria-hidden="true" />
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default EventPaymentPanel;
