import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";

import AuthLayout from "../layouts/AuthLayout";
import Button from "../components/Button";
import Input from "../components/Input";
import { ApiError, login } from "../services/api";
import { homePathFor, saveSession } from "../services/session";

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

  async function handleLogin() {
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
          : "No fue posible conectar con el servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="grid md:grid-cols-2">

        {/* Panel izquierdo */}
        <div className="hidden md:flex flex-col justify-center bg-blue-600 text-white p-12">

          <GraduationCap size={60} />

          <h1 className="mt-6 text-4xl font-bold">
            DojoManager
          </h1>

          <p className="mt-4 text-blue-100 leading-relaxed">
            Administra tu escuela desde un solo lugar.
            Controla alumnos, profesores, clases,
            pagos y reportes con una interfaz moderna.
          </p>

        </div>

        {/* Panel derecho */}
        <div className="p-10">

          <h2 className="text-3xl font-bold text-gray-800">
            Bienvenido
          </h2>

          <p className="mt-2 text-gray-500">
            Inicia sesión para continuar.
          </p>

          <div className="mt-8 space-y-6">

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Selector de tipo de cuenta */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                ¿Cómo entras?
              </legend>

              <div className="mt-2 grid grid-cols-2 gap-3">
                {[
                  { valor: false, etiqueta: "Alumno o tutor" },
                  { valor: true, etiqueta: "Profesor" },
                ].map(({ valor, etiqueta }) => (
                  <label
                    key={etiqueta}
                    className={`
                      flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3
                      text-sm font-medium transition-colors duration-200
                      motion-reduce:transition-none
                      ${
                        comoProfesor === valor
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tipo-cuenta"
                      checked={comoProfesor === valor}
                      onChange={() => setComoProfesor(valor)}
                      className="cursor-pointer"
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* La clave es el tercer factor de los profesores */}
            {comoProfesor && (
              <Input
                label="Clave de profesor"
                type="text"
                placeholder="PROF-7K2M"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                className="font-mono"
              />
            )}

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>

          </div>

        </div>

      </div>
    </AuthLayout>
  );
}

export default Login;