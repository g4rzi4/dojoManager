import { useRef, useState } from "react";
import {
  Award,
  CalendarCheck,
  CircleAlert,
  MessageSquare,
  Phone,
  Receipt,
  ShieldUser,
  UserRound,
} from "lucide-react";

import Card from "./Card";
import type { StudentCard as StudentCardData } from "../types/student";
import {
  BELT_LABELS,
  BELT_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  RELATIONSHIP_LABELS,
} from "../types/student";
import { formatLongDate, fromDateKey } from "../utils/date";
import {
  attendanceRate,
  calcAge,
  formatMoney,
  formatPeriod,
} from "../utils/format";

type Props = {
  student: StudentCardData;
};

const TABS = [
  { id: "graduaciones", label: "Graduaciones", icon: Award },
  { id: "asistencia", label: "Asistencia", icon: CalendarCheck },
  { id: "pagos", label: "Pagos", icon: Receipt },
  { id: "observaciones", label: "Observaciones", icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

function StudentCardView({ student }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("graduaciones");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { resumen, historial } = student;
  const edad = calcAge(student.birthDate);
  const porcentaje = attendanceRate(
    resumen.asistenciasPresente,
    resumen.asistenciasRegistradas
  );

  /** Flechas izquierda/derecha para moverse entre pestañas, como pide ARIA. */
  function handleTabKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();

    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + TABS.length) % TABS.length;

    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            {student.firstName.charAt(0).toUpperCase()}
            {student.lastName.charAt(0).toUpperCase()}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {student.firstName} {student.lastName}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  BELT_STYLES[student.currentBelt]
                }`}
              >
                Cinturón {BELT_LABELS[student.currentBelt]}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  student.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-300 bg-slate-100 text-slate-700"
                }`}
              >
                {student.active ? "Activo" : "Inactivo"}
              </span>

              {student.hasLogin && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                  Con acceso al sistema
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Inscrito el{" "}
              <span className="font-medium text-slate-900">
                {formatLongDate(fromDateKey(student.enrolledAt))}
              </span>
            </p>
          </div>
        </div>

        {/* Datos personales */}
        <dl className="mt-6 grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <DataField
            icon={UserRound}
            label="Edad"
            value={
              edad === null
                ? "No registrada"
                : `${edad} años${
                    student.birthDate
                      ? ` · ${formatLongDate(fromDateKey(student.birthDate))}`
                      : ""
                  }`
            }
          />
          <DataField
            icon={Phone}
            label="Teléfono"
            value={student.phone ?? "No registrado"}
          />
          <DataField
            icon={ShieldUser}
            label="Tutor responsable"
            value={student.guardianName ?? "No registrado"}
          />
          <DataField
            icon={Phone}
            label="Teléfono del tutor"
            value={student.guardianPhone ?? "No registrado"}
          />
        </dl>

        {/* Tutores con cuenta. Separado de guardianName, que es texto suelto
            para alumnos cuyo tutor no está registrado en el sistema. */}
        {student.tutores.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Tutores con acceso
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {student.tutores.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <ShieldUser
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-slate-500"
                  />
                  <span className="text-sm text-slate-900">
                    {t.name}
                    <span className="text-slate-600">
                      {" "}
                      · {RELATIONSHIP_LABELS[t.relationship]}
                    </span>
                  </span>
                  {t.isPrimary && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      Contacto principal
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notas médicas: resaltadas porque el profesor las necesita a la vista */}
        {student.medicalNotes && (
          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <CircleAlert
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Información médica
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {student.medicalNotes}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Graduaciones"
          value={String(resumen.graduaciones)}
          hint="cambios de cinturón"
        />
        <StatTile
          label="Asistencia"
          value={`${porcentaje}%`}
          hint={`${resumen.asistenciasPresente} de ${resumen.asistenciasRegistradas} clases`}
        />
        <StatTile
          label="Pagos pendientes"
          value={String(resumen.pagosPendientes)}
          hint="mensualidades por cubrir"
          alert={resumen.pagosPendientes > 0}
        />
        <StatTile
          label="Observaciones"
          value={String(resumen.observaciones)}
          hint="notas del profesor"
        />
      </div>

      {/* Historial */}
      <Card className="overflow-hidden">
        <div
          role="tablist"
          aria-label="Historial del alumno"
          className="flex overflow-x-auto border-b border-slate-200"
        >
          {TABS.map(({ id, label, icon: Icon }, index) => {
            const selected = activeTab === id;

            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`
                  flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-4
                  text-sm font-semibold transition-colors duration-200
                  motion-reduce:transition-none
                  focus:ring-2 focus:ring-blue-600 focus:ring-inset focus:outline-none
                  ${
                    selected
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">
          {/* Graduaciones */}
          <TabPanel id="graduaciones" active={activeTab === "graduaciones"}>
            {historial.graduaciones.length === 0 ? (
              <Empty text="Este alumno no tiene graduaciones registradas." />
            ) : (
              <ol className="space-y-4">
                {historial.graduaciones.map((g) => (
                  <li key={g.id} className="flex gap-4">
                    <span
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                        BELT_STYLES[g.belt]
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 border-b border-slate-100 pb-4">
                      <p className="font-semibold text-slate-900">
                        Cinturón {BELT_LABELS[g.belt]}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 first-letter:uppercase">
                        {formatLongDate(fromDateKey(g.promotedAt))}
                        {g.evaluatedBy && ` · Evaluó ${g.evaluatedBy}`}
                      </p>
                      {g.notes && (
                        <p className="mt-1 text-sm text-slate-700">{g.notes}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabPanel>

          {/* Asistencia */}
          <TabPanel id="asistencia" active={activeTab === "asistencia"}>
            {historial.asistencia.length === 0 ? (
              <Empty text="No hay asistencias registradas." />
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-600">
                  Últimos {historial.asistencia.length} registros.{" "}
                  <span className="font-semibold text-slate-900">
                    {porcentaje}% de asistencia.
                  </span>
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {historial.asistencia.map((a) => (
                    <li
                      key={a.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                        a.present
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-red-200 bg-red-50 text-red-900"
                      }`}
                    >
                      <span className="first-letter:uppercase">
                        {formatLongDate(fromDateKey(a.date))}
                      </span>
                      <span className="font-semibold">
                        {a.present ? "Asistió" : "Faltó"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TabPanel>

          {/* Pagos */}
          <TabPanel id="pagos" active={activeTab === "pagos"}>
            {historial.pagos.length === 0 ? (
              <Empty text="No hay pagos registrados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th scope="col" className="pb-3 pr-4 font-semibold">
                        Mes
                      </th>
                      <th scope="col" className="pb-3 pr-4 font-semibold">
                        Monto
                      </th>
                      <th scope="col" className="pb-3 pr-4 font-semibold">
                        Estado
                      </th>
                      <th scope="col" className="pb-3 font-semibold">
                        Fecha de pago
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.pagos.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-900 first-letter:uppercase">
                          {formatPeriod(p.periodYear, p.periodMonth)}
                        </td>
                        <td className="py-3 pr-4 text-slate-900">
                          {formatMoney(p.amountCents)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              PAYMENT_STATUS_STYLES[p.status]
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 first-letter:uppercase">
                          {p.paidAt
                            ? formatLongDate(fromDateKey(p.paidAt))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabPanel>

          {/* Observaciones */}
          <TabPanel id="observaciones" active={activeTab === "observaciones"}>
            {historial.observaciones.length === 0 ? (
              <Empty text="No hay observaciones del profesor." />
            ) : (
              <ul className="space-y-4">
                {historial.observaciones.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-900">{n.body}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {n.author ?? "Autor dado de baja"} ·{" "}
                      {new Date(n.createdAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabPanel>
        </div>
      </Card>
    </div>
  );
}

type DataFieldProps = {
  icon: typeof UserRound;
  label: string;
  value: string;
};

function DataField({ icon: Icon, label, value }: DataFieldProps) {
  return (
    <div className="flex gap-3">
      <Icon
        size={18}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-slate-400"
      />
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </dt>
        <dd className="mt-1 text-sm text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
};

function StatTile({ label, value, hint, alert = false }: StatTileProps) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          alert ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-600">{hint}</p>
    </Card>
  );
}

function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return null;

  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-600">{text}</p>;
}

export default StudentCardView;
