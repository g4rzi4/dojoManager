import { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

import {
  ApiError,
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalConfig,
} from "../services/api";

type Props = {
  tipo: "MENSUALIDAD" | "EVENTO";
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

    getPayPalConfig()
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
          cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold
          whitespace-nowrap text-white transition-colors duration-200
          motion-reduce:transition-none
          hover:bg-blue-700
          focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
        "
      >
        Pagar con PayPal
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
          locale: "es_MX",
        }}
      >
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
                  : "No fue posible iniciar el pago."
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
                  : "No pudimos confirmar tu pago. Revisa tu historial antes de intentar otra vez."
              );
            }
          }}
          onError={() =>
            setError((actual) => actual || "PayPal no pudo procesar el pago.")
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
