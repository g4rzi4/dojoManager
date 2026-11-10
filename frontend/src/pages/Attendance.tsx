import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { t } from "../i18n";
import { ApiError, getAttendance, saveAttendance } from "../services/api";
import type { AttendanceStudent } from "../types/attendance";
import { BELT_LABELS } from "../types/student";
import { toDateKey } from "../utils/date";

type Marca = boolean | null;
type Marcas = Record<number, Marca>;

type Lista = { fecha: string; students: AttendanceStudent[] };

const CAMPO = `
  mt-2 w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
  text-neutral-800 outline-none
  focus:border-violet-600 focus:ring-4 focus:ring-violet-100
`;

function Attendance() {
  const hoy = toDateKey(new Date());

  const [fecha, setFecha] = useState(hoy);
  const [lista, setLista] = useState<Lista | null>(null);
  const [marcas, setMarcas] = useState<Marcas>({});
  const [errorCarga, setErrorCarga] = useState<{
    fecha: string;
    message: string;
  } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [errorGuardar, setErrorGuardar] = useState("");

  useEffect(() => {
    let activo = true;

    getAttendance(fecha)
      .then((students) => {
        if (!activo) return;

        setLista({ fecha, students });
        setMarcas(Object.fromEntries(students.map((s) => [s.id, s.present])));
        setErrorCarga(null);
      })
      .catch((e: unknown) => {
        if (activo) {
          setErrorCarga({
            fecha,
            message:
              e instanceof ApiError
                ? e.message
                : t("No fue posible cargar la lista."),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [fecha]);

  const actual = lista?.fecha === fecha ? lista : null;
  const error = errorCarga?.fecha === fecha ? errorCarga.message : "";

  const cambios = useMemo(
    () =>
      (actual?.students ?? [])
        .filter((s) => (marcas[s.id] ?? null) !== s.present)
        .map((s) => ({ studentId: s.id, present: marcas[s.id] ?? null })),
    [actual, marcas]
  );

  const visibles = (actual?.students ?? []).filter((s) =>
    `${s.firstName} ${s.lastName}`
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase())
  );

  const valores = (actual?.students ?? []).map((s) => marcas[s.id] ?? null);
  const presentes = valores.filter((v) => v === true).length;
  const faltas = valores.filter((v) => v === false).length;
  const sinMarcar = valores.filter((v) => v === null).length;

  function cambiarFecha(nueva: string) {
    if (
      cambios.length > 0 &&
      !window.confirm(
        t("Tienes cambios sin guardar. ¿Cambiar de día y perderlos?")
      )
    ) {
      return;
    }

    setAviso("");
    setErrorGuardar("");
    setFecha(nueva);
  }

  /** Volver a tocar la opción elegida quita la marca. */
  function marcar(id: number, valor: boolean) {
    setAviso("");
    setMarcas((m) => ({ ...m, [id]: m[id] === valor ? null : valor }));
  }

  function marcarPresentesLosDemas() {
    setAviso("");
    setMarcas((m) => {
      const nuevas = { ...m };

      for (const s of visibles) {
        if ((nuevas[s.id] ?? null) === null) nuevas[s.id] = true;
      }

      return nuevas;
    });
  }

  async function guardar() {
    if (guardando || cambios.length === 0 || !actual) return;

    setGuardando(true);
    setAviso("");
    setErrorGuardar("");

    try {
      await saveAttendance(actual.fecha, cambios);

      // Lo guardado pasa a ser el nuevo punto de partida.
      setLista({
        fecha: actual.fecha,
        students: actual.students.map((s) => ({
          ...s,
          present: marcas[s.id] ?? null,
        })),
      });
      setAviso(t("Asistencia guardada."));
    } catch (e: unknown) {
      setErrorGuardar(
        e instanceof ApiError
          ? e.message
          : t("No fue posible guardar la asistencia.")
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="asistencia">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Asistencia")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {t("Pasa lista del día. A la familia le llega un aviso por cada falta.")}
          </p>
        </PageHeading>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="fecha-lista"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Día")}
          </label>
          <input
            id="fecha-lista"
            type="date"
            max={hoy}
            value={fecha}
            onChange={(e) => e.target.value && cambiarFecha(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label
            htmlFor="buscar-alumno"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Buscar alumno")}
          </label>
          <input
            id="buscar-alumno"
            type="search"
            placeholder={t("Nombre o apellido")}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={CAMPO}
          />
        </div>
      </div>

      {error ? (
        <Card className="mt-6 border-red-200 p-6">
          <p className="font-semibold text-red-800">
            {t("No se pudo cargar la lista")}
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      ) : !actual ? (
        <Card className="mt-6 h-64 animate-pulse motion-reduce:animate-none" />
      ) : actual.students.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <h2 className="font-bold text-neutral-900">
            {t("No hay alumnos activos")}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {t("Cuando tengas alumnos en tu grupo, aparecerán aquí.")}
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-700" role="status">
              {t("Asistieron:")}{" "}
              <span className="font-semibold">{presentes}</span> ·{" "}
              {t("Faltaron:")} <span className="font-semibold">{faltas}</span>{" "}
              · {t("Sin marcar:")}{" "}
              <span className="font-semibold">{sinMarcar}</span>
            </p>

            <button
              type="button"
              onClick={marcarPresentesLosDemas}
              className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-200 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none motion-reduce:transition-none"
            >
              {t("Marcar a los demás como presentes")}
            </button>
          </div>

          <Card className="mt-3 overflow-hidden">
            {visibles.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-600">
                {t("Ningún alumno coincide con la búsqueda.")}
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {visibles.map((s) => {
                  const nombre = `${s.firstName} ${s.lastName}`;

                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold break-words text-neutral-900">
                          {nombre}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {t("Cinta {color}", {
                            color: t(BELT_LABELS[s.currentBelt]).toLowerCase(),
                          })}
                          {s.teacherName && ` · ${s.teacherName}`}
                        </p>
                      </div>

                      <div
                        role="group"
                        aria-label={t("Asistencia de {nombre}", { nombre })}
                        className="flex gap-2"
                      >
                        <BotonMarca
                          activo={marcas[s.id] === true}
                          tono="presente"
                          onClick={() => marcar(s.id, true)}
                        />
                        <BotonMarca
                          activo={marcas[s.id] === false}
                          tono="falta"
                          onClick={() => marcar(s.id, false)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {aviso && (
              <p className="text-sm font-medium text-emerald-800" role="status">
                {aviso}
              </p>
            )}
            {errorGuardar && (
              <p className="text-sm font-medium text-red-700" role="alert">
                {errorGuardar}
              </p>
            )}

            <button
              type="button"
              disabled={guardando || cambios.length === 0}
              onClick={guardar}
              className="min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {guardando
                ? t("Guardando…")
                : cambios.length > 0
                  ? cambios.length === 1
                    ? t("Guardar {n} cambio", { n: cambios.length })
                    : t("Guardar {n} cambios", { n: cambios.length })
                  : t("Sin cambios")}
            </button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function BotonMarca({
  activo,
  tono,
  onClick,
}: {
  activo: boolean;
  tono: "presente" | "falta";
  onClick: () => void;
}) {
  const esPresente = tono === "presente";
  const Icono = esPresente ? Check : X;

  const color = activo
    ? esPresente
      ? "border-emerald-700 bg-emerald-700 text-white"
      : "border-red-700 bg-red-700 text-white"
    : "border-neutral-300 bg-surface text-neutral-700 hover:bg-neutral-50";

  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none motion-reduce:transition-none ${color}`}
    >
      <Icono size={16} aria-hidden="true" />
      {esPresente ? t("Asistió") : t("Faltó")}
    </button>
  );
}

export default Attendance;
