import { useState } from "react";

import {
  ApiError,
  deleteMonthlyPayment,
  payMonthlyPayment,
  updateMonthlyPayment,
} from "../services/api";
import { pesosACentavos } from "../utils/format";

const SECUNDARIO =
  "min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold whitespace-nowrap text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARIO =
  "min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  id: number;
  amountCents: number;
  /** Para los lectores de pantalla: "octubre 2026 de Ana López". */
  descripcion: string;
  onCambio: () => void;
};

/** Lo que el dojo puede hacer con una mensualidad que sigue pendiente. */
function AccionesMensualidad({ id, amountCents, descripcion, onCambio }: Props) {
  const [modo, setModo] = useState<"inicio" | "pagar" | "editar">("inicio");
  const [monto, setMonto] = useState((amountCents / 100).toFixed(2));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function ejecutar(accion: () => Promise<unknown>) {
    setGuardando(true);
    setError("");

    try {
      await accion();
      // La fila sigue montada si la mensualidad continúa pendiente.
      setModo("inicio");
      onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No fue posible guardar el cambio."
      );
    } finally {
      setGuardando(false);
    }
  }

  function guardarMonto() {
    const centavos = pesosACentavos(monto);

    if (centavos === null) {
      setError("Escribe un monto válido.");
      return;
    }

    void ejecutar(() => updateMonthlyPayment(id, { amountCents: centavos }));
  }

  function eliminar() {
    if (window.confirm(`¿Eliminar la mensualidad de ${descripcion}?`)) {
      void ejecutar(() => deleteMonthlyPayment(id));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        {modo === "inicio" && (
          <>
            <button
              type="button"
              className={PRIMARIO}
              aria-label={`Registrar pago de ${descripcion}`}
              onClick={() => setModo("pagar")}
            >
              Registrar pago
            </button>
            <button
              type="button"
              className={SECUNDARIO}
              aria-label={`Editar monto de ${descripcion}`}
              onClick={() => setModo("editar")}
            >
              Editar
            </button>
            <button
              type="button"
              className={SECUNDARIO}
              disabled={guardando}
              aria-label={`Eliminar mensualidad de ${descripcion}`}
              onClick={eliminar}
            >
              Eliminar
            </button>
          </>
        )}

        {modo === "pagar" && (
          <>
            <button
              type="button"
              className={PRIMARIO}
              disabled={guardando}
              onClick={() => ejecutar(() => payMonthlyPayment(id, "EFECTIVO"))}
            >
              Efectivo
            </button>
            <button
              type="button"
              className={PRIMARIO}
              disabled={guardando}
              onClick={() =>
                ejecutar(() => payMonthlyPayment(id, "TRANSFERENCIA"))
              }
            >
              Transferencia
            </button>
            <button
              type="button"
              className={SECUNDARIO}
              onClick={() => setModo("inicio")}
            >
              Cancelar
            </button>
          </>
        )}

        {modo === "editar" && (
          <>
            <input
              type="text"
              inputMode="decimal"
              aria-label={`Nuevo monto de ${descripcion}`}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="min-h-11 w-28 rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
            />
            <button
              type="button"
              className={PRIMARIO}
              disabled={guardando}
              onClick={guardarMonto}
            >
              Guardar
            </button>
            <button
              type="button"
              className={SECUNDARIO}
              onClick={() => setModo("inicio")}
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-1 text-right text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AccionesMensualidad;
