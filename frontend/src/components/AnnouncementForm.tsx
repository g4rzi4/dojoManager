import { useState } from "react";

import Card from "./Card";
import { ApiError, sendAnnouncement } from "../services/api";
import { AUDIENCES, type Audience } from "../types/notification";

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
        `Aviso enviado a ${res.enviadas} ${
          res.enviadas === 1 ? "persona" : "personas"
        }.`
      );
      setTitle("");
      setBody("");

      await onEnviado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No fue posible enviar el aviso."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-neutral-900">Nuevo aviso del dojo</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Llega como notificación a cada persona del grupo que elijas.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="aviso-titulo"
            className="block text-sm font-medium text-neutral-700"
          >
            Título
          </label>
          <input
            id="aviso-titulo"
            type="text"
            value={title}
            maxLength={MAX_TITULO}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Suspensión de clases el sábado"
            className="
              w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
              outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          />
          <p className="text-xs text-neutral-500">
            {title.length} de {MAX_TITULO} caracteres
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="aviso-mensaje"
            className="block text-sm font-medium text-neutral-700"
          >
            Mensaje
          </label>
          <textarea
            id="aviso-mensaje"
            value={body}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Explica el motivo y, si aplica, cuándo se repone la clase."
            className="
              w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
              outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="aviso-destinatarios"
            className="block text-sm font-medium text-neutral-700"
          >
            Destinatarios
          </label>
          <select
            id="aviso-destinatarios"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="
              w-full cursor-pointer rounded-2xl border border-neutral-300 bg-white
              px-4 py-3 outline-none transition-[border-color,box-shadow,background-color]
              focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
            "
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
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
            {enviando ? "Enviando…" : "Enviar aviso"}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-2xl border border-neutral-300 bg-white px-5 py-3
              font-semibold text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}

export default AnnouncementForm;
