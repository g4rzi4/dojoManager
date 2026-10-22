import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import Card from "./Card";
import { ApiError, createEvent } from "../services/api";
import { CATEGORY_LABELS, type EventCategory } from "../types/event";

type Props = {
  onCreado: () => void | Promise<void>;
  onCancelar: () => void;
};

const CATEGORIAS = Object.keys(CATEGORY_LABELS) as EventCategory[];

/** Alta de un evento del calendario. Admin y profesores. */
function EventForm({ onCreado, onCancelar }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<EventCategory>("CLASE");
  const [requiresPayment, setRequiresPayment] = useState(false);
  /** En pesos: se convierte a centavos al enviar. */
  const [precio, setPrecio] = useState("");
  /**
   * Modalidades con su costo. Si hay al menos una, el costo del evento sale
   * de la suma de las que elija cada alumno, y el precio único se ignora.
   *
   * Es para torneos: hay padres que inscriben a su hijo en kata y kumite,
   * y pagan las dos.
   */
  const [porModalidades, setPorModalidades] = useState(false);
  const [modalidades, setModalidades] = useState<
    { name: string; precio: string }[]
  >([{ name: "Kata", precio: "" }, { name: "Kumite", precio: "" }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const modalidadesLlenas = modalidades.filter(
    (m) => m.name.trim().length > 0 && Number(m.precio) > 0
  );

  const precioValido = !requiresPayment
    ? true
    : porModalidades
      ? modalidadesLlenas.length > 0
      : Number(precio) > 0 && Number.isFinite(Number(precio));

  const valido = title.trim().length > 0 && date.length > 0 && precioValido;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      await createEvent({
        title: title.trim(),
        date,
        time: time || undefined,
        category,
        requiresPayment,
        // El backend espera centavos como entero. Math.round evita que
        // 450.1 se convierta en 45009.999...
        priceCents:
          requiresPayment && !porModalidades
            ? Math.round(Number(precio) * 100)
            : undefined,
        modalities:
          requiresPayment && porModalidades
            ? modalidadesLlenas.map((m) => ({
                name: m.name.trim(),
                priceCents: Math.round(Number(m.precio) * 100),
              }))
            : undefined,
      });

      setTitle("");
      setDate("");
      setTime("");
      setRequiresPayment(false);
      setPrecio("");
      setPorModalidades(false);
      setModalidades([
        { name: "Kata", precio: "" },
        { name: "Kumite", precio: "" },
      ]);

      await onCreado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No fue posible crear el evento."
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
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-slate-900">Agregar un evento</h2>
      <p className="mt-1 text-sm text-slate-600">
        Aparece en el calendario de todos y les llega una notificación a
        alumnos y tutores.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="ev-titulo"
            className="block text-sm font-medium text-slate-700"
          >
            Título
          </label>
          <input
            id="ev-titulo"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Examen de cinta azul"
            className={inputClase}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <label
              htmlFor="ev-fecha"
              className="block text-sm font-medium text-slate-700"
            >
              Fecha
            </label>
            <input
              id="ev-fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="ev-hora"
              className="block text-sm font-medium text-slate-700"
            >
              Hora{" "}
              <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <input
              id="ev-hora"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-describedby="ev-hora-ayuda"
              className={inputClase}
            />
            <p id="ev-hora-ayuda" className="text-xs text-slate-500">
              Sin hora, dura todo el día.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="ev-categoria"
              className="block text-sm font-medium text-slate-700"
            >
              Categoría
            </label>
            <select
              id="ev-categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className={`${inputClase} cursor-pointer`}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pago: para torneos y exámenes que cuestan */}
        <fieldset className="border-t border-slate-200 pt-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={requiresPayment}
              onChange={(e) => setRequiresPayment(e.target.checked)}
              className="mt-1 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Requiere pago para participar
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Los alumnos reportarán el pago con la clave de su profesor, y
                quedan inscritos cuando él lo confirme.
              </span>
            </span>
          </label>

          {requiresPayment && (
            <>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={porModalidades}
                  onChange={(e) => setPorModalidades(e.target.checked)}
                  className="mt-1 cursor-pointer"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-700">
                    Cobrar por modalidad
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    Para torneos: cada modalidad tiene su costo y el alumno
                    paga la suma de las que elija. Hay quien entra a kata y
                    kumite.
                  </span>
                </span>
              </label>

              {porModalidades ? (
                <div className="mt-4 space-y-3">
                  {modalidades.map((m, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-3">
                      <div className="min-w-40 flex-1 space-y-2">
                        <label
                          htmlFor={`mod-nombre-${i}`}
                          className="block text-sm font-medium text-slate-700"
                        >
                          Modalidad {i + 1}
                        </label>
                        <input
                          id={`mod-nombre-${i}`}
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            setModalidades((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, name: e.target.value } : x
                              )
                            )
                          }
                          placeholder="Kata"
                          className={inputClase}
                        />
                      </div>

                      <div className="w-36 space-y-2">
                        <label
                          htmlFor={`mod-precio-${i}`}
                          className="block text-sm font-medium text-slate-700"
                        >
                          Costo
                        </label>
                        <input
                          id={`mod-precio-${i}`}
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
                          placeholder="450.00"
                          className={inputClase}
                        />
                      </div>

                      {modalidades.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setModalidades((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          aria-label={`Quitar la modalidad ${i + 1}`}
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
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setModalidades((prev) => [...prev, { name: "", precio: "" }])
                    }
                    className="
                      flex cursor-pointer items-center gap-2 rounded-xl border
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
                </div>
              ) : (
                <div className="mt-4 max-w-xs space-y-2">
                  <label
                    htmlFor="ev-precio"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Costo en pesos
                  </label>
                  <input
                    id="ev-precio"
                    type="number"
                    min="1"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="450.00"
                    className={inputClase}
                  />
                </div>
              )}
            </>
          )}
        </fieldset>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
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
            {guardando ? "Guardando..." : "Agregar evento"}
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
      </form>
    </Card>
  );
}

export default EventForm;
