import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";

import Card from "./Card";
import { ApiError, updateEvent } from "../services/api";
import { getUser } from "../services/session";
import type { DojoEvent } from "../types/event";
import { formatMoney } from "../utils/format";

type Props = {
  event: DojoEvent;
  onGuardado: () => void | Promise<void>;
  onCancelar: () => void;
};

type FilaModalidad = {
  /** Sin id = modalidad nueva. */
  id?: number;
  name: string;
  /** En pesos; se convierte a centavos al guardar. */
  precio: string;
};

/**
 * Edición de un evento y sus costos por modalidad.
 *
 * La hacen el admin y los profesores, aunque el evento lo haya creado otro.
 *
 * Cambiar un precio NO altera los cobros ya hechos: cada inscripción guardó
 * el suyo al reportarse. Pero BORRAR una modalidad con alumnos inscritos sí
 * destruiría su desglose, así que el backend lo rechaza y aquí se avisa
 * antes de intentarlo.
 */
function EventEditForm({ event, onGuardado, onCancelar }: Props) {
  const user = getUser();
  /**
   * El profesor NO edita el evento para todos: solo ajusta lo que les cobra
   * a sus alumnos. Por eso ve nada más los precios.
   */
  const esAdmin = user?.role === "ADMIN";
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time ?? "");
  const [precio, setPrecio] = useState(
    event.priceCents ? String(event.priceCents / 100) : ""
  );
  const [modalidades, setModalidades] = useState<FilaModalidad[]>(
    (event.modalities ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      precio: String(m.priceCents / 100),
    }))
  );
  /**
   * Editable: un evento pudo crearse sin pago y querer cobrarse después.
   * Antes esto se leía directo de `event` y la sección de costos quedaba
   * escondida para siempre, sin forma de activarla.
   */
  const [conPago, setConPago] = useState(event.requiresPayment ?? false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tieneModalidades = modalidades.length > 0;

  const llenas = modalidades.filter(
    (m) => m.name.trim().length > 0 && Number(m.precio) > 0
  );

  /** El profesor solo puede ajustar precios de modalidades que ya existen. */
  const profesorPuedeEditar =
    esAdmin || (event.requiresPayment === true && tieneModalidades);

  const valido = esAdmin
    ? title.trim().length > 0 &&
      date.length > 0 &&
      (!conPago || (tieneModalidades ? llenas.length > 0 : Number(precio) > 0))
    : profesorPuedeEditar && llenas.length > 0;

  async function guardar() {
    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      await updateEvent(
        event.id,
        esAdmin
          ? {
              title: title.trim(),
              date,
              time: time || null,
              requiresPayment: conPago,
              priceCents:
                conPago && !tieneModalidades
                  ? Math.round(Number(precio) * 100)
                  : undefined,
              modalities: conPago && tieneModalidades
                ? llenas.map((m) => ({
                    id: m.id,
                    name: m.name.trim(),
                    priceCents: Math.round(Number(m.precio) * 100),
                  }))
                : undefined,
            }
          : {
              // Un profesor manda solo ajustes de precio sobre modalidades
              // que ya existen. El backend los guarda como SUYOS.
              modalities: llenas
                .filter((m) => m.id !== undefined)
                .map((m) => ({
                  id: m.id,
                  name: m.name.trim(),
                  priceCents: Math.round(Number(m.precio) * 100),
                })),
            }
      );

      await onGuardado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  const inputClase = `
    w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
    outline-none transition-[border-color,box-shadow,background-color]
    focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
  `;

  return (
    <Card className="p-5">
      <h3 className="font-bold text-neutral-900">
        {esAdmin ? "Editar evento" : "Mis costos para este evento"}
      </h3>
      <p className="mt-1 text-sm text-neutral-600">
        {esAdmin
          ? "Cambiar un precio no altera los cobros ya hechos."
          : "Estos precios aplican solo a TUS alumnos. Los demás grupos siguen con el costo base."}
      </p>

      <div className="mt-5 space-y-5">
        {esAdmin && (
        <div className="space-y-2">
          <label
            htmlFor={`ed-titulo-${event.id}`}
            className="block text-sm font-medium text-neutral-700"
          >
            Título
          </label>
          <input
            id={`ed-titulo-${event.id}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClase}
          />
        </div>
        )}

        {esAdmin && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`ed-fecha-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              Fecha
            </label>
            <input
              id={`ed-fecha-${event.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`ed-hora-${event.id}`}
              className="block text-sm font-medium text-neutral-700"
            >
              Hora{" "}
              <span className="font-normal text-neutral-500">(opcional)</span>
            </label>
            <input
              id={`ed-hora-${event.id}`}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClase}
            />
          </div>
        </div>
        )}

        {/* El admin puede activar el cobro en un evento que se creó gratuito */}
        {esAdmin && (
          <label className="flex cursor-pointer items-start gap-3 border-t border-neutral-200 pt-5">
            <input
              type="checkbox"
              checked={conPago}
              onChange={(e) => setConPago(e.target.checked)}
              className="mt-1 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-700">
                Requiere pago para participar
              </span>
              <span className="mt-0.5 block text-xs text-neutral-600">
                Actívalo para poder definir el costo o las modalidades.
              </span>
            </span>
          </label>
        )}

        {/* Al profesor hay que decirle por qué no puede hacer nada, en lugar
            de dejarle un formulario vacío */}
        {!esAdmin && !profesorPuedeEditar && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <TriangleAlert
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">
                Este evento todavía no tiene costos que ajustar
              </p>
              <p className="mt-1">
                {event.requiresPayment
                  ? "No tiene modalidades definidas."
                  : "No está marcado como evento con pago."}{" "}
                Pídele al administrador que lo configure; después podrás poner
                tus propios precios para tus alumnos.
              </p>
            </div>
          </div>
        )}

        {((esAdmin && conPago) || (!esAdmin && profesorPuedeEditar)) && (
          <fieldset className="border-t border-neutral-200 pt-5">
            <legend className="text-sm font-semibold text-neutral-900">
              {tieneModalidades ? "Costos por modalidad" : "Costo"}
            </legend>

            {tieneModalidades ? (
              <>
                <div className="mt-3 space-y-3">
                  {modalidades.map((m, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-3">
                      <div className="min-w-36 flex-1 space-y-2">
                        <label
                          htmlFor={`ed-mod-${event.id}-${i}`}
                          className="block text-sm font-medium text-neutral-700"
                        >
                          Modalidad
                        </label>
                        <input
                          id={`ed-mod-${event.id}-${i}`}
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            setModalidades((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, name: e.target.value } : x
                              )
                            )
                          }
                          className={inputClase}
                        />
                      </div>

                      <div className="w-32 space-y-2">
                        <label
                          htmlFor={`ed-precio-${event.id}-${i}`}
                          className="block text-sm font-medium text-neutral-700"
                        >
                          Costo
                        </label>
                        <input
                          id={`ed-precio-${event.id}-${i}`}
                          type="number"
                          min="1"
                          step="0.01"
                          value={m.precio}
                          onChange={(e) =>
                            setModalidades((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, precio: e.target.value } : x
                              )
                            )
                          }
                          className={inputClase}
                        />
                      </div>

                      {!esAdmin && m.id !== undefined && (
                        <p className="w-full text-xs text-neutral-500 sm:w-auto sm:pb-3">
                          base{" "}
                          {formatMoney(
                            event.modalities?.find((x) => x.id === m.id)
                              ?.basePriceCents ?? 0
                          )}
                        </p>
                      )}

                      {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalidades((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        aria-label={`Quitar ${m.name || "la modalidad"}`}
                        className="
                          flex h-11 w-11 shrink-0 cursor-pointer items-center
                          justify-center rounded-xl text-neutral-500
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:bg-red-50 hover:text-red-700
                          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                        "
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                      )}
                    </div>
                  ))}
                </div>

                {esAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setModalidades((prev) => [...prev, { name: "", precio: "" }])
                  }
                  className="
                    mt-3 flex cursor-pointer items-center gap-2 rounded-2xl border
                    border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold
                    text-neutral-700 transition-colors duration-200
                    motion-reduce:transition-none
                    hover:bg-neutral-50
                    focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                  "
                >
                  <Plus size={16} aria-hidden="true" />
                  Agregar modalidad
                </button>
                )}

                {esAdmin && (
                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <TriangleAlert
                    size={16}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-700"
                  />
                  <p className="text-xs text-amber-900">
                    Si quitas una modalidad que ya tiene alumnos inscritos, el
                    cambio se rechaza: perderías el desglose de sus cobros.
                    Puedes cambiarle el precio sin problema.
                  </p>
                </div>
                )}
              </>
            ) : (
              <div className="mt-3 max-w-xs space-y-2">
                <label
                  htmlFor={`ed-costo-${event.id}`}
                  className="block text-sm font-medium text-neutral-700"
                >
                  Costo en pesos
                </label>
                <input
                  id={`ed-costo-${event.id}`}
                  type="number"
                  min="1"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className={inputClase}
                />
              </div>
            )}
          </fieldset>
        )}

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {(esAdmin || profesorPuedeEditar) && (
          <button
            type="button"
            onClick={guardar}
            disabled={!valido || guardando}
            className="
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
          )}

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-2xl border border-neutral-300 bg-white px-5 py-3
              font-semibold text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            {esAdmin || profesorPuedeEditar ? "Cancelar" : "Cerrar"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default EventEditForm;
