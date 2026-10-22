import { useState } from "react";
import { KeyRound } from "lucide-react";

import Card from "./Card";
import { ApiError, createTeacher } from "../services/api";

type Props = {
  onCreado: () => void | Promise<void>;
  onCancelar: () => void;
};

const MIN_PASSWORD = 8;

/**
 * Registro de un profesor. Solo lo usa el administrador.
 *
 * Al guardar, el backend genera la clave única y la devolvemos en pantalla:
 * el admin tiene que pasársela al profesor, porque es lo que se escribe para
 * asignarle alumnos.
 */
function TeacherForm({ onCreado, onCancelar }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [claveCreada, setClaveCreada] = useState<string | null>(null);

  const valido =
    name.trim().length > 0 &&
    email.includes("@") &&
    password.length >= MIN_PASSWORD;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      const res = await createTeacher({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setClaveCreada(res.teacher.teacherCode ?? null);
      setName("");
      setEmail("");
      setPassword("");

      await onCreado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible registrar al profesor."
      );
    } finally {
      setGuardando(false);
    }
  }

  // Tras crear, mostramos la clave en lugar del formulario: es el dato que
  // el admin necesita apuntar antes de cerrar.
  if (claveCreada) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Profesor registrado</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pásale esta clave. La necesita para que sus alumnos queden en su
              grupo.
            </p>
            <p className="mt-4 inline-block rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-lg font-bold text-slate-900">
              {claveCreada}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setClaveCreada(null);
            onCancelar();
          }}
          className="
            mt-5 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3
            font-semibold text-slate-700 transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-slate-50
            focus:ring-2 focus:ring-blue-600 focus:outline-none
          "
        >
          Listo
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-slate-900">Registrar un profesor</h2>
      <p className="mt-1 text-sm text-slate-600">
        El sistema le genera su clave única al guardar.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="prof-nombre"
            className="block text-sm font-medium text-slate-700"
          >
            Nombre completo
          </label>
          <input
            id="prof-nombre"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sensei Ramírez"
            className="
              w-full rounded-xl border border-slate-300 bg-white px-4 py-3
              outline-none transition-all
              focus:border-blue-600 focus:ring-4 focus:ring-blue-100
            "
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="prof-correo"
            className="block text-sm font-medium text-slate-700"
          >
            Correo electrónico
          </label>
          <input
            id="prof-correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="profesor@dojo.com"
            className="
              w-full rounded-xl border border-slate-300 bg-white px-4 py-3
              outline-none transition-all
              focus:border-blue-600 focus:ring-4 focus:ring-blue-100
            "
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="prof-password"
            className="block text-sm font-medium text-slate-700"
          >
            Contraseña provisional
          </label>
          <input
            id="prof-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Al menos 8 caracteres"
            aria-describedby="prof-password-ayuda"
            className="
              w-full rounded-xl border border-slate-300 bg-white px-4 py-3
              outline-none transition-all
              focus:border-blue-600 focus:ring-4 focus:ring-blue-100
            "
          />
          <p id="prof-password-ayuda" className="text-xs text-slate-500">
            Mínimo {MIN_PASSWORD} caracteres. Pídele que la cambie al entrar.
          </p>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!valido || guardando}
            className="
              cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {guardando ? "Registrando..." : "Registrar profesor"}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3
              font-semibold text-slate-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-slate-50
              focus:ring-2 focus:ring-blue-600 focus:outline-none
            "
          >
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}

export default TeacherForm;
