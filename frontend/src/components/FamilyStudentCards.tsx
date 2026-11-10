import { useEffect, useState } from "react";
import { IdCard } from "lucide-react";

import { t } from "../i18n";
import Card from "./Card";
import StudentCardView from "./StudentCardView";
import { ApiError, getStudentCard } from "../services/api";
import type { MyStudent } from "../types/payment";
import type { StudentCard } from "../types/student";
import { BELT_LABELS, BELT_STYLES } from "../types/student";

type Props = {
  students: MyStudent[];
};

/**
 * Muestra la tarjeta completa de los alumnos a cargo de quien tiene la
 * sesión: su propio expediente si es alumno, los de sus hijos si es tutor.
 *
 * Con más de un hijo no apilamos las tarjetas completas: cada una trae
 * datos personales, resumen y cuatro pestañas de historial, así que dos
 * seguidas dejarían una página larguísima. En su lugar hay un selector y se
 * muestra la del hijo elegido.
 *
 * Las tarjetas se piden una por una y se guardan en memoria: cambiar de hijo
 * y volver no repite la petición.
 */
function FamilyStudentCards({ students }: Props) {
  const [seleccionado, setSeleccionado] = useState<number | null>(
    students[0]?.id ?? null
  );
  const [cache, setCache] = useState<Record<number, StudentCard>>({});
  /** El error se guarda con el id al que corresponde, para no mostrarlo
   *  encima del expediente de otro hijo al cambiar de pestaña. */
  const [error, setError] = useState<{ id: number; message: string } | null>(
    null
  );

  useEffect(() => {
    if (seleccionado === null) return;
    // Ya la tenemos en memoria: no hay que volver a pedirla.
    if (cache[seleccionado]) return;

    let activo = true;

    getStudentCard(seleccionado)
      .then((card) => {
        if (activo) setCache((prev) => ({ ...prev, [card.id]: card }));
      })
      .catch((e: unknown) => {
        if (activo) {
          setError({
            id: seleccionado,
            message:
              e instanceof ApiError
                ? e.message
                : t("No fue posible cargar el expediente."),
          });
        }
      });

    return () => {
      activo = false;
    };
    // cache está en las dependencias a propósito: si una tarjeta llega, el
    // efecto vuelve a correr y encuentra el early return de arriba.
  }, [seleccionado, cache]);

  if (students.length === 0) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
          <IdCard size={26} aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-bold text-neutral-900">
          {t("No hay expedientes ligados a tu cuenta")}
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          {t("Pide al dojo que ligue el expediente a tu cuenta.")}
        </p>
      </Card>
    );
  }

  const tarjeta = seleccionado !== null ? cache[seleccionado] : undefined;

  // El error y la carga se derivan del render, en lugar de llamar a setState
  // dentro del efecto, que provoca renders en cascada.
  const errorActual = error?.id === seleccionado ? error.message : null;
  const cargando = seleccionado !== null && !tarjeta && !errorActual;

  return (
    <div>
      {/* Selector, solo si hay más de un expediente */}
      {students.length > 1 && (
        <div
          role="tablist"
          aria-label={t("Elegir expediente")}
          className="mb-5 flex flex-wrap gap-2"
        >
          {students.map((s) => {
            const activa = s.id === seleccionado;

            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setSeleccionado(s.id)}
                className={`
                  flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3
                  text-left transition-colors duration-200
                  motion-reduce:transition-none
                  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                  ${
                    activa
                      ? "border-violet-600 bg-violet-50"
                      : "border-neutral-300 bg-surface hover:bg-neutral-50"
                  }
                `}
              >
                <span
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl
                    text-sm font-bold
                    ${activa ? "bg-violet-600 text-white" : "bg-neutral-200 text-neutral-700"}
                  `}
                >
                  {s.firstName.charAt(0).toUpperCase()}
                  {s.lastName.charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0">
                  <span
                    className={`block text-sm font-semibold ${
                      activa ? "text-violet-900" : "text-neutral-900"
                    }`}
                  >
                    {s.firstName} {s.lastName}
                  </span>
                  <span
                    className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      BELT_STYLES[s.currentBelt]
                    }`}
                  >
                    {t("Cinta {color}", {
                      color: t(BELT_LABELS[s.currentBelt]).toLowerCase(),
                    })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {errorActual && (
        <Card className="border-red-200 p-6">
          <p className="font-semibold text-red-800">
            {t("No se pudo mostrar el expediente")}
          </p>
          <p className="mt-1 text-sm text-red-700">{errorActual}</p>
        </Card>
      )}

      {/* Mientras carga, reserva el espacio para que la página no salte */}
      {cargando && (
        <div className="space-y-6">
          <Card className="h-56 animate-pulse motion-reduce:animate-none" />
          <Card className="h-80 animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {tarjeta && <StudentCardView student={tarjeta} />}
    </div>
  );
}

export default FamilyStudentCards;
