import { useEffect, useState } from "react";
import { Plus, UserPlus } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import FormularioAdmin from "../components/FormularioAdmin";
import PageHeading from "../components/PageHeading";
import { getLocale, t } from "../i18n";
import {
  ApiError,
  addDojoAdmin,
  createDojo,
  getPlatformDojos,
  type PlatformDojo,
} from "../services/api";

const BOTON_SECUNDARIO = `
  inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-neutral-300
  bg-surface px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-200
  motion-reduce:transition-none hover:bg-neutral-50
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
`;

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
  /** "dojo" para el alta de un dojo; un número, para sumarle admin a ese. */
  const [abierto, setAbierto] = useState<"dojo" | number | null>(null);

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

  function abrir(cual: "dojo" | number) {
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

              {abierto !== dojo.id && (
                <button type="button" onClick={() => abrir(dojo.id)} className={BOTON_SECUNDARIO}>
                  <UserPlus size={18} aria-hidden="true" />
                  {t("Agregar administrador")}
                </button>
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
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default Platform;
