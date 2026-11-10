import { useEffect, useState, type FormEvent } from "react";

import Card from "./Card";
import { ApiError, generateMonthlyPayments, getStudents } from "../services/api";
import type { StudentListItem } from "../types/student";
import { MONTH_NAMES } from "../utils/date";
import { pesosACentavos } from "../utils/format";

const CAMPO = `
  mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
  text-neutral-800 outline-none
  focus:border-violet-600 focus:ring-4 focus:ring-violet-100
`;

const ETIQUETA = "block text-sm font-medium text-neutral-700";

type Props = {
  onGenerado: () => void;
  onCerrar: () => void;
};

/** Crea la mensualidad de un mes, para todo el grupo o para un solo alumno. */
function GenerarMensualidades({ onGenerado, onCerrar }: Props) {
  const ahora = new Date();

  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [monto, setMonto] = useState("");
  const [alumno, setAlumno] = useState("TODOS");
  const [nota, setNota] = useState("");
  const [alumnos, setAlumnos] = useState<StudentListItem[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    getStudents()
      .then((lista) => {
        if (activo) setAlumnos(lista.filter((a) => a.active));
      })
      // Sin la lista todavía se puede generar para todo el grupo.
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (guardando) return;

    const amountCents = pesosACentavos(monto);

    if (amountCents === null) {
      setError("Escribe un monto válido, por ejemplo 700 o 700.50.");
      return;
    }

    setGuardando(true);
    setError("");
    setResultado("");

    try {
      const res = await generateMonthlyPayments({
        year: anio,
        month: mes,
        amountCents,
        studentIds: alumno === "TODOS" ? undefined : [Number(alumno)],
        note: nota,
      });

      setResultado(
        `Se generaron ${res.creadas}. ${res.yaExistian} ya la tenían.`
      );
      onGenerado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible generar las mensualidades."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-neutral-900">
        Generar mensualidades
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        A quien ya tenga la mensualidad de ese mes no se le crea otra.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label htmlFor="gm-mes" className={ETIQUETA}>
            Mes
          </label>
          <select
            id="gm-mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className={`${CAMPO} cursor-pointer capitalize`}
          >
            {MONTH_NAMES.map((nombre, i) => (
              <option key={nombre} value={i + 1}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gm-anio" className={ETIQUETA}>
            Año
          </label>
          <input
            id="gm-anio"
            type="number"
            min={ahora.getFullYear() - 5}
            max={ahora.getFullYear() + 1}
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="gm-monto" className={ETIQUETA}>
            Monto en pesos
          </label>
          <input
            id="gm-monto"
            type="text"
            inputMode="decimal"
            required
            placeholder="700.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="gm-alumno" className={ETIQUETA}>
            Para
          </label>
          <select
            id="gm-alumno"
            value={alumno}
            onChange={(e) => setAlumno(e.target.value)}
            className={`${CAMPO} cursor-pointer`}
          >
            <option value="TODOS">Todos los alumnos activos</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="gm-nota" className={ETIQUETA}>
            Nota (opcional)
          </label>
          <input
            id="gm-nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
          {resultado && (
            <p className="text-sm font-medium text-emerald-800" role="status">
              {resultado}
            </p>
          )}
          {error && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Generando…" : "Generar"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default GenerarMensualidades;
