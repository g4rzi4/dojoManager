import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";

import AuthLayout from "../layouts/AuthLayout";
import Button from "../components/Button";
import Input from "../components/Input";
import { login } from "../services/api";
import { saveSession } from "../services/session";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    try {
      const data = await login(email, password);

      if (data.success) {
        // Guardamos también el usuario, no solo el token: el dashboard
        // necesita su nombre para el saludo y el sidebar para el avatar.
        saveSession(data.token, data.user);
        navigate("/dashboard");
      } else {
        setError(data.message);
      }
    } catch {
      setError("No fue posible conectar con el servidor.");
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