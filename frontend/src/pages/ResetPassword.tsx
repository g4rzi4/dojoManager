import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import BrandMark from "../components/BrandMark";
import Button from "../components/Button";
import Input from "../components/Input";
import { ApiError, checkResetToken, resetPassword } from "../services/api";
import { t } from "../i18n";

const MIN_PASSWORD = 8;

const ENLACE_INVALIDO =
  "Este enlace ya no es válido. Puede haber caducado o ya se usó.";

/**
 * Pública: la abre quien recibió el enlace, sin sesión. El token de la URL es
 * lo único que la autoriza, y el backend lo valida.
 */
function ResetPassword() {
  const { token = "" } = useParams<{ token: string }>();

  const [vigente, setVigente] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    checkResetToken(token)
      .then((valido) => {
        if (activo) setVigente(valido);
      })
      .catch(() => {
        if (activo) setVigente(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (guardando) return;

    if (password.length < MIN_PASSWORD) {
      setError(
        t("La contraseña debe tener al menos {n} caracteres.", {
          n: MIN_PASSWORD,
        })
      );
      return;
    }

    if (password !== confirmacion) {
      setError(t("Las contraseñas no coinciden."));
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await resetPassword(token, password);
      setListo(true);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible conectar con el servidor.")
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md p-6 sm:p-10">
        <BrandMark className="h-11 w-11" />

        <h1 className="mt-5 text-3xl font-bold text-neutral-800">
          {t("Elige una nueva contraseña")}
        </h1>

        {vigente === null && (
          <p className="mt-3 text-neutral-600" role="status">
            {t("Revisando el enlace…")}
          </p>
        )}

        {vigente === false && (
          <>
            <p className="mt-3 text-neutral-700" role="alert">
              {t(ENLACE_INVALIDO)}
            </p>
            <Link
              to="/recuperar"
              className="mt-6 inline-block rounded-xl py-1 text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
            >
              {t("Solicitar un enlace nuevo")}
            </Link>
          </>
        )}

        {vigente && listo && (
          <>
            <p className="mt-3 text-neutral-700" role="status">
              {t("Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.")}
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-xl py-1 text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
            >
              {t("Ir a iniciar sesión")}
            </Link>
          </>
        )}

        {vigente && !listo && (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <Input
              label={t("Nueva contraseña (mínimo {n} caracteres)", {
                n: MIN_PASSWORD,
              })}
              type="password"
              name="new-password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label={t("Confírmala")}
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />

            {error && (
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={guardando}>
              {guardando ? t("Guardando…") : t("Guardar contraseña")}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
