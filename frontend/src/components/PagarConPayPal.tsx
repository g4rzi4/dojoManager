import { useEffect, useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

import {
  ApiError,
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalConfig,
} from "../services/api";
import { getLocale, t } from "../i18n";

let configPendiente: ReturnType<typeof getPayPalConfig> | null = null;

/** Una sola consulta aunque haya un botón por cada mensualidad. */
function cargarConfig() {
  configPendiente ??= getPayPalConfig().catch((e: unknown) => {
    configPendiente = null;
    throw e;
  });

  return configPendiente;
}

/** Lo que se ve mientras llega el SDK, para que la fila no quede vacía. */
function EstadoScript() {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <p className="text-xs font-medium text-red-700" role="alert">
        {t("No se pudo cargar PayPal. Recarga la página e inténtalo de nuevo.")}
      </p>
    );
  }

  return isPending ? (
    <p className="py-2 text-sm text-neutral-600" role="status">
      {t("Cargando PayPal…")}
    </p>
  ) : null;
}

type Props = {
  tipo: "MENSUALIDAD" | "EVENTO" | "EQUIPO";
  id: number;
  onPagado: () => void | Promise<void>;
};

/**
 * Botón para pagar un cobro con PayPal.
 *
 * Solo dice QUÉ cobro se paga. El monto lo pone el backend desde la base de
 * datos, y la captura también ocurre allá: el navegador no decide nada.
 */
function PagarConPayPal({ tipo, id, onPagado }: Props) {
  const [paypal, setPaypal] = useState<{
    clientId: string;
    currency: string;
  } | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    cargarConfig()
      .then((c) => {
        if (activo && c.enabled && c.clientId) {
          setPaypal({ clientId: c.clientId, currency: c.currency });
        }
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  if (!paypal) return null;

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="
          min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold
          whitespace-nowrap text-white transition-colors duration-200
          motion-reduce:transition-none
          hover:bg-violet-700
          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
        "
      >
        {t("Pagar con PayPal")}
      </button>
    );
  }

  return (
    <div className="w-56 max-w-full">
      <PayPalScriptProvider
        options={{
          clientId: paypal.clientId,
          currency: paypal.currency,
          intent: "capture",
          locale: getLocale().replace("-", "_"),
        }}
      >
        <EstadoScript />
        <PayPalButtons
          style={{ layout: "vertical", height: 40 }}
          createOrder={async () => {
            setError("");

            try {
              const { orderId } = await createPayPalOrder(tipo, id);
              return orderId;
            } catch (e: unknown) {
              setError(
                e instanceof ApiError
                  ? e.message
                  : t("No fue posible iniciar el pago.")
              );
              throw e;
            }
          }}
          onApprove={async (data, actions) => {
            try {
              await capturePayPalOrder(data.orderID);
              await onPagado();
            } catch (e: unknown) {
              // Tarjeta rechazada: PayPal deja elegir otro método sin empezar
              // de nuevo.
              if (e instanceof ApiError && e.status === 402) {
                setError(e.message);
                return actions.restart();
              }

              setError(
                e instanceof ApiError
                  ? e.message
                  : t(
                      "No pudimos confirmar tu pago. Revisa tu historial antes de intentar otra vez."
                    )
              );
            }
          }}
          onError={() =>
            setError((actual) => actual || t("PayPal no pudo procesar el pago."))
          }
        />
      </PayPalScriptProvider>

      {error && (
        <p className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default PagarConPayPal;
