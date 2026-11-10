import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Receipt,
  Users,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import { getLocale, t } from "../i18n";
import PageHeading from "../components/PageHeading";
import EnlacesDeAcceso from "../components/EnlacesDeAcceso";
import {
  ApiError,
  createTeacherResetLink,
  getTeacherCard,
} from "../services/api";
import { can, getUser } from "../services/session";
import type { TeacherCard as TeacherCardData } from "../types/teacher";
import { BELT_LABELS, BELT_STYLES } from "../types/student";
import { formatLongDate, fromDateKey } from "../utils/date";
import { formatMoney, formatPeriod } from "../utils/format";

type Estado =
  | { status: "cargando" }
  | { status: "ok"; teacher: TeacherCardData }
  | { status: "error"; message: string };

/**
 * Ficha del profesor.
 *
 * La ve el ADMIN de cualquier profesor, y cada PROFESOR la suya. Un profesor
 * NO puede abrir la de otro: ahí van las notas del administrador y el dinero
 * que maneja. El backend responde 403 y esta pantalla lo muestra tal cual.
 */
function TeacherCard() {
  const { id } = useParams<{ id: string }>();
  const user = getUser();

  const teacherId = Number(id);
  const idValido = Number.isInteger(teacherId) && teacherId >= 1;

  const [estado, setEstado] = useState<Estado>({ status: "cargando" });
  const [restableciendo, setRestableciendo] = useState(false);

  useEffect(() => {
    if (!idValido) return;

    let activo = true;

    getTeacherCard(teacherId)
      .then((res) => {
        if (activo) setEstado({ status: "ok", teacher: res.teacher });
      })
      .catch((e: unknown) => {
        if (activo) {
          setEstado({
            status: "error",
            message:
              e instanceof ApiError
                ? e.message
                : t("No fue posible cargar la ficha."),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [teacherId, idValido]);

  const estadoFinal: Estado = idValido
    ? estado
    : { status: "error", message: t("El identificador no es válido.") };

  // El admin vuelve a la lista; un profesor viendo su ficha, a su panel.
  const esAdmin = can(user, "teachers:read");

  return (
    <DashboardLayout>
      <Link
        to={esAdmin ? "/profesores" : "/dashboard"}
        className="
          inline-flex items-center gap-2 rounded-xl py-2 text-sm font-semibold
          text-violet-700 transition-colors duration-200
          motion-reduce:transition-none
          hover:text-violet-900
          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
        "
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {esAdmin ? t("Volver a profesores") : t("Volver al panel")}
      </Link>

      <PageHeading module="profesores"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
        {t("Ficha del profesor")}
      </h1></PageHeading>

      {esAdmin && estadoFinal.status === "ok" && (
        <div className="mt-4">
          {restableciendo ? (
            <EnlacesDeAcceso
              cuentas={[
                {
                  id: estadoFinal.teacher.id,
                  etiqueta: estadoFinal.teacher.name,
                  email: estadoFinal.teacher.email,
                },
              ]}
              generar={createTeacherResetLink}
              onCerrar={() => setRestableciendo(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setRestableciendo(true)}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-neutral-300 bg-surface px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors duration-200 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none motion-reduce:transition-none"
            >
              <KeyRound size={17} aria-hidden="true" />
              {t("Restablecer contraseña")}
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        {estadoFinal.status === "cargando" && (
          <div className="space-y-6">
            <Card className="h-56 animate-pulse motion-reduce:animate-none" />
            <Card className="h-64 animate-pulse motion-reduce:animate-none" />
          </div>
        )}

        {estadoFinal.status === "error" && (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              {t("No se pudo mostrar la ficha")}
            </p>
            <p className="mt-1 text-sm text-red-700">{estadoFinal.message}</p>
          </Card>
        )}

        {estadoFinal.status === "ok" && (
          <Ficha teacher={estadoFinal.teacher} />
        )}
      </div>
    </DashboardLayout>
  );
}

function Ficha({ teacher }: { teacher: TeacherCardData }) {
  const { resumen, historialCobros } = teacher;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-violet-600 text-2xl font-bold text-white">
            {teacher.name.charAt(0).toUpperCase()}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
              {teacher.name}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {teacher.belt && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    BELT_STYLES[teacher.belt]
                  }`}
                >
                  {t("Cinta {color}", {
                    color: t(BELT_LABELS[teacher.belt]).toLowerCase(),
                  })}
                </span>
              )}

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  teacher.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-neutral-300 bg-neutral-100 text-neutral-700"
                }`}
              >
                {teacher.active ? t("Activo") : t("Dado de baja")}
              </span>
            </div>

            {teacher.specialty && (
              <p className="mt-3 text-sm text-neutral-700">
                {teacher.specialty}
              </p>
            )}
          </div>

          {/* La clave: en monoespaciada porque se dicta y se copia */}
          {teacher.teacherCode && (
            <div className="shrink-0 rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-600">
                <KeyRound size={13} aria-hidden="true" />
                {t("Su clave")}
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-neutral-900">
                {teacher.teacherCode}
              </p>
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-5 border-t border-neutral-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Dato icon={Mail} label={t("Correo")} valor={teacher.email} />
          <Dato
            icon={Phone}
            label={t("Teléfono")}
            valor={teacher.phone ?? t("No registrado")}
          />
          <Dato
            icon={CalendarDays}
            label={t("En el dojo desde")}
            valor={
              teacher.hiredAt
                ? formatLongDate(fromDateKey(teacher.hiredAt))
                : t("No registrado")
            }
          />
        </dl>

        {/* Notas internas: el backend solo las manda al administrador */}
        {teacher.adminNotes && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 p-4">
            <Lock
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-neutral-500"
            />
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {t("Notas del administrador")}
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {teacher.adminNotes}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {t("El profesor no las ve.")}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("Alumnos")}
          valor={String(resumen.alumnos)}
          pista={t("{n} activos", { n: resumen.alumnosActivos })}
        />
        <Tile
          label={t("Recaudado")}
          valor={formatMoney(resumen.totalRecaudadoCents)}
          pista={t("eventos y mensualidades")}
        />
        <Tile
          label={t("Cobros de evento")}
          valor={formatMoney(resumen.totalEventosCents)}
          pista={t("{n} confirmados", { n: resumen.cobrosEvento })}
        />
        <Tile
          label={t("Mensualidades")}
          valor={formatMoney(resumen.totalMensualidadesCents)}
          pista={t("{n} cobradas", { n: resumen.mensualidadesCobradas })}
        />
      </div>

      {/* Sus alumnos */}
      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold text-neutral-900">
          <Users size={18} aria-hidden="true" className="text-neutral-400" />
          {t("Sus alumnos")}
        </h3>

        {teacher.alumnos.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">
            {t(
              "Todavía no tiene alumnos asignados. Se le asignan al registrarlos con su clave."
            )}
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {teacher.alumnos.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/alumnos/${a.id}`}
                  className="
                    flex items-center gap-2 rounded-2xl border border-neutral-200
                    bg-neutral-50 px-3 py-2 text-sm
                    transition-colors duration-200
                    motion-reduce:transition-none
                    hover:bg-neutral-100
                    focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                  "
                >
                  <span className="font-medium text-neutral-900">
                    {a.firstName} {a.lastName}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      BELT_STYLES[a.currentBelt]
                    }`}
                  >
                    {t(BELT_LABELS[a.currentBelt])}
                  </span>
                  {!a.active && (
                    <span className="text-xs text-neutral-500">
                      {t("(inactivo)")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Historial de cobros */}
      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold text-neutral-900">
          <Receipt size={18} aria-hidden="true" className="text-neutral-400" />
          {t("Historial de cobros")}
        </h3>

        {/* Eventos */}
        <h4 className="mt-5 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Award size={15} aria-hidden="true" className="text-neutral-400" />
          {t("Eventos acreditados a su clave")}
        </h4>

        {historialCobros.eventos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            {t(
              "Sin cobros de eventos. Aparecen cuando un alumno reporta un pago con su clave y él lo confirma."
            )}
          </p>
        ) : (
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-600">
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("Alumno")}</th>
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("Evento")}</th>
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("Monto")}</th>
                  <th scope="col" className="pb-2 font-semibold">{t("Confirmado")}</th>
                </tr>
              </thead>
              <tbody>
                {historialCobros.eventos.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-medium text-neutral-900">
                      {c.alumno}
                    </td>
                    <td className="py-2 pr-4 text-neutral-700">{c.evento}</td>
                    <td className="py-2 pr-4 text-neutral-900">
                      {formatMoney(c.amountCents)}
                    </td>
                    <td className="py-2 text-neutral-600">
                      {c.confirmadoEn
                        ? new Date(c.confirmadoEn).toLocaleDateString(getLocale(), {
                            day: "numeric",
                            month: "long",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensualidades */}
        <h4 className="mt-6 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Receipt size={15} aria-hidden="true" className="text-neutral-400" />
          {t("Mensualidades de sus alumnos")}
        </h4>

        {historialCobros.mensualidades.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            {t("Sin mensualidades pagadas todavía.")}
          </p>
        ) : (
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-600">
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("Alumno")}</th>
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("Mes")}</th>
                  <th scope="col" className="pb-2 font-semibold">{t("Monto")}</th>
                </tr>
              </thead>
              <tbody>
                {historialCobros.mensualidades.map((m) => (
                  <tr key={m.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-medium text-neutral-900">
                      {m.alumno}
                    </td>
                    <td className="py-2 pr-4 text-neutral-700 first-letter:uppercase">
                      {formatPeriod(m.periodYear, m.periodMonth)}
                    </td>
                    <td className="py-2 text-neutral-900">
                      {formatMoney(m.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Dato({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof Mail;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        size={18}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-neutral-400"
      />
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-neutral-600">
          {label}
        </dt>
        <dd className="mt-1 text-sm break-words text-neutral-900">{valor}</dd>
      </div>
    </div>
  );
}

function Tile({
  label,
  valor,
  pista,
}: {
  label: string;
  valor: string;
  pista: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-neutral-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{valor}</p>
      <p className="mt-1 text-xs text-neutral-600">{pista}</p>
    </Card>
  );
}

export default TeacherCard;
