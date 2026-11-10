import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Clock,
  List,
  MapPin,
  Plus,
  User,
  Users,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import ClassForm from "../components/ClassForm";
import { ApiError, createClass, deleteClass, getClasses } from "../services/api";
import { can, getUser } from "../services/session";
import { t } from "../i18n";
import {
  DAY_NAMES,
  DISCIPLINE_LABELS,
  DISCIPLINE_STYLES,
  LEVEL_LABELS,
  todayIndex,
  type DojoClass,
  type NewDojoClass,
} from "../types/dojoClass";

/**
 * Horario semanal de clases.
 *
 * Rescatado de la rama `Interfaces` de fernandosfn06 y migrado a la paleta,
 * los componentes y los permisos de este proyecto.
 *
 * Dos cambios de fondo respecto al original:
 *
 *  - Los iconos de Material Symbols se cambiaron por lucide-react, que ya es
 *    dependencia del proyecto. El original requería cargar una fuente de
 *    Google y redefinir la paleta en index.css.
 *  - La rejilla ya no posiciona las clases de forma absoluta según la hora.
 *    Se veía bien, pero dos clases a la misma hora se encimaban y en móvil
 *    se rompía. Ahora cada día es una columna con sus clases ordenadas.
 */
function mensajeDe(e: unknown, respaldo: string): string {
  return e instanceof ApiError ? e.message : respaldo;
}

function Classes() {
  const user = getUser();
  const puedeEditar = can(user, "events:write");

  const [classes, setClasses] = useState<DojoClass[]>([]);
  const [vista, setVista] = useState<"semana" | "lista">("semana");
  const [agregando, setAgregando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [profesor, setProfesor] = useState<number | "TODOS">("TODOS");

  useEffect(() => {
    let activo = true;

    getClasses()
      .then((data) => {
        if (activo) setClasses(data);
      })
      .catch((e: unknown) => {
        if (activo) setError(mensajeDe(e, t("No fue posible cargar el horario.")));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  /** Los profesores que tienen clases, para el filtro. */
  const profesores = useMemo(() => {
    const mapa = new Map<number, string>();

    for (const c of classes) {
      if (c.teacherId !== null) mapa.set(c.teacherId, c.instructor);
    }

    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [classes]);

  // El admin quita cualquiera; un profesor, solo las suyas.
  const puedeQuitar = (clase: DojoClass) =>
    user?.role === "ADMIN" || clase.teacherId === user?.id;

  const hoy = todayIndex();

  /** Clases agrupadas por día y ordenadas por hora de inicio. */
  const porDia = useMemo(() => {
    const mapa: DojoClass[][] = Array.from({ length: 7 }, () => []);

    for (const c of classes) {
      if (profesor !== "TODOS" && c.teacherId !== profesor) continue;
      if (c.dayOfWeek >= 0 && c.dayOfWeek < 7) mapa[c.dayOfWeek].push(c);
    }

    for (const dia of mapa) {
      dia.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return mapa;
  }, [classes, profesor]);

  async function agregar(clase: NewDojoClass) {
    setError("");

    try {
      const creada = await createClass(clase);
      setClasses((prev) => [...prev, creada]);
      setAgregando(false);
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible agregar la clase.")));
    }
  }

  async function quitar(clase: DojoClass) {
    if (!window.confirm(t('¿Quitar "{titulo}" del horario?', { titulo: clase.title }))) return;

    setError("");

    try {
      await deleteClass(clase.id);
      setClasses((prev) => prev.filter((c) => c.id !== clase.id));
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible quitar la clase.")));
    }
  }

  return (
    <DashboardLayout>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading module="horario">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Horario de clases")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {t("Las clases que se repiten cada semana, por día y horario.")}
          </p>
        </PageHeading>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cambio de vista */}
          <div
            role="group"
            aria-label={t("Cambiar vista")}
            className="flex rounded-2xl border border-neutral-300 bg-surface p-1"
          >
            <button
              type="button"
              onClick={() => setVista("semana")}
              aria-pressed={vista === "semana"}
              className={`
                flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2
                text-sm font-semibold transition-colors duration-200
                motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                ${
                  vista === "semana"
                    ? "bg-violet-50 text-violet-700"
                    : "text-neutral-600 hover:bg-neutral-50"
                }
              `}
            >
              <CalendarRange size={16} aria-hidden="true" />
              {t("Semana")}
            </button>
            <button
              type="button"
              onClick={() => setVista("lista")}
              aria-pressed={vista === "lista"}
              className={`
                flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2
                text-sm font-semibold transition-colors duration-200
                motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                ${
                  vista === "lista"
                    ? "bg-violet-50 text-violet-700"
                    : "text-neutral-600 hover:bg-neutral-50"
                }
              `}
            >
              <List size={16} aria-hidden="true" />
              {t("Lista")}
            </button>
          </div>

          {puedeEditar && (
            <button
              type="button"
              onClick={() => setAgregando((v) => !v)}
              aria-expanded={agregando}
              className="
                flex cursor-pointer items-center gap-2 rounded-2xl bg-violet-600
                px-4 py-2.5 text-sm font-semibold text-white
                transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-violet-700
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              "
            >
              <Plus size={17} aria-hidden="true" />
              {t("Agregar clase")}
            </button>
          )}
        </div>
      </header>

      {error && (
        <Card className="mt-6 border-red-200 p-4">
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        </Card>
      )}

      {profesores.length > 1 && (
        <div className="mt-6 sm:max-w-xs">
          <label
            htmlFor="filtro-profesor"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Profesor")}
          </label>
          <select
            id="filtro-profesor"
            value={profesor}
            onChange={(e) =>
              setProfesor(
                e.target.value === "TODOS" ? "TODOS" : Number(e.target.value)
              )
            }
            className="
              mt-2 w-full cursor-pointer rounded-2xl border border-neutral-300 bg-surface
              px-4 py-3 text-neutral-800 outline-none
              focus:border-violet-600 focus:ring-4 focus:ring-violet-100
            "
          >
            <option value="TODOS">{t("Todos los profesores")}</option>
            {profesores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {agregando && puedeEditar && (
        <div className="mt-6">
          <ClassForm onGuardar={agregar} onCancelar={() => setAgregando(false)} />
        </div>
      )}

      {cargando ? (
        <Card className="mt-6 h-64 animate-pulse motion-reduce:animate-none" />
      ) : classes.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
            <CalendarRange size={26} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-bold text-neutral-900">
            {t("No hay clases en el horario")}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {puedeEditar
              ? t("Agrega la primera con el botón de arriba.")
              : t("Tu profesor todavía no tiene clases en el horario.")}
          </p>
        </Card>
      ) : vista === "semana" ? (
        /* Vista semana: una columna por día. En móvil se apilan, así que
           funciona igual de bien en pantalla chica. */
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {DAY_NAMES.map((nombre, i) => (
            <section key={nombre} aria-label={t(nombre)}>
              <h2
                className={`mb-3 text-sm font-semibold ${
                  i === hoy ? "text-violet-700" : "text-neutral-900"
                }`}
              >
                {t(nombre)}
                {i === hoy && (
                  <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">
                    {t("Hoy")}
                  </span>
                )}
              </h2>

              {porDia[i].length === 0 ? (
                <p className="text-xs text-neutral-500">{t("Sin clases")}</p>
              ) : (
                <ul className="space-y-2">
                  {porDia[i].map((c) => (
                    <li key={c.id}>
                      <div
                        className={`rounded-2xl border p-3 ${
                          DISCIPLINE_STYLES[c.discipline].card
                        }`}
                      >
                        <p className="text-sm font-semibold break-words hyphens-auto">{c.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs">
                          <Clock size={12} aria-hidden="true" />
                          {c.startTime}–{c.endTime}
                        </p>
                        <p className="mt-0.5 text-xs opacity-90">
                          {c.instructor}
                        </p>

                        {puedeQuitar(c) && (
                          <button
                            type="button"
                            onClick={() => quitar(c)}
                            aria-label={t("Quitar {titulo} del horario", { titulo: c.title })}
                            className="
                              mt-2 flex cursor-pointer items-center gap-1 rounded
                              text-xs font-semibold opacity-80
                              transition-opacity duration-200
                              motion-reduce:transition-none
                              hover:opacity-100
                              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                            "
                          >
                            <Trash2 size={12} aria-hidden="true" />
                            {t("Quitar")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : (
        /* Vista lista: más detalle por clase */
        <div className="mt-6 space-y-6">
          {DAY_NAMES.map((nombre, i) =>
            porDia[i].length === 0 ? null : (
              <section key={nombre}>
                <h2 className="text-sm font-semibold text-neutral-900">
                  {t(nombre)}
                  {i === hoy && (
                    <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">
                      {t("Hoy")}
                    </span>
                  )}
                </h2>

                <ul className="mt-3 space-y-2">
                  {porDia[i].map((c) => (
                    <li key={c.id}>
                      <Card className="flex flex-wrap items-center gap-4 p-4">

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900">
                            {c.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                            <span className="flex items-center gap-1">
                              <Clock size={14} aria-hidden="true" />
                              {c.startTime}–{c.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={14} aria-hidden="true" />
                              {c.instructor}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={14} aria-hidden="true" />
                              {c.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={14} aria-hidden="true" />
                              {t("{n} lugares", { n: c.capacity })}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                            DISCIPLINE_STYLES[c.discipline].card
                          }`}
                        >
                          {t(DISCIPLINE_LABELS[c.discipline])}
                        </span>

                        <span className="shrink-0 rounded-full border border-neutral-300 bg-surface px-3 py-1 text-xs font-semibold text-neutral-700">
                          {t(LEVEL_LABELS[c.level])}
                        </span>

                        {puedeQuitar(c) && (
                          <button
                            type="button"
                            onClick={() => quitar(c)}
                            aria-label={t("Quitar {titulo} del horario", { titulo: c.title })}
                            className="
                              flex h-11 w-11 shrink-0 cursor-pointer items-center
                              justify-center rounded-xl text-neutral-500
                              transition-colors duration-200
                              motion-reduce:transition-none
                              hover:bg-red-50 hover:text-red-700
                              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                            "
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default Classes;
