import { config } from "../config";

/**
 * Cliente mínimo de la API REST v2 de PayPal (Orders).
 *
 * No usamos SDK: son tres llamadas y el `fetch` de Node basta. El monto
 * SIEMPRE lo decide el backend a partir de la base de datos; el navegador
 * solo recibe el id de la orden.
 */

export class PayPalError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
  }
}

export function paypalConfigured(): boolean {
  return Boolean(config.paypal.clientId && config.paypal.clientSecret);
}

/** PayPal pide el monto como texto con dos decimales: 50000 -> "500.00". */
export function centsToValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, apiBase } = config.paypal;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new PayPalError(res.status, "No fue posible autenticarse con PayPal.");
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createPayPalOrder(input: {
  amountCents: number;
  /** Id de nuestro Payment; vuelve en la captura para verificarlo. */
  customId: string;
  description: string;
}): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${config.paypal.apiBase}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.customId,
          description: input.description,
          amount: {
            currency_code: config.paypal.currency,
            value: centsToValue(input.amountCents),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new PayPalError(res.status, "PayPal no pudo crear la orden.");
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export type PayPalCapture = {
  id: string;
  status: string;
  custom_id?: string;
  amount: { currency_code: string; value: string };
};

export async function capturePayPalOrder(
  orderId: string
): Promise<{ status: string; capture: PayPalCapture | undefined }> {
  const token = await getAccessToken();

  const res = await fetch(
    `${config.paypal.apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Idempotencia: si el usuario reintenta la misma orden, PayPal
        // devuelve la captura anterior en vez de cobrar otra vez.
        "PayPal-Request-Id": `capture-${orderId}`,
      },
    }
  );

  if (!res.ok) {
    throw new PayPalError(res.status, "PayPal no pudo capturar la orden.");
  }

  const data = (await res.json()) as {
    status: string;
    purchase_units?: { payments?: { captures?: PayPalCapture[] } }[];
  };

  return {
    status: data.status,
    capture: data.purchase_units?.[0]?.payments?.captures?.[0],
  };
}
