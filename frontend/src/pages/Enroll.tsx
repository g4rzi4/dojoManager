import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircleCheck, GraduationCap, Plus, Trash2, TriangleAlert } from "lucide-react";

import Card from "../components/Card";
import {
  ApiError,
  getPublicInvitation,
  submitEnrollment,
} from "../services/api";
import type {
  ChildPayload,
  PublicInvitation,
} from "../types/invitation";

/**
 * Formulario público de inscripción.
 *
 * Es la ÚNICA pantalla de la app que se abre sin sesión, aparte del login.
 * La abre una familia desde un QR o un enlace de WhatsApp, probablemente
 * desde el celular, así que:
 *
 *  - No usa DashboardLayout: quien entra no tiene sesión ni menús
 *  - No pide nada que el dojo ya sepa
 *  - Explica con claridad qué pasó si el enlace no sirve, para que la
 *    persona sepa que tiene que pedir otro
 */

type Estado =
  | { status: "cargando" }
  | { status: "invalida"; message: string }
  | { status: "lista"; invitation: PublicInvitation }
  | { status: "enviada"; message: string };

const MIN_PASSWORD = 8;

function Enroll() {
  const { token } = useParams<{ token: string }>();

  const [estado, setEstado] = useState<Estado>({ status: "cargando" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Datos comunes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Alumno
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  // Tutor
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<"MADRE" | "PADRE" | "TUTOR">(
    "MADRE"
  );
  const [children, setChildren] = useState<ChildPayload[]>([
    { firstName: "", lastName: "" },
  ]);

  useEffect(() => {
    // La ausencia del token se resuelve en el render, no aquí: llamar a
    // setState en el cuerpo del efecto provoca renders en cascada.
    if (!token) return;

    let activo = true;

    getPublicInvitation(token)
      .then((invitation) => {
        if (activo) setEstado({ status: "lista", invitation });
      })
      .catch((e: unknown) => {
        if (activo) {
          setEstado({
            status: "invalida",
            message:
              e instanceof ApiError
                ? e.message
                : "No fue posible abrir el enlace de inscripción.",
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [token]);

  /** Sin token en la URL el enlace está roto, sin necesidad de preguntar. */
  const estadoFinal: Estado = token
    ? estado
    : {
        status: "invalida",
        message: "El enlace está incompleto. Pide que te lo manden de nuevo.",
      };

  function actualizarHijo(i: number, campo: keyof ChildPayload, valor: string) {
    setChildren((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, [campo]: valor } : h))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (estado.status !== "lista" || !token || enviando) return;

    setError("");

    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }

    setEnviando(true);

    try {
      // `estado` y no `estadoFinal`: el guard de arriba ya estrechó el tipo
      // a "lista", así que aquí TypeScript sabe que invitation existe.
      const payload =
        estado.invitation.kind === "ALUMNO"
          ? {
              email,
              password,
              firstName,
              lastName,
              birthDate: birthDate || undefined,
              phone: phone.trim() || undefined,
              guardianName: guardianName.trim() || undefined,
              guardianPhone: guardianPhone.trim() || undefined,
              medicalNotes: medicalNotes.trim() || undefined,
            }
          : {
              email,
              password,
              name,
              phone: phone.trim() || undefined,
              relationship,
              children: children
                // Descarta las filas que quedaron vacías
                .filter(
                  (h) =>
                    h.firstName.trim().length > 0 &&
                    h.lastName.trim().length > 0
                )
                .map((h) => ({
                  firstName: h.firstName.trim(),
                  lastName: h.lastName.trim(),
                  birthDate: h.birthDate || undefined,
                  medicalNotes: h.medicalNotes?.trim() || undefined,
                })),
            };

      const res = await submitEnrollment(token, payload);

      setEstado({ status: "enviada", message: res.message });
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible enviar el formulario."
      );
    } finally {
      setEnviando(false);
    }
  }

  const inputClase = `
    w-full rounded-xl border border-slate-300 bg-white px-4 py-3
    outline-none transition-all
    focus:border-blue-600 focus:ring-4 focus:ring-blue-100
  `;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-slate-900">DojoManager</p>
            <p className="text-xs text-slate-600">Inscripción</p>
          </div>
        </div>

        <div className="mt-6">
          {estadoFinal.status === "cargando" && (
            <Card className="h-64 animate-pulse motion-reduce:animate-none" />
          )}

          {estadoFinal.status === "invalida" && (
            <Card className="p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <TriangleAlert size={26} aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-xl font-bold text-slate-900">
                Este enlace no se puede usar
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                {estadoFinal.message}
              </p>
            </Card>
          )}

          {estadoFinal.status === "enviada" && (
            <Card className="p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CircleCheck size={26} aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-xl font-bold text-slate-900">
                ¡Registro completo!
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                {estadoFinal.message}
              </p>
              <Link
                to="/"
                className="
                  mt-6 inline-block cursor-pointer rounded-xl bg-blue-600 px-5 py-3
                  font-semibold text-white transition-colors duration-200
                  motion-reduce:transition-none
                  hover:bg-blue-700
                  focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
                "
              >
                Iniciar sesión
              </Link>
            </Card>
          )}

          {estadoFinal.status === "lista" && (
            <Card className="p-5 sm:p-6">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {estadoFinal.invitation.kind === "ALUMNO"
                  ? "Completa tus datos"
                  : "Datos del tutor y de sus hijos"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Te invitó <strong>{estadoFinal.invitation.invitadoPor}</strong>.
                {estadoFinal.invitation.alumnoLigado &&
                  ` Quedarás ligado al expediente de ${estadoFinal.invitation.alumnoLigado}.`}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                {/* --- Caso ALUMNO --- */}
                {estadoFinal.invitation.kind === "ALUMNO" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="e-nombre"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Nombre
                      </label>
                      <input
                        id="e-nombre"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-apellido"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Apellido
                      </label>
                      <input
                        id="e-apellido"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-nacimiento"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Fecha de nacimiento
                      </label>
                      <input
                        id="e-nacimiento"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-celular"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Celular
                      </label>
                      <input
                        id="e-celular"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="555 123 4567"
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-tutor"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Nombre de tu tutor{" "}
                        <span className="font-normal text-slate-500">
                          (si eres menor de edad)
                        </span>
                      </label>
                      <input
                        id="e-tutor"
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-tutor-tel"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Celular de tu tutor
                      </label>
                      <input
                        id="e-tutor-tel"
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label
                        htmlFor="e-medico"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Información médica{" "}
                        <span className="font-normal text-slate-500">
                          (opcional)
                        </span>
                      </label>
                      <textarea
                        id="e-medico"
                        rows={2}
                        value={medicalNotes}
                        onChange={(e) => setMedicalNotes(e.target.value)}
                        placeholder="Alergias, lesiones o padecimientos que el profesor deba conocer."
                        className={inputClase}
                      />
                    </div>
                  </div>
                )}

                {/* --- Caso TUTOR --- */}
                {estadoFinal.invitation.kind === "TUTOR" && (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <label
                          htmlFor="e-tu-nombre"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Tu nombre completo
                        </label>
                        <input
                          id="e-tu-nombre"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={inputClase}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="e-parentesco"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Parentesco
                        </label>
                        <select
                          id="e-parentesco"
                          value={relationship}
                          onChange={(e) =>
                            setRelationship(
                              e.target.value as "MADRE" | "PADRE" | "TUTOR"
                            )
                          }
                          className={`${inputClase} cursor-pointer`}
                        >
                          <option value="MADRE">Madre</option>
                          <option value="PADRE">Padre</option>
                          <option value="TUTOR">Tutor o tutora</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="e-tu-celular"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Tu celular
                        </label>
                        <input
                          id="e-tu-celular"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="555 123 4567"
                          className={inputClase}
                        />
                      </div>
                    </div>

                    {/* Hijos */}
                    <fieldset className="border-t border-slate-200 pt-5">
                      <legend className="text-sm font-semibold text-slate-900">
                        Tus hijos en el dojo
                      </legend>

                      <div className="mt-4 space-y-4">
                        {children.map((hijo, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-900">
                                Hijo o hija {i + 1}
                              </p>

                              {children.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setChildren((prev) =>
                                      prev.filter((_, idx) => idx !== i)
                                    )
                                  }
                                  aria-label={`Quitar al hijo ${i + 1}`}
                                  className="
                                    flex h-11 w-11 cursor-pointer items-center
                                    justify-center rounded-lg text-slate-500
                                    transition-colors duration-200
                                    motion-reduce:transition-none
                                    hover:bg-red-50 hover:text-red-700
                                    focus:ring-2 focus:ring-blue-600 focus:outline-none
                                  "
                                >
                                  <Trash2 size={17} aria-hidden="true" />
                                </button>
                              )}
                            </div>

                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label
                                  htmlFor={`h-nombre-${i}`}
                                  className="block text-sm font-medium text-slate-700"
                                >
                                  Nombre
                                </label>
                                <input
                                  id={`h-nombre-${i}`}
                                  type="text"
                                  required
                                  value={hijo.firstName}
                                  onChange={(e) =>
                                    actualizarHijo(i, "firstName", e.target.value)
                                  }
                                  className={inputClase}
                                />
                              </div>

                              <div className="space-y-2">
                                <label
                                  htmlFor={`h-apellido-${i}`}
                                  className="block text-sm font-medium text-slate-700"
                                >
                                  Apellido
                                </label>
                                <input
                                  id={`h-apellido-${i}`}
                                  type="text"
                                  required
                                  value={hijo.lastName}
                                  onChange={(e) =>
                                    actualizarHijo(i, "lastName", e.target.value)
                                  }
                                  className={inputClase}
                                />
                              </div>

                              <div className="space-y-2">
                                <label
                                  htmlFor={`h-nacimiento-${i}`}
                                  className="block text-sm font-medium text-slate-700"
                                >
                                  Fecha de nacimiento
                                </label>
                                <input
                                  id={`h-nacimiento-${i}`}
                                  type="date"
                                  value={hijo.birthDate ?? ""}
                                  onChange={(e) =>
                                    actualizarHijo(i, "birthDate", e.target.value)
                                  }
                                  className={inputClase}
                                />
                              </div>

                              <div className="space-y-2">
                                <label
                                  htmlFor={`h-medico-${i}`}
                                  className="block text-sm font-medium text-slate-700"
                                >
                                  Información médica
                                </label>
                                <input
                                  id={`h-medico-${i}`}
                                  type="text"
                                  value={hijo.medicalNotes ?? ""}
                                  onChange={(e) =>
                                    actualizarHijo(i, "medicalNotes", e.target.value)
                                  }
                                  placeholder="Alergias, lesiones"
                                  className={inputClase}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {children.length < 10 && (
                        <button
                          type="button"
                          onClick={() =>
                            setChildren((prev) => [
                              ...prev,
                              { firstName: "", lastName: "" },
                            ])
                          }
                          className="
                            mt-4 flex cursor-pointer items-center gap-2 rounded-xl
                            border border-slate-300 bg-white px-4 py-2.5 text-sm
                            font-semibold text-slate-700
                            transition-colors duration-200
                            motion-reduce:transition-none
                            hover:bg-slate-50
                            focus:ring-2 focus:ring-blue-600 focus:outline-none
                          "
                        >
                          <Plus size={16} aria-hidden="true" />
                          Agregar otro hijo
                        </button>
                      )}
                    </fieldset>
                  </>
                )}

                {/* Acceso */}
                <fieldset className="border-t border-slate-200 pt-5">
                  <legend className="text-sm font-semibold text-slate-900">
                    Tu acceso al sistema
                  </legend>
                  <p className="mt-1 text-sm text-slate-600">
                    Con esto podrás entrar a consultar{" "}
                    {estadoFinal.invitation.kind === "ALUMNO"
                      ? "tu expediente"
                      : "el expediente de tus hijos"}
                    .
                  </p>

                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="e-correo"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Correo electrónico
                      </label>
                      <input
                        id="e-correo"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="e-password"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Contraseña
                      </label>
                      <input
                        id="e-password"
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-describedby="e-password-ayuda"
                        className={inputClase}
                      />
                      <p id="e-password-ayuda" className="text-xs text-slate-500">
                        Al menos {MIN_PASSWORD} caracteres.
                      </p>
                    </div>
                  </div>
                </fieldset>

                {error && (
                  <p
                    className="text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="
                    w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3
                    font-semibold text-white transition-colors duration-200
                    motion-reduce:transition-none
                    hover:bg-blue-700
                    focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  {enviando ? "Enviando..." : "Completar inscripción"}
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Enroll;
