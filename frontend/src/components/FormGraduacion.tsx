import { useState, type FormEvent } from "react";

import { addBeltPromotion, ApiError } from "../services/api";
import { BELT_LABELS, type Belt } from "../types/student";
import { toDateKey } from "../utils/date";

const CINTAS = Object.keys(BELT_LABELS) as Belt[];

const CAMPO = `
  mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
  text-neutral-800 outline-none
  focus:border-violet-600 focus:ring-4 focus:ring-violet-100
`;

const ETIQUETA = "block text-sm font-medium text-neutral-700";

type Props = {
  studentId: number;
  currentBelt: Belt;
  onGuardado: () => void;
};

function FormGraduacion({ studentId, currentBelt, onGuardado }: Props) {
  const hoy = toDateKey(new Date());
  const siguiente =
    CINTAS[Math.min(CINTAS.indexOf(currentBelt) + 1, CINTAS.length - 1)];

  const [abierto, setAbierto] = useState(false);
  const [cinta, setCinta] = useState<Belt>(siguiente);
  const [fecha, setFecha] = useState(hoy);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function abrir() {
    // Sugiere la siguiente a la cinta vigente, que pudo cambiar.
    setCinta(siguiente);
    setError("");
    setAbierto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (guardando) return;

    setGuardando(true);
    setError("");

    try {
      await addBeltPromotion(studentId, {
        belt: cinta,
        promotedAt: fecha,
        notes: notas,
      });
      setNotas("");
      setAbierto(false);
      onGuardado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible registrar la graduación."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={abrir}
          className="min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Registrar graduación
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="grad-cinta" className={ETIQUETA}>
          Nueva cinta
        </label>
        <select
          id="grad-cinta"
          value={cinta}
          onChange={(e) => setCinta(e.target.value as Belt)}
          className={`${CAMPO} cursor-pointer`}
        >
          {CINTAS.map((c) => (
            <option key={c} value={c}>
              {BELT_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="grad-fecha" className={ETIQUETA}>
          Fecha del examen
        </label>
        <input
          id="grad-fecha"
          type="date"
          required
          max={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="grad-notas" className={ETIQUETA}>
          Notas (opcional)
        </label>
        <input
          id="grad-notas"
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar graduación"}
        </button>
      </div>
    </form>
  );
}

export default FormGraduacion;
