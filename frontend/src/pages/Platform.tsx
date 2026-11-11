import { useEffect, useId, useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import FormularioAdmin from "../components/FormularioAdmin";
import PageHeading from "../components/PageHeading";
import { getLocale, t } from "../i18n";
import {
  ApiError,
  addDojoAdmin,
  createDojo,
  deleteDojo,
  getPlatformDojos,
  type PlatformDojo,
} from "../services/api";

const BOTON_SECUNDARIO = `
  inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-neutral-300
  bg-surface px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-200
  motion-reduce:transition-none hover:bg-neutral-50
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
`;

const BOTON_PELIGRO = `
  inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl bg-red-600 px-4 py-2
  text-sm font-semibold text-white transition-colors duration-200 motion-reduce:transition-none
  hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2
  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50
`;

/**
 * Confirmación para borrar un dojo: hay que escribir su nombre exacto. El
 * servidor vuelve a comprobarlo, así que esto evita el clic accidental.
 */
function ConfirmarBorrado({
  dojo,
  onCancel,
  onDone,
}: {
  dojo: PlatformDojo;
  onCancel: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [nombre, setNombre] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const coincide = nombre.trim() === dojo.name.trim();

  async function borrar() {
    setBorrando(true);
    setError("");

    try {
      await deleteDojo(dojo.id, nombre);
      onDone();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : t("No fue posible eliminar el dojo."));
      setBorrando(false);
    }
  }

  return (
    <div className="mt-2 space-y-4 border-t border-neutral-200/80 pt-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-semibold">{t("Esto no se puede deshacer.")}</p>
        <p className="mt-1">
          {t(
            "Se borrarán el dojo y todo lo suyo: {alumnos} alumnos, sus cuentas, profesores y administradores, asistencia, pagos, eventos, clases, notificaciones y solicitudes de equipo.",
            { alumnos: dojo.students }
          )}
        </p>
      </div>

      <div>
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {t("Para confirmar, escribe el nombre del dojo: {nombre}", { nombre: dojo.name })}
        </label>
        <input
          id={id}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 min-h-11 w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-2 text-neutral-800 focus:border-red-600 focus:ring-4 focus:ring-red-100 focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={borrar} disabled={!coincide || borrando} className={BOTON_PELIGRO}>
          <Trash2 size={18} aria-hidden="true" />
          {borrando ? t("Eliminando…") : t("Eliminar definitivamente")}
        </button>
        <button type="button" onClick={onCancel} disabled={borrando} className={BOTON_SECUNDARIO}>
          {t("Cancelar")}
        </button>
      </div>
    </div>
  );
}

/**
 * Pantalla del superadministrador: dojos y sus administradores.
 *
 * No muestra alumnos ni pagos de ningún dojo: esos datos no son de la
 * plataforma, y el superadministrador no tiene permiso para verlos.
 */
function Platform() {
  const [dojos, setDojos] = useState<PlatformDojo[] | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  /**
   * "dojo" para el alta de un dojo; un número, para sumarle admin a ese;
   * `borrar-<id>`, para la confirmación de borrado de ese dojo.
   */
  const [abierto, setAbierto] = useState<"dojo" | number | `borrar-${number}` | null>(null);

  /** Sube después de cada alta para volver a pedir la lista. */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    getPlatformDojos()
      .then((data) => {
        if (activo) {
          setDojos(data.dojos);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : t("No fue posible cargar los dojos.")
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [version]);

  function terminar(mensaje: string) {
    setAbierto(null);
    setAviso(mensaje);
    setVersion((v) => v + 1);
  }

  function abrir(cual: "dojo" | number | `borrar-${number}`) {
    setAviso("");
    setAbierto(cual);
  }

  return (
    <DashboardLayout>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading module="plataforma">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Plataforma")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {t("Crea los dojos y las cuentas de quienes los administran.")}
          </p>
        </PageHeading>

        {abierto !== "dojo" && (
          <button type="button" onClick={() => abrir("dojo")} className={BOTON_SECUNDARIO}>
            <Plus size={18} aria-hidden="true" />
            {t("Nuevo dojo")}
          </button>
        )}
      </header>

      <div className="mt-8 max-w-3xl space-y-4">
        <p role="status" className="text-sm font-medium text-emerald-800 empty:hidden">
          {aviso}
        </p>

        {abierto === "dojo" && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-neutral-800">
              {t("Nuevo dojo")}
            </h2>
            <FormularioAdmin
              conDojo
              textoBoton={t("Crear dojo")}
              onCancel={() => setAbierto(null)}
              onSubmit={async (admin, dojoName) => {
                await createDojo({ dojoName, ...admin });
                terminar(
                  t("Dojo creado. Comparte el correo y la contraseña con su administrador.")
                );
              }}
            />
          </Card>
        )}

        {error && (
          <Card className="border-red-200 p-5">
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          </Card>
        )}

        {dojos === null && !error && (
          <Card className="h-32 animate-pulse motion-reduce:animate-none" />
        )}

        {dojos?.length === 0 && (
          <Card className="p-8 text-center text-neutral-600">
            {t("Todavía no hay dojos. Crea el primero con el botón de arriba.")}
          </Card>
        )}

        {dojos?.map((dojo) => (
          <Card key={dojo.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold break-words text-neutral-800">
                  {dojo.name}
                </h2>
                <p className="mt-0.5 text-sm text-neutral-600">
                  {dojo.students === 1
                    ? t("{n} alumno", { n: dojo.students })
                    : t("{n} alumnos", { n: dojo.students })}
                  {" · "}
                  {t("Creado el {fecha}", {
                    fecha: new Date(dojo.createdAt).toLocaleDateString(getLocale(), {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  })}
                </p>
              </div>

              {abierto !== dojo.id && abierto !== `borrar-${dojo.id}` && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => abrir(dojo.id)} className={BOTON_SECUNDARIO}>
                    <UserPlus size={18} aria-hidden="true" />
                    {t("Agregar administrador")}
                  </button>
                  <button
                    type="button"
                    onClick={() => abrir(`borrar-${dojo.id}`)}
                    className={`${BOTON_SECUNDARIO} text-red-700 hover:border-red-300 hover:bg-red-50`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    {t("Eliminar dojo")}
                  </button>
                </div>
              )}
            </div>

            <ul className="mt-4 divide-y divide-neutral-200/80 border-t border-neutral-200/80">
              {dojo.admins.map((admin) => (
                <li key={admin.id} className="py-3">
                  <p className="font-semibold break-words text-neutral-800">
                    {admin.name}
                  </p>
                  <p className="text-sm break-all text-neutral-600">{admin.email}</p>
                </li>
              ))}
              {dojo.admins.length === 0 && (
                <li className="py-3 text-sm text-neutral-600">
                  {t("Este dojo no tiene administradores.")}
                </li>
              )}
            </ul>

            {abierto === dojo.id && (
              <div className="mt-2 border-t border-neutral-200/80 pt-4">
                <FormularioAdmin
                  conDojo={false}
                  textoBoton={t("Crear administrador")}
                  onCancel={() => setAbierto(null)}
                  onSubmit={async (admin) => {
                    await addDojoAdmin(dojo.id, admin);
                    terminar(
                      t("Administrador creado. Comparte con esa persona su correo y contraseña.")
                    );
                  }}
                />
              </div>
            )}

            {abierto === `borrar-${dojo.id}` && (
              <ConfirmarBorrado
                dojo={dojo}
                onCancel={() => setAbierto(null)}
                onDone={() => terminar(t("Dojo «{nombre}» eliminado.", { nombre: dojo.name }))}
              />
            )}
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default Platform;
