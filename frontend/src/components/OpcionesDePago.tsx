import { useState } from "react";

import PagarConPayPal from "./PagarConPayPal";
import { ApiError, reportCharge } from "../services/api";
import type { ChargeType } from "../types/payment";
import { t } from "../i18n";

type Props = {
  tipo: ChargeType;
  id: number;
  onCambio: () => void | Promise<void>;
};

const BOTON = `
  min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-4 py-2
  text-sm font-semibold whitespace-nowrap text-neutral-700
  transition-colors duration-200 motion-reduce:transition-none hover:bg-neutral-50
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;

/**
 * Cómo pagar un cobro: PayPal al momento, o avisar que se pagó en efectivo o
 * por transferencia. Lo segundo no lo marca como pagado: queda por confirmar
 * hasta que el admin o el profesor reciban el dinero.
 */
function OpcionesDePago({ tipo, id, onCambio }: Props) {
  const [eligiendo, setEligiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function reportar(method: "EFECTIVO" | "TRANSFERENCIA") {
    setEnviando(true);
    setError("");

    try {
      await reportCharge(tipo, id, method);
      await onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible avisar del pago.")
      );
    } finally {
      setEnviando(false);
    }
  }

  if (eligiendo) {
    return (
      <div className="max-w-xs">
        <p className="text-xs text-neutral-600">
          {t("Quedará pagado cuando tu profesor confirme que lo recibió.")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={() => reportar("EFECTIVO")}
            className={BOTON}
          >
            {t("Efectivo")}
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => reportar("TRANSFERENCIA")}
            className={BOTON}
          >
            {t("Transferencia")}
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => setEligiendo(false)}
            className={`${BOTON} border-transparent bg-transparent`}
          >
            {t("Cancelar")}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      <PagarConPayPal tipo={tipo} id={id} onPagado={onCambio} />
      <button
        type="button"
        onClick={() => setEligiendo(true)}
        className={BOTON}
      >
        {t("Efectivo o transferencia")}
      </button>
    </div>
  );
}

export default OpcionesDePago;
