import { useEffect, useState } from "react";

import Card from "./Card";
import { ApiError, draftAnnouncement, getSenseiStatus, sendAnnouncement } from "../services/api";
import { AUDIENCES, type Audience } from "../types/notification";
import { t } from "../i18n";

type Props = {
  onEnviado: () => void | Promise<void>;
  onCancelar: () => void;
};

const MAX_TITULO = 120;

/** Formulario para que el dojo redacte un aviso y lo mande a varios roles. */
function AnnouncementForm({ onEnviado, onCancelar }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("alumnos-y-tutores");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [senseiActivo, setSenseiActivo] = useState(false);
  const [redactando, setRedactando] = useState(false);

  useEffect(() => {
    let activo = true;

    getSenseiStatus()
      .then((s) => {
        if (activo) setSenseiActivo(s.disponible);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  /** Sensei convierte la idea escrita en el mensaje en un aviso completo. */
  async function redactarConSensei() {
    setRedactando(true);
    setError("");

    try {
      const r = await draftAnnouncement(body.trim());
      setTitle(r.titulo.slice(0, MAX_TITULO));
      setBody(r.mensaje);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : t("Sensei no pudo redactar el aviso.")
      );
    } finally {
      setRedactando(false);
    }
  }

  const valido = title.trim().length > 0 && body.trim().length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!valido || enviando) return;

    setEnviando(true);
    setError("");
    setExito("");

    try {
      const res = await sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience,
      });

      setExito(
        res.enviadas === 1
          ? t("Aviso enviado a {n} persona.", { n: res.enviadas })
          : t("Aviso enviado a {n} personas.", { n: res.enviadas })
      );
      setTitle("");
      setBody("");

      await onEnviado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : t("No fue posible enviar el aviso.")
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-neutral-900">{t("Nuevo aviso del dojo")}</h2>
      <p className="mt-1 text-sm text-neutral-600">
        {t("Llega como notificación a cada persona del grupo que elijas.")}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="aviso-titulo"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Título")}
          </label>
          <input
            id="aviso-titulo"
            type="text"
            value={title}
            maxLength={MAX_TITULO}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Suspensión de clases el sábado")}
            className="
              w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
              outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          />
          <p className="text-xs text-neutral-500">
            {t("{n} de {max} caracteres", { n: title.length, max: MAX_TITULO })}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="aviso-mensaje"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Mensaje")}
          </label>
          <textarea
            id="aviso-mensaje"
            value={body}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("Explica el motivo y, si aplica, cuándo se repone la clase.")}
            className="
              w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
              outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          />

          {senseiActivo && (
            <button
              type="button"
              onClick={redactarConSensei}
              disabled={redactando || body.trim().length < 5}
              className="
                inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-cyan-200
                bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800
                transition-colors duration-200 motion-reduce:transition-none hover:bg-cyan-100
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {redactando ? t("Sensei está redactando…") : t("Redactar con Sensei")}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="aviso-destinatarios"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Destinatarios")}
          </label>
          <select
            id="aviso-destinatarios"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="
              w-full cursor-pointer rounded-2xl border border-neutral-300 bg-surface
              px-4 py-3 outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {t(a.label)}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        {exito && (
          <p className="text-sm font-medium text-emerald-700" role="status">
            {exito}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!valido || enviando}
            className="
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {enviando ? t("Enviando…") : t("Enviar aviso")}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-5 py-3
              font-semibold text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            {t("Cancelar")}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default AnnouncementForm;
