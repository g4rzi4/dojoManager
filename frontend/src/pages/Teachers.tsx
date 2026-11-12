import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Copy, GraduationCap, UserPlus } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import { t } from "../i18n";
import { copiarTexto } from "../lib/portapapeles";
import ModuleTile from "../components/ModuleTile";
import PageHeading from "../components/PageHeading";
import TeacherForm from "../components/TeacherForm";
import { ApiError, getTeachers, setTeacherActive } from "../services/api";
import type { Teacher } from "../types/teacher";

/**
 * Administración de profesores. Solo el ADMIN llega aquí: la ruta exige
 * teachers:read, que ningún otro rol tiene.
 */
function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [copiada, setCopiada] = useState<string | null>(null);

  function cargar() {
    return getTeachers()
      .then(setTeachers)
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? e.message
            : t("No fue posible cargar los profesores.")
        );
      });
  }

  useEffect(() => {
    let activo = true;

    getTeachers()
      .then((data) => {
        if (activo) setTeachers(data);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : t("No fue posible cargar los profesores.")
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

  async function copiarClave(code: string) {
    try {
      await copiarTexto(code);
      setCopiada(code);
      // Vuelve al icono normal tras un momento, para que se note el cambio.
      window.setTimeout(() => setCopiada(null), 1500);
    } catch {
      // Sin permiso de portapapeles no hacemos nada: la clave igual se ve
      // en pantalla y se puede seleccionar a mano.
    }
  }

  async function cambiarEstado(teacher: Teacher) {
    try {
      await setTeacherActive(teacher.id, !teacher.active);
      await cargar();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible cambiar el estado del profesor.")
      );
    }
  }

  return (
    <DashboardLayout>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading module="profesores">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Profesores")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {t(
              "Cada profesor tiene una clave única. Se escribe al registrar un alumno para asignarlo a su grupo."
            )}
          </p>
        </PageHeading>

        <button
          type="button"
          onClick={() => setRegistrando((v) => !v)}
          aria-expanded={registrando}
          className="
            flex cursor-pointer items-center gap-2 rounded-2xl bg-violet-600
            px-4 py-2.5 text-sm font-semibold text-white
            transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-violet-700
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
          "
        >
          <UserPlus size={17} aria-hidden="true" />
          {t("Registrar profesor")}
        </button>
      </header>

      {registrando && (
        <div className="mt-6">
          <TeacherForm
            onCreado={async () => {
              setRegistrando(false);
              await cargar();
            }}
            onCancelar={() => setRegistrando(false)}
          />
        </div>
      )}

      {error && (
        <Card className="mt-6 border-red-200 p-6">
          <p className="font-semibold text-red-800">
            {t("Ocurrió un problema")}
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      )}

      <section className="mt-8">
        {loading ? (
          <div className="space-y-3">
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            <Card className="h-24 animate-pulse motion-reduce:animate-none" />
          </div>
        ) : teachers.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
              <GraduationCap size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-neutral-900">
              {t("Todavía no hay profesores")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("Registra el primero para poder asignarle alumnos.")}
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {teachers.map((prof) => (
              <li key={prof.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <ModuleTile module="profesores" />

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{prof.name}</p>
                      <p className="truncate text-sm text-neutral-600">
                        {prof.email}
                      </p>
                    </div>

                    {/* Clave: en monoespaciada porque se dicta y se copia */}
                    {prof.teacherCode && (
                      <button
                        type="button"
                        onClick={() => copiarClave(prof.teacherCode!)}
                        aria-label={t("Copiar la clave {clave}", { clave: prof.teacherCode })}
                        className="
                          flex shrink-0 cursor-pointer items-center gap-2 rounded-xl
                          border border-neutral-300 bg-neutral-50 px-3 py-2
                          font-mono text-sm font-semibold text-neutral-900
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:bg-neutral-100
                          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                        "
                      >
                        {prof.teacherCode}
                        {copiada === prof.teacherCode ? (
                          <Check
                            size={15}
                            aria-hidden="true"
                            className="text-emerald-700"
                          />
                        ) : (
                          <Copy
                            size={15}
                            aria-hidden="true"
                            className="text-neutral-500"
                          />
                        )}
                      </button>
                    )}

                    <span className="shrink-0 rounded-full border border-neutral-300 bg-surface px-3 py-1 text-xs font-semibold text-neutral-700">
                      {prof.alumnos}{" "}
                      {prof.alumnos === 1 ? t("alumno") : t("alumnos")}
                    </span>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                        prof.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-neutral-300 bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {prof.active ? t("Activo") : t("Inactivo")}
                    </span>

                    <Link
                      to={`/profesores/${prof.id}`}
                      className="
                        flex shrink-0 cursor-pointer items-center gap-1 rounded-xl
                        px-3 py-2 text-sm font-semibold text-violet-700
                        transition-colors duration-200
                        motion-reduce:transition-none
                        hover:bg-violet-50
                        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                      "
                    >
                      {t("Ver ficha")}
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(prof)}
                      className="
                        shrink-0 cursor-pointer rounded-xl px-3 py-2 text-sm
                        font-semibold text-neutral-700 transition-colors duration-200
                        motion-reduce:transition-none
                        hover:bg-neutral-100 hover:text-neutral-900
                        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                      "
                    >
                      {prof.active ? t("Dar de baja") : t("Reactivar")}
                    </button>
                  </div>

                  {!prof.active && prof.alumnos > 0 && (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-amber-800">
                      {t(
                        "Tiene {n} alumnos asignados. Al estar inactivo no puede entrar al sistema, pero sus alumnos siguen ligados a él. Reasígnalos a otro profesor si hace falta.",
                        { n: prof.alumnos }
                      )}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Teachers;
