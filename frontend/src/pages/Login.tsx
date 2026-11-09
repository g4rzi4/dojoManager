import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import BrandMark from "../components/BrandMark";
import Button from "../components/Button";
import Input from "../components/Input";
import ModuleTile from "../components/ModuleTile";
import type { ModuleKey } from "../lib/modules";
import { ApiError, login } from "../services/api";
import { homePathFor, saveSession } from "../services/session";
import { t } from "../i18n";

/** Lo que incluye la app, con su color e inclinación. */
const MODULOS: { module: ModuleKey; label: string; giro: string; tinta: string }[] = [
  { module: "alumnos", label: "Alumnos", giro: "rotate-[-9deg] sm:mt-1", tinta: "text-emerald-700" },
  { module: "profesores", label: "Profesores", giro: "rotate-[11deg] sm:mt-7", tinta: "text-sky-700" },
  { module: "eventos", label: "Eventos", giro: "rotate-[-6deg] sm:mt-0", tinta: "text-rose-600" },
  { module: "horario", label: "Horario", giro: "rotate-[8deg] sm:mt-8", tinta: "text-orange-700" },
  { module: "pagos", label: "Pagos", giro: "rotate-[-12deg] sm:mt-2", tinta: "text-amber-700" },
];

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  /**
   * Un interruptor en lugar de un campo siempre visible.
   *
   * El backend responde el mismo mensaje genérico si a un profesor le falta
   * la clave, así que sin este interruptor un profesor que la olvidara vería
   * "correo o contraseña incorrectos" sin entender por qué. Eligiendo
   * "profesor" sabe que el campo es obligatorio.
   */
  const [comoProfesor, setComoProfesor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const data = await login(
        email,
        password,
        comoProfesor ? teacherCode : undefined
      );

      // Guardamos también el usuario, no solo el token: el saludo necesita
      // su nombre y el sidebar sus permisos.
      saveSession(data.token, data.user);

      // Cada rol entra a una pantalla distinta: el alumno a su tarjeta, el
      // admin y el profesor al panel de administración.
      navigate(homePathFor(data.user), { replace: true });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible conectar con el servidor.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="grid gap-2 p-2.5 sm:p-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Presentación */}
        <div className="flex flex-col justify-between gap-8 p-5 sm:p-8 lg:p-10">
          <div className="flex w-fit items-center gap-2.5 rounded-[1.25rem] border border-neutral-200/80 bg-surface py-2 pr-4 pl-2 shadow-surface">
            <BrandMark className="h-9 w-9" />
            <span className="text-xl font-bold text-neutral-800" translate="no">
              DojoManager
            </span>
          </div>

          <div>
            <h1 className="text-4xl leading-[1.08] font-bold text-neutral-800 sm:text-5xl lg:text-6xl">
              {t("Administra tu")}{" "}
              <span className="text-violet-600">dojo</span>{" "}
              {t("desde un solo lugar.")}
            </h1>
            <p className="mt-4 max-w-md text-lg font-medium text-pretty text-neutral-600 sm:text-xl">
              {t("Controla alumnos, profesores, clases y pagos.")}
            </p>
          </div>

          <ul className="hidden flex-wrap justify-between gap-x-2 gap-y-5 sm:flex">
            {MODULOS.map(({ module, label, giro, tinta }) => (
              <li
                key={module}
                className={`flex flex-col items-center gap-1.5 ${giro}`}
              >
                <ModuleTile module={module} size="lg" />
                <span
                  className={`rounded-xl border border-neutral-200/80 bg-surface px-2.5 py-0.5 text-sm font-semibold ${tinta}`}
                >
                  {t(label)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario */}
        <div className="rounded-[2.1rem] border border-neutral-200/80 bg-surface p-6 sm:rounded-[2.5rem] sm:p-10">
          <h2 className="text-3xl font-bold text-neutral-800">{t("Bienvenido")}</h2>

          <p className="mt-1 text-neutral-600">{t("Inicia sesión para continuar.")}</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <Input
              label={t("Correo electrónico")}
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label={t("Contraseña")}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Selector de tipo de cuenta */}
            <fieldset>
              <legend className="text-sm font-medium text-neutral-700">
                {t("¿Cómo entras?")}
              </legend>

              <div className="mt-2 grid grid-cols-2 gap-1 rounded-[1.25rem] border border-neutral-200 bg-neutral-50 p-1">
                {[
                  { valor: false, etiqueta: "Alumno o tutor" },
                  { valor: true, etiqueta: "Profesor" },
                ].map(({ valor, etiqueta }) => (
                  <label
                    key={etiqueta}
                    className={`
                      flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 py-2.5
                      text-sm font-semibold transition-colors duration-200
                      has-focus-visible:ring-2 has-focus-visible:ring-violet-600
                      motion-reduce:transition-none
                      ${
                        comoProfesor === valor
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-transparent text-neutral-600 hover:text-neutral-900"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tipo-cuenta"
                      checked={comoProfesor === valor}
                      onChange={() => setComoProfesor(valor)}
                      className="sr-only"
                    />
                    {t(etiqueta)}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* La clave es el tercer factor de los profesores */}
            {comoProfesor && (
              <Input
                label={t("Clave de profesor")}
                type="text"
                name="teacher-code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="PROF-7K2M"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                className="font-mono"
              />
            )}

            {error && (
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? t("Ingresando…") : t("Iniciar sesión")}
            </Button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Login;
