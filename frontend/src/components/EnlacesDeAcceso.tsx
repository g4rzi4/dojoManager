import { useState } from "react";

import Card from "./Card";
import { ApiError } from "../services/api";
import { t } from "../i18n";

type Cuenta = {
  id: number;
  etiqueta: string;
  email: string;
};

type Props = {
  cuentas: Cuenta[];
  generar: (userId: number) => Promise<{ url: string }>;
  onCerrar: () => void;
};

/**
 * Genera el enlace para que alguien que olvidó su contraseña elija otra.
 *
 * Funciona sin servicio de correo: se comparte por WhatsApp, igual que un QR
 * de inscripción. Quien lo genera nunca ve ni escribe la contraseña.
 */
function EnlacesDeAcceso({ cuentas, generar, onCerrar }: Props) {
  const [enlaces, setEnlaces] = useState<Record<number, string>>({});
  const [copiado, setCopiado] = useState<number | null>(null);
  const [generando, setGenerando] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function crear(id: number) {
    setGenerando(id);
    setError("");

    try {
      const { url } = await generar(id);
      setEnlaces((e) => ({ ...e, [id]: url }));
      setCopiado(null);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible generar el enlace.")
      );
    } finally {
      setGenerando(null);
    }
  }

  async function copiar(id: number) {
    try {
      await navigator.clipboard.writeText(enlaces[id]);
      setCopiado(id);
    } catch {
      setError(
        t("No se pudo copiar. Selecciona el enlace y cópialo a mano.")
      );
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            {t("Restablecer contraseña")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            {t(
              "Comparte el enlace solo con esa persona. Caduca en 24 horas, funciona una vez y anula los enlaces anteriores."
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
        >
          {t("Cerrar")}
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {cuentas.map((c) => (
          <li key={c.id} className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold break-words text-neutral-900">
                  {c.etiqueta}
                </p>
                <p className="text-sm break-all text-neutral-600">{c.email}</p>
              </div>

              <button
                type="button"
                disabled={generando !== null}
                onClick={() => crear(c.id)}
                className="min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generando === c.id
                  ? t("Generando…")
                  : enlaces[c.id]
                    ? t("Generar otro")
                    : t("Generar enlace")}
              </button>
            </div>

            {enlaces[c.id] && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  readOnly
                  aria-label={t("Enlace para {nombre}", { nombre: c.etiqueta })}
                  value={enlaces[c.id]}
                  onFocus={(e) => e.target.select()}
                  className="min-h-11 min-w-0 flex-1 basis-60 rounded-2xl border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-800 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => copiar(c.id)}
                  className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
                >
                  {copiado === c.id ? t("Copiado") : t("Copiar")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

export default EnlacesDeAcceso;
