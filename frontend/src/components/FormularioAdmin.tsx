import { useState, type FormEvent } from "react";

import Button from "./Button";
import Input from "./Input";
import { t } from "../i18n";
import { ApiError, type NewAdmin } from "../services/api";

type FormProps = {
  /** Si es true, también pide el nombre del dojo nuevo. */
  conDojo: boolean;
  textoBoton: string;
  onSubmit: (admin: NewAdmin, dojoName: string) => Promise<void>;
  /** Sin esto, el formulario no ofrece cancelar. */
  onCancel?: () => void;
};

function FormularioAdmin({ conDojo, textoBoton, onSubmit, onCancel }: FormProps) {
  const [dojoName, setDojoName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (enviando) return;

    setEnviando(true);
    setError("");

    try {
      await onSubmit({ adminName, adminEmail, adminPassword }, dojoName);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible conectar con el servidor.")
      );
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {conDojo && (
        <Input
          label={t("Nombre del dojo")}
          name="dojoName"
          autoComplete="off"
          required
          maxLength={80}
          value={dojoName}
          onChange={(e) => setDojoName(e.target.value)}
        />
      )}
      <Input
        label={t("Nombre del administrador")}
        name="adminName"
        autoComplete="off"
        required
        maxLength={80}
        value={adminName}
        onChange={(e) => setAdminName(e.target.value)}
      />
      <Input
        label={t("Correo electrónico")}
        type="email"
        name="adminEmail"
        autoComplete="off"
        spellCheck={false}
        required
        value={adminEmail}
        onChange={(e) => setAdminEmail(e.target.value)}
      />
      <Input
        label={t("Contraseña inicial (mínimo 8 caracteres)")}
        type="password"
        name="adminPassword"
        autoComplete="new-password"
        required
        minLength={8}
        value={adminPassword}
        onChange={(e) => setAdminPassword(e.target.value)}
      />

      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" disabled={enviando} className="sm:flex-1">
          {enviando ? t("Guardando…") : textoBoton}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-6 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-200 motion-reduce:transition-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
          >
            {t("Cancelar")}
          </button>
        )}
      </div>
    </form>
  );
}

export default FormularioAdmin;
