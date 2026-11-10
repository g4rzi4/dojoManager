import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import BrandMark from "../components/BrandMark";
import Button from "../components/Button";
import Input from "../components/Input";
import { ApiError, forgotPassword } from "../services/api";
import { t } from "../i18n";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (enviando) return;

    setEnviando(true);
    setError("");

    try {
      const res = await forgotPassword(email);
      setMensaje(t(res.message));
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible conectar con el servidor.")
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md p-6 sm:p-10">
        <BrandMark className="h-11 w-11" />

        <h1 className="mt-5 text-3xl font-bold text-neutral-800">
          {t("Recupera tu contraseña")}
        </h1>

        {mensaje ? (
          <div role="status">
            <p className="mt-3 text-neutral-700">{mensaje}</p>
            <p className="mt-3 text-sm text-neutral-600">
              {t(
                "¿No te llegó? Revisa tu correo no deseado o pídele a tu profesor un enlace para restablecerla."
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-neutral-600">
              {t(
                "Escribe tu correo y te enviaremos un enlace para elegir una nueva."
              )}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <Input
                label={t("Correo electrónico")}
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {error && (
                <p className="text-sm font-medium text-red-700" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={enviando}>
                {enviando ? t("Enviando…") : t("Enviar enlace")}
              </Button>
            </form>
          </>
        )}

        <Link
          to="/"
          className="mt-6 inline-block rounded-xl py-1 text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
        >
          {t("Volver a iniciar sesión")}
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
