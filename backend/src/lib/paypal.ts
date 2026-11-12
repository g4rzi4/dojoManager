import { config } from "../config";

/**
 * Cliente mínimo de la API REST de PayPal (Orders v2 y webhooks).
 *
 * Usa fetch directo: solo necesitamos cuatro llamadas. El secreto y el token
 * viven únicamente aquí, y nunca se escriben en logs.
 */

export class PayPalError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Nombre del problema según PayPal, p. ej. INSTRUMENT_DECLINED. */
    public readonly issue?: string
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export function paypalConfigured(): boolean {
  return Boolean(config.paypal.clientId && config.paypal.clientSecret);
}

let tokenEnCache: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenEnCache && tokenEnCache.expiresAt > Date.now()) {
    return tokenEnCache.value;
  }

  const credenciales = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`
  ).toString("base64");

  const response = await fetch(`${config.paypal.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credenciales}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new PayPalError("PayPal rechazó las credenciales.", response.status);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Un minuto de margen, para no usar un token a punto de vencer.
  tokenEnCache = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

async function llamar<T>(
  path: string,
  body: string,
  requestId?: string,
  encabezadosExtra: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(`${config.paypal.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      ...encabezadosExtra,
    },
    body,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      name?: string;
      details?: { issue?: string }[];
    } | null;

    throw new PayPalError(
      `PayPal respondió ${response.status} en ${path}.`,
      response.status,
      error?.details?.[0]?.issue ?? error?.name
    );
  }

  return (await response.json()) as T;
}

/** 70000 -> "700.00". Con enteros, para no arrastrar errores de float. */
export function centsToPayPalValue(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** "700.00" -> 70000. */
export function payPalValueToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

export async function createOrder(params: {
  referenceId: string;
  description: string;
  amountCents: number;
}): Promise<string> {
  const order = await llamar<{ id: string }>(
    "/v2/checkout/orders",
    JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.referenceId,
          custom_id: params.referenceId,
          description: params.description.slice(0, 127),
          amount: {
            currency_code: config.paypal.currency,
            value: centsToPayPalValue(params.amountCents),
          },
        },
      ],
    })
  );

  return order.id;
}

const capturasRechazadas = new Map<string, number>();

/**
 * Respuesta simulada del sandbox de PayPal ("negative testing"): la captura
 * falla con INSTRUMENT_DECLINED, igual que con una tarjeta declinada. Solo se
 * manda con PAYPAL_SIMULAR_RECHAZO="1" (ver config.paypal.simularRechazo).
 */
const RECHAZO_SIMULADO = {
  "PayPal-Mock-Response": JSON.stringify({
    mock_application_codes: "INSTRUMENT_DECLINED",
  }),
};

if (config.paypal.simularRechazo) {
  console.warn(
    "[paypal] PAYPAL_SIMULAR_RECHAZO activo: toda captura se rechazará como tarjeta declinada."
  );
}

export type CapturedOrder = {
  status: string;
  amountCents: number;
  currency: string;
};

/**
 * Captura una orden ya aprobada por el comprador.
 *
 * El PayPal-Request-Id hace la operación idempotente: repetirla (doble clic,
 * reintento de red) devuelve la misma captura en lugar de cobrar otra vez.
 * Cambia tras un rechazo, para que un reintento con otra tarjeta sea una
 * operación nueva y no la repetición del rechazo.
 */
export async function captureOrder(orderId: string): Promise<CapturedOrder> {
  const order = await llamar<{
    purchase_units: {
      payments: {
        captures: {
          status: string;
          amount: { currency_code: string; value: string };
        }[];
      };
    }[];
  }>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    "{}",
    `capture-${orderId}-${capturasRechazadas.get(orderId) ?? 0}`,
    config.paypal.simularRechazo ? RECHAZO_SIMULADO : {}
  ).catch((error: unknown) => {
    if (error instanceof PayPalError) {
      capturasRechazadas.set(
        orderId,
        (capturasRechazadas.get(orderId) ?? 0) + 1
      );
    }

    throw error;
  });

  const capture = order.purchase_units[0].payments.captures[0];

  return {
    status: capture.status,
    amountCents: payPalValueToCents(capture.amount.value),
    currency: capture.amount.currency_code,
  };
}

/**
 * Confirma con PayPal que un webhook es auténtico.
 *
 * Se envía el cuerpo CRUDO: volver a serializar el JSON puede cambiar el
 * contenido y hacer que la firma no coincida.
 */
export async function verifyWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string
): Promise<boolean> {
  const campo = (nombre: string) => JSON.stringify(String(headers[nombre] ?? ""));

  const body = `{"auth_algo":${campo("paypal-auth-algo")},"cert_url":${campo(
    "paypal-cert-url"
  )},"transmission_id":${campo(
    "paypal-transmission-id"
  )},"transmission_sig":${campo(
    "paypal-transmission-sig"
  )},"transmission_time":${campo(
    "paypal-transmission-time"
  )},"webhook_id":${JSON.stringify(
    config.paypal.webhookId
  )},"webhook_event":${rawBody}}`;

  try {
    const result = await llamar<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      body
    );

    return result.verification_status === "SUCCESS";
  } catch (error) {
    // Un evento sin firma o con encabezados inválidos hace que PayPal responda
    // 400/422 a la verificación: no es auténtico, se rechaza. Cualquier otro
    // error (red, 5xx) sí se propaga, para responder 500 y que PayPal
    // reintente el evento.
    if (
      error instanceof PayPalError &&
      (error.status === 400 || error.status === 422)
    ) {
      return false;
    }

    throw error;
  }
}
