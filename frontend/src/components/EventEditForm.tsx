import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";

import Card from "./Card";
import { ApiError, updateEvent } from "../services/api";
import type { DojoEvent } from "../types/event";

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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tieneModalidades = modalidades.length > 0;

  const llenas = modalidades.filter(
    (m) => m.name.trim().length > 0 && Number(m.precio) > 0
  );

  const valido =
    title.trim().length > 0 &&
    date.length > 0 &&
    (!event.requiresPayment ||
      (tieneModalidades ? llenas.length > 0 : Number(precio) > 0));

  async function guardar() {
    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      await updateEvent(event.id, {
        title: title.trim(),
        date,
        time: time || null,
        priceCents:
          event.requiresPayment && !tieneModalidades
            ? Math.round(Number(precio) * 100)
            : undefined,
        modalities: tieneModalidades
          ? llenas.map((m) => ({
              id: m.id,
              name: m.name.trim(),
              priceCents: Math.round(Number(m.precio) * 100),
            }))
          : undefined,
      });

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
    w-full rounded-xl border border-slate-300 bg-white px-4 py-3
    outline-none transition-all
    focus:border-blue-600 focus:ring-4 focus:ring-blue-100
  `;

  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-900">Editar evento</h3>
      <p className="mt-1 text-sm text-slate-600">
        Cambiar un precio no altera los cobros ya hechos.
      </p>

      <div className="mt-5 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor={`ed-titulo-${event.id}`}
            className="block text-sm font-medium text-slate-700"
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`ed-fecha-${event.id}`}
              className="block text-sm font-medium text-slate-700"
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
              className="block text-sm font-medium text-slate-700"
            >
              Hora{" "}
              <span className="font-normal text-slate-500">(opcional)</span>
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

        {event.requiresPayment && (
          <fieldset className="border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
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
                          className="block text-sm font-medium text-slate-700"
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
                          className="block text-sm font-medium text-slate-700"
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
                          justify-center rounded-lg text-slate-500
                          transition-colors duration-200
                          motion-reduce:transition-none
                          hover:bg-red-50 hover:text-red-700
                          focus:ring-2 focus:ring-blue-600 focus:outline-none
                        "
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModalidades((prev) => [...prev, { name: "", precio: "" }])
                  }
                  className="
                    mt-3 flex cursor-pointer items-center gap-2 rounded-xl border
                    border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold
                    text-slate-700 transition-colors duration-200
                    motion-reduce:transition-none
                    hover:bg-slate-50
                    focus:ring-2 focus:ring-blue-600 focus:outline-none
                  "
                >
                  <Plus size={16} aria-hidden="true" />
                  Agregar modalidad
                </button>

                <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
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
              </>
            ) : (
              <div className="mt-3 max-w-xs space-y-2">
                <label
                  htmlFor={`ed-costo-${event.id}`}
                  className="block text-sm font-medium text-slate-700"
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
          <button
            type="button"
            onClick={guardar}
            disabled={!valido || guardando}
            className="
              cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3
              font-semibold text-slate-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-slate-50
              focus:ring-2 focus:ring-blue-600 focus:outline-none
            "
          >
            Cancelar
          </button>
        </div>
      </div>
    </Card>
  );
}

export default EventEditForm;
