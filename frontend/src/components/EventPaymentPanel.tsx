import { useEffect, useState } from "react";
import { Check, KeyRound, Receipt, UserPlus, X } from "lucide-react";

import { getLocale, t } from "../i18n";
import Card from "./Card";
import PagarConPayPal from "./PagarConPayPal";
import {
  ApiError,
  enrollStudentInEvent,
  getCategoryCatalog,
  getEventEnrollments,
  getPayPalConfig,
  getStudents,
  reportEventPayment,
  resolveEventPayment,
} from "../services/api";
import type { StudentListItem } from "../types/student";
import { can, getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import type { EventEnrollment } from "../types/eventPayment";
import {
  BELT_CLASS_LABELS,
  EVENT_PAYMENT_LABELS,
  EVENT_PAYMENT_STYLES,
  GENDER_LABELS,
  type AgeCategoryInfo,
  type BeltClass,
  type CompetitionGender,
} from "../types/eventPayment";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "../types/payment";
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
  /** Modalidades elegidas. Un alumno puede entrar a kata y kumite. */
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [gender, setGender] = useState<CompetitionGender | "">("");
  const [beltClass, setBeltClass] = useState<BeltClass | "">("");
  const [ageCategory, setAgeCategory] = useState("");
  /** El catálogo lo manda el backend; aquí no se duplica la tabla. */
  const [catalogo, setCatalogo] = useState<AgeCategoryInfo[]>([]);
  const [metodo, setMetodo] = useState<PaymentMethod | "">("");
  const [nota, setNota] = useState("");
  const [studentId, setStudentId] = useState<number | "">(
    misAlumnos.length === 1 ? misAlumnos[0].id : ""
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [paypalDisponible, setPaypalDisponible] = useState(false);

  useEffect(() => {
    let activo = true;

    getCategoryCatalog()
      .then((c) => {
        if (activo) setCatalogo(c.categorias);
      })
      // Sin catálogo se puede reportar el pago igual, solo sin categoría.
      .catch(() => {});

    getPayPalConfig()
      .then((c) => {
        if (activo) setPaypalDisponible(c.enabled);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  // Lo que ya reportaron los alumnos a cargo, según el backend.
  const yaReportados = event.misAlumnos ?? [];

  const pendientes = misAlumnos.filter(
    (a) => !yaReportados.some((r) => r.studentId === a.id)
  );

  const modalidades = event.modalities ?? [];
  const tieneModalidades = modalidades.length > 0;

  /** El total es la SUMA de las elegidas: hay quien entra a las dos. */
  const total = tieneModalidades
    ? modalidades
        .filter((m) => elegidas.includes(m.id))
        .reduce((suma, m) => suma + m.priceCents, 0)
    : (event.priceCents ?? 0);

  const valido =
    teacherCode.trim().length > 0 &&
    (pendientes.length === 1 || studentId !== "") &&
    (!tieneModalidades || elegidas.length > 0);

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
        modalityIds: tieneModalidades ? elegidas : undefined,
        gender: gender || undefined,
        beltClass: beltClass || undefined,
        ageCategory: ageCategory || undefined,
        method: metodo || undefined,
        note: nota.trim() || undefined,
      });

      setExito(t(res.message));
      setTeacherCode("");
      setElegidas([]);
      setNota("");
      await onCambio();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("No fue posible reportar el pago.")
      );
    } finally {
      setEnviando(false);
    }
  }

  const inputClase = `
    w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
    outline-none transition-[border-color,box-shadow,background-color]
    focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
  `;

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold text-neutral-900">
        <Receipt size={18} aria-hidden="true" className="text-neutral-400" />
        {t("Pago del evento")}
      </h3>
      <p className="mt-1 text-sm text-neutral-600">
        {tieneModalidades
          ? t(
              "Cada modalidad tiene su costo. Paga con tu profesor y luego repórtalo aquí con su clave."
            )
          : t(
              "Cuesta {precio}. Paga con tu profesor y luego repórtalo aquí con su clave.",
              { precio: formatMoney(event.priceCents ?? 0) }
            )}
      </p>

      {/* Estado de los que ya reportaron */}
      {yaReportados.length > 0 && (
        <ul className="mt-4 space-y-2">
          {yaReportados.map((r) => {
            const alumno = misAlumnos.find((a) => a.id === r.studentId);

            return (
              <li
                key={r.studentId}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm ${
                  EVENT_PAYMENT_STYLES[r.status]
                }`}
              >
                <span className="font-medium">
                  {alumno
                    ? `${alumno.firstName} ${alumno.lastName}`
                    : t("Alumno")}
                </span>
                <span className="font-semibold">
                  {t(EVENT_PAYMENT_LABELS[r.status])}
                  {r.enrolled && ` · ${t("inscrito")}`}
                </span>

                {r.status === "PENDIENTE_PAGO" && (
                  <PagarConPayPal
                    tipo="EVENTO"
                    id={r.enrollmentId}
                    onPagado={onCambio}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pendientes.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          {yaReportados.some((r) => r.status === "PENDIENTE_PAGO")
            ? t("Completa el pago para quedar inscrito.")
            : t("Ya reportaste el pago de todos tus alumnos para este evento.")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {pendientes.length > 1 && (
            <div className="space-y-2">
              <label
                htmlFor={`ep-alumno-${event.id}`}
                className="block text-sm font-medium text-neutral-700"
              >
                {t("¿De quién es el pago?")}
              </label>
              <select
                id={`ep-alumno-${event.id}`}
                value={studentId}
                onChange={(e) =>
                  setStudentId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={`${inputClase} cursor-pointer`}
              >
                <option value="">{t("Elige un alumno")}</option>
                {pendientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Modalidades: se pueden elegir varias y el total se suma */}
          {tieneModalidades && (
            <fieldset>
              <legend className="text-sm font-medium text-neutral-700">
                {t("¿A qué modalidades entra?")}
              </legend>

              <div className="mt-2 space-y-2">
                {modalidades.map((m) => (
                  <label
                    key={m.id}
                    className={`
                      flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3
                      transition-colors duration-200
                      motion-reduce:transition-none
                      ${
                        elegidas.includes(m.id)
                          ? "border-violet-600 bg-violet-50"
                          : "border-neutral-300 bg-surface hover:bg-neutral-50"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={elegidas.includes(m.id)}
                      onChange={(e) =>
                        setElegidas((prev) =>
                          e.target.checked
                            ? [...prev, m.id]
                            : prev.filter((x) => x !== m.id)
                        )
                      }
                      className="cursor-pointer"
                    />
                    <span className="flex-1 text-sm font-medium text-neutral-900">
                      {m.name}
                    </span>
                    <span className="text-sm font-semibold text-neutral-700">
                      {formatMoney(m.priceCents)}
                    </span>
                  </label>
                ))}
              </div>

              {/* El total, para que no haya sorpresas al pagar */}
              <p className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3">
                <span className="text-sm font-medium text-neutral-700">
                  {t("Total a pagar")}
                </span>
                <span className="text-lg font-bold text-neutral-900">
                  {formatMoney(total)}
                </span>
              </p>
            </fieldset>
          )}

          {/* Categoría de competencia: rama, tipo de cinta y edad.
              Los rangos de edad NO son los mismos en color y en negras. */}
          <fieldset className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <legend className="px-1 text-sm font-medium text-neutral-700">
              {t("Categoría de competencia")}{" "}
              <span className="font-normal text-neutral-500">
                {t("(opcional)")}
              </span>
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor={`ep-rama-${event.id}`}
                  className="block text-sm font-medium text-neutral-700"
                >
                  {t("Rama")}
                </label>
                <select
                  id={`ep-rama-${event.id}`}
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as CompetitionGender | "")
                  }
                  className={`${inputClase} cursor-pointer`}
                >
                  <option value="">{t("Sin especificar")}</option>
                  {(Object.keys(GENDER_LABELS) as CompetitionGender[]).map(
                    (g) => (
                      <option key={g} value={g}>
                        {t(GENDER_LABELS[g])}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`ep-cinta-${event.id}`}
                  className="block text-sm font-medium text-neutral-700"
                >
                  {t("Tipo de cinta")}
                </label>
                <select
                  id={`ep-cinta-${event.id}`}
                  value={beltClass}
                  onChange={(e) => {
                    setBeltClass(e.target.value as BeltClass | "");
                    // Las categorías cambian con la rama: una elegida para
                    // color no existe en negras, así que se limpia.
                    setAgeCategory("");
                  }}
                  className={`${inputClase} cursor-pointer`}
                >
                  <option value="">{t("Sin especificar")}</option>
                  {(Object.keys(BELT_CLASS_LABELS) as BeltClass[]).map((b) => (
                    <option key={b} value={b}>
                      {t(BELT_CLASS_LABELS[b])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {beltClass && (
              <div className="space-y-2">
                <label
                  htmlFor={`ep-categoria-${event.id}`}
                  className="block text-sm font-medium text-neutral-700"
                >
                  {t("Categoría de edad")}
                </label>
                <select
                  id={`ep-categoria-${event.id}`}
                  value={ageCategory}
                  onChange={(e) => setAgeCategory(e.target.value)}
                  aria-describedby={`ep-categoria-ayuda-${event.id}`}
                  className={`${inputClase} cursor-pointer`}
                >
                  <option value="">{t("Sin especificar")}</option>
                  {catalogo
                    .filter((c) => c.beltClasses.includes(beltClass))
                    .map((c) => (
                      <option key={c.value} value={c.value}>
                        {t(c.label)} — {t(c.rango)}
                      </option>
                    ))}
                </select>
                <p
                  id={`ep-categoria-ayuda-${event.id}`}
                  className="text-xs text-neutral-500"
                >
                  {t(
                    "Puede no coincidir con su edad: hay alumnos a los que se foguea en una categoría mayor."
                  )}
                </p>
              </div>
            )}
          </fieldset>

          <div className="space-y-2">
            <label
              htmlFor={`ep-metodo-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              {t("¿Cómo pagaste?")}{" "}
              <span className="font-normal text-neutral-500">
                {t("(opcional)")}
              </span>
            </label>
            <select
              id={`ep-metodo-${event.id}`}
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod | "")}
              className={`${inputClase} cursor-pointer`}
            >
              <option value="">{t("Sin especificar")}</option>
              <option value="EFECTIVO">
                {t(PAYMENT_METHOD_LABELS.EFECTIVO)}
              </option>
              <option value="TRANSFERENCIA">
                {t(PAYMENT_METHOD_LABELS.TRANSFERENCIA)}
              </option>
              {paypalDisponible && (
                <option value="PAYPAL">
                  {t(PAYMENT_METHOD_LABELS.PAYPAL)} {t("(pagar en línea ahora)")}
                </option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`ep-nota-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Nota para el profesor")}{" "}
              <span className="font-normal text-neutral-500">
                {t("(opcional)")}
              </span>
            </label>
            <input
              id={`ep-nota-${event.id}`}
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={t("Pagué en efectivo el martes")}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`ep-clave-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Clave de tu profesor")}
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
              className="flex items-center gap-1.5 text-xs text-neutral-500"
            >
              <KeyRound size={12} aria-hidden="true" />
              {t(
                "Tu profesor te la comparte. Con ella el cobro queda registrado a su nombre."
              )}
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
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {enviando
              ? t("Enviando…")
              : metodo === "PAYPAL"
                ? t("Continuar a PayPal")
                : t("Ya pagué")}
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
            : t("No fue posible cargar los pagos.")
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
              : t("No fue posible cargar los pagos.")
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
          : t("No fue posible registrar la decisión.")
      );
    } finally {
      setResolviendo(null);
    }
  }

  const inscritos = enrollments.filter((e) => e.enrolled).length;
  const yaEnLista = new Set(enrollments.map((e) => e.studentId));
  const porConfirmar = enrollments.filter(
    (e) => e.status === "REPORTADO"
  ).length;

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold text-neutral-900">
        <Receipt size={18} aria-hidden="true" className="text-neutral-400" />
        {t("Pagos e inscritos")}
      </h3>
      <p className="mt-1 text-sm text-neutral-600">
        {t("Cuesta")}{" "}
        <strong className="text-neutral-900">
          {formatMoney(event.priceCents ?? 0)}
        </strong>
        .{" "}
        {inscritos === 1
          ? t("{n} inscrito", { n: inscritos })
          : t("{n} inscritos", { n: inscritos })}
        {porConfirmar > 0 &&
          `, ${t("{n} por confirmar", { n: porConfirmar })}`}
        .
        {alcance === "mi-clave" && ` ${t("Solo los de tu clave.")}`}
      </p>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* El profesor inscribe a sus alumnos sin esperar a que reporten */}
      <InscribirAlumnos
        event={event}
        yaEnLista={yaEnLista}
        onInscrito={async () => {
          await cargar();
          await onCambio();
        }}
      />

      {!cargado ? (
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-neutral-100 motion-reduce:animate-none" />
      ) : enrollments.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          {t(
            "Nadie ha reportado pago todavía. Comparte tu clave con tus alumnos para que lo reporten."
          )}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {enrollments.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  {e.studentName}
                </p>
                {e.categoriaLegible && (
                  <p className="mt-0.5 text-xs font-medium text-neutral-800">
                    {e.categoriaLegible}
                  </p>
                )}

                {e.modalidades.length > 0 && (
                  <p className="mt-0.5 text-xs text-neutral-700">
                    {e.modalidades
                      .map((m) => `${m.name} ${formatMoney(m.priceCents)}`)
                      .join(" + ")}

                  </p>
                )}

                <p className="mt-0.5 text-xs text-neutral-600">
                  {formatMoney(e.amountCents)}
                  {e.method &&
                    ` · ${t(PAYMENT_METHOD_LABELS[e.method]).toLowerCase()}`}
                  {` · ${t("reportado el")} `}
                  {new Date(e.reportedAt).toLocaleDateString(getLocale(), {
                    day: "numeric",
                    month: "long",
                  })}
                  {alcance === "todos" &&
                    e.acreditadoA &&
                    ` · ${t("a {nombre}", { nombre: e.acreditadoA })}`}
                </p>

                {e.note && (
                  <p className="mt-1 text-xs text-neutral-600 italic">
                    "{e.note}"
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  EVENT_PAYMENT_STYLES[e.status]
                }`}
              >
                {t(EVENT_PAYMENT_LABELS[e.status])}
              </span>

              {e.enrolled && (
                <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  {t("Inscrito")}
                </span>
              )}

              {e.status === "REPORTADO" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => resolver(e.id, true)}
                    disabled={resolviendo === e.id}
                    className="
                      flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600
                      px-3 py-2 text-xs font-semibold text-white
                      transition-colors duration-200
                      motion-reduce:transition-none
                      hover:bg-emerald-700
                      focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    <Check size={14} aria-hidden="true" />
                    {t("Confirmar")}
                  </button>

                  <button
                    type="button"
                    onClick={() => resolver(e.id, false)}
                    disabled={resolviendo === e.id}
                    className="
                      flex cursor-pointer items-center gap-1.5 rounded-xl border
                      border-neutral-300 bg-surface px-3 py-2 text-xs font-semibold
                      text-neutral-700 transition-colors duration-200
                      motion-reduce:transition-none
                      hover:bg-red-50 hover:text-red-700
                      focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    <X size={14} aria-hidden="true" />
                    {t("Rechazar")}
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

/**
 * El profesor elige a uno de sus alumnos y lo inscribe con sus modalidades.
 *
 * La lista sale de GET /students, que para un profesor ya viene filtrada a
 * su grupo: aquí no hay que volver a filtrar nada.
 */
function InscribirAlumnos({
  event,
  yaEnLista,
  onInscrito,
}: {
  event: DojoEvent;
  yaEnLista: Set<number>;
  onInscrito: () => void | Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [alumnos, setAlumnos] = useState<StudentListItem[]>([]);
  const [studentId, setStudentId] = useState<number | "">("");
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto || alumnos.length > 0) return;

    let activo = true;

    getStudents()
      .then((data) => {
        if (activo) setAlumnos(data.filter((a) => a.active));
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, [abierto, alumnos.length]);

  const modalidades = event.modalities ?? [];
  const tieneModalidades = modalidades.length > 0;

  const total = tieneModalidades
    ? modalidades
        .filter((m) => elegidas.includes(m.id))
        .reduce((suma, m) => suma + m.priceCents, 0)
    : (event.priceCents ?? 0);

  const disponibles = alumnos.filter((a) => !yaEnLista.has(a.id));

  const valido =
    studentId !== "" && (!tieneModalidades || elegidas.length > 0);

  async function inscribir() {
    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      await enrollStudentInEvent(event.id, {
        studentId: Number(studentId),
        modalityIds: tieneModalidades ? elegidas : undefined,
        note: nota.trim() || undefined,
      });

      setStudentId("");
      setElegidas([]);
      setNota("");
      await onInscrito();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : t("No fue posible inscribirlo.")
      );
    } finally {
      setGuardando(false);
    }
  }

  const inputClase = `
    w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
    outline-none transition-[border-color,box-shadow,background-color]
    focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
  `;

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="
          mt-4 flex cursor-pointer items-center gap-2 rounded-2xl border
          border-neutral-300 bg-surface px-4 py-2.5 text-sm font-semibold
          text-neutral-700 transition-colors duration-200
          motion-reduce:transition-none
          hover:bg-neutral-50
          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
        "
      >
        <UserPlus size={16} aria-hidden="true" />
        {t("Inscribir a un alumno")}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-900">
        {t("Inscribir a un alumno")}
      </p>

      {disponibles.length === 0 ? (
        <p className="text-sm text-neutral-600">
          {alumnos.length === 0
            ? t("No tienes alumnos activos.")
            : t("Todos tus alumnos ya están en la lista de este evento.")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label
              htmlFor={`in-alumno-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Alumno")}
            </label>
            <select
              id={`in-alumno-${event.id}`}
              value={studentId}
              onChange={(e) =>
                setStudentId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`${inputClase} cursor-pointer`}
            >
              <option value="">{t("Elige un alumno")}</option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>

          {tieneModalidades && (
            <fieldset>
              <legend className="text-sm font-medium text-neutral-700">
                {t("¿En qué modalidades entra?")}
              </legend>

              <div className="mt-2 space-y-2">
                {modalidades.map((m) => (
                  <label
                    key={m.id}
                    className={`
                      flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface px-4 py-3
                      transition-colors duration-200
                      motion-reduce:transition-none
                      ${
                        elegidas.includes(m.id)
                          ? "border-violet-600 bg-violet-50"
                          : "border-neutral-300 hover:bg-neutral-50"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={elegidas.includes(m.id)}
                      onChange={(e) =>
                        setElegidas((prev) =>
                          e.target.checked
                            ? [...prev, m.id]
                            : prev.filter((x) => x !== m.id)
                        )
                      }
                      className="cursor-pointer"
                    />
                    <span className="flex-1 text-sm font-medium text-neutral-900">
                      {m.name}
                    </span>
                    <span className="text-sm font-semibold text-neutral-700">
                      {formatMoney(m.priceCents)}
                    </span>
                  </label>
                ))}
              </div>

              <p className="mt-3 flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                <span className="text-sm font-medium text-neutral-700">
                  {t("Tendrá que pagar")}
                </span>
                <span className="text-lg font-bold text-neutral-900">
                  {formatMoney(total)}
                </span>
              </p>
            </fieldset>
          )}

          <div className="space-y-2">
            <label
              htmlFor={`in-nota-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Nota")}{" "}
              <span className="font-normal text-neutral-500">
                {t("(opcional)")}
              </span>
            </label>
            <input
              id={`in-nota-${event.id}`}
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={t("Se foguea con adultos")}
              className={inputClase}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          <p className="text-xs text-neutral-600">
            {t(
              "Al alumno y a sus tutores les llegará una notificación con las modalidades y lo que deben pagar. Quedará inscrito cuando confirmes el pago."
            )}
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {disponibles.length > 0 && (
          <button
            type="button"
            onClick={inscribir}
            disabled={!valido || guardando}
            className="
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-2.5 text-sm
              font-semibold text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {guardando ? t("Inscribiendo…") : t("Inscribir")}
          </button>
        )}

        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="
            cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-5 py-2.5
            text-sm font-semibold text-neutral-700
            transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-neutral-50
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
          "
        >
          {t("Cerrar")}
        </button>
      </div>
    </div>
  );
}

export default EventPaymentPanel;
