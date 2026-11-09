import { useState } from "react";

import Card from "./Card";
import {
  DAY_NAMES,
  DISCIPLINE_LABELS,
  LEVEL_LABELS,
  type Discipline,
  type DojoClass,
  type Level,
} from "../types/dojoClass";

type Props = {
  onGuardar: (clase: Omit<DojoClass, "id">) => void;
  onCancelar: () => void;
};

const DISCIPLINAS = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const NIVELES = Object.keys(LEVEL_LABELS) as Level[];

/** Alta de una clase en el horario semanal. */
function ClassForm({ onGuardar, onCancelar }: Props) {
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<Discipline>("KARATE");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [instructor, setInstructor] = useState("");
  const [location, setLocation] = useState("Tatami 1");
  const [level, setLevel] = useState<Level>("PRINCIPIANTES");
  const [capacity, setCapacity] = useState(15);
  const [error, setError] = useState("");

  const valido = title.trim().length > 0 && instructor.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!valido) return;

    // La hora de fin tiene que ser posterior. Compararlas como texto
    // funciona porque "HH:MM" con ceros a la izquierda ordena igual que
    // cronológicamente.
    if (endTime <= startTime) {
      setError("La hora de fin debe ser posterior a la de inicio.");
      return;
    }

    if (capacity < 1) {
      setError("La capacidad debe ser al menos 1.");
      return;
    }

    setError("");

    onGuardar({
      title: title.trim(),
      discipline,
      dayOfWeek,
      startTime,
      endTime,
      instructor: instructor.trim(),
      location: location.trim(),
      level,
      capacity,
    });
  }

  const inputClase = `
    w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
    outline-none transition-[border-color,box-shadow,background-color]
    focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
  `;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-neutral-900">Agregar una clase</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Se repite cada semana en el día y horario que indiques.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="cl-titulo"
              className="block text-sm font-medium text-neutral-700"
            >
              Nombre de la clase
            </label>
            <input
              id="cl-titulo"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Karate infantil"
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-disciplina"
              className="block text-sm font-medium text-neutral-700"
            >
              Disciplina
            </label>
            <select
              id="cl-disciplina"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
              className={`${inputClase} cursor-pointer`}
            >
              {DISCIPLINAS.map((d) => (
                <option key={d} value={d}>
                  {DISCIPLINE_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-dia"
              className="block text-sm font-medium text-neutral-700"
            >
              Día
            </label>
            <select
              id="cl-dia"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className={`${inputClase} cursor-pointer`}
            >
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-instructor"
              className="block text-sm font-medium text-neutral-700"
            >
              Instructor
            </label>
            <input
              id="cl-instructor"
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Sensei Ramírez"
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-inicio"
              className="block text-sm font-medium text-neutral-700"
            >
              Hora de inicio
            </label>
            <input
              id="cl-inicio"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-fin"
              className="block text-sm font-medium text-neutral-700"
            >
              Hora de fin
            </label>
            <input
              id="cl-fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-lugar"
              className="block text-sm font-medium text-neutral-700"
            >
              Lugar
            </label>
            <input
              id="cl-lugar"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Tatami 1"
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-nivel"
              className="block text-sm font-medium text-neutral-700"
            >
              Nivel
            </label>
            <select
              id="cl-nivel"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className={`${inputClase} cursor-pointer`}
            >
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {LEVEL_LABELS[n]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cl-capacidad"
              className="block text-sm font-medium text-neutral-700"
            >
              Capacidad
            </label>
            <input
              id="cl-capacidad"
              type="number"
              min={1}
              max={200}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className={inputClase}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!valido}
            className="
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            Agregar clase
          </button>

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
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}

export default ClassForm;
