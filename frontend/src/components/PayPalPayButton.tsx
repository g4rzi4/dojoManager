import { useRef } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

import { ApiError, capturePayPalOrder, createPayPalOrder } from "../services/api";

type Props = {
  paymentId: number;
  onPaid: () => void;
  onError: (message: string) => void;
};

/**
 * Smart Payment Buttons de PayPal para UNA mensualidad.
 *
 * Tiene que vivir dentro de un PayPalScriptProvider. El botón no conoce el
 * monto: el backend lo toma de la base de datos al crear la orden.
 */
function PayPalPayButton({ paymentId, onPaid, onError }: Props) {
  // Si createOrder falla, PayPal dispara además su propio onError. Sin esta
  // marca, el mensaje genérico taparía el de nuestro backend.
  const errorReportado = useRef(false);

  return (
    <PayPalButtons
      style={{ layout: "horizontal", height: 35, tagline: false }}
      fundingSource="paypal"
      createOrder={async () => {
        errorReportado.current = false;
        try {
          return await createPayPalOrder(paymentId);
        } catch (e) {
          errorReportado.current = true;
          onError(
            e instanceof ApiError ? e.message : "No se pudo iniciar el pago."
          );
          throw e;
        }
      }}
      onApprove={async (data) => {
        try {
          await capturePayPalOrder(paymentId, data.orderID);
          onPaid();
        } catch (e) {
          onError(
            e instanceof ApiError
              ? e.message
              : "No se pudo confirmar el pago."
          );
        }
      }}
      onError={() => {
        if (!errorReportado.current) {
          onError("PayPal no pudo procesar el pago.");
        }
      }}
    />
  );
}

export default PayPalPayButton;
