import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Por favor ingresa tu nombre completo.");
          setLoading(false);
          return;
        }
        const data = await register(name, email, password);
        if (data.success) {
          localStorage.setItem("token", data.token);
          navigate("/dashboard");
        } else {
          setError(data.message || "Error al crear la cuenta.");
        }
      } else {
        const data = await login(email, password);
        if (data.success) {
          localStorage.setItem("token", data.token);
          navigate("/dashboard");
        } else {
          setError(data.message || "Credenciales incorrectas.");
        }
      }
    } catch {
      setError("No fue posible conectar con el servidor backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left Panel: Brand */}
      <div
        className="hidden md:flex md:w-1/2 relative flex-col justify-between overflow-hidden"
        style={{ background: "linear-gradient(135deg, #7a000c 0%, #af101a 50%, #c62828 100%)" }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)",
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_martial_arts
              </span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              DojoManager
            </span>
          </div>
        </div>

        {/* Bottom: Headline */}
        <div className="relative z-10 p-10 pb-14">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4 max-w-sm">
            Master Your Academy's Operations.
          </h1>
          <p className="text-red-100/80 text-lg leading-relaxed max-w-sm">
            Streamline attendance, billing, and scheduling with disciplined precision.
          </p>

          {/* Stats bar */}
          <div className="mt-10 grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
            {[
              { label: "Alumnos", value: "∞" },
              { label: "Clases", value: "∞" },
              { label: "Plataformas", value: "1" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-red-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-6 py-12 md:px-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile Brand */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-10">
            <span
              className="material-symbols-outlined text-primary text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sports_martial_arts
            </span>
            <span className="text-xl font-bold text-gray-900">DojoManager</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
              {isRegister ? "Crear cuenta" : "Bienvenido de nuevo"}
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              {isRegister
                ? "Registra tu usuario administrador para comenzar."
                : "Ingresa tus credenciales para acceder al panel."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (register only) */}
            {isRegister && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5"
                >
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                    person
                  </span>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Ej. Sensei Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="instructor@dojo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:text-red-800 hover:underline transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-semibold text-sm py-3 px-6 rounded-xl hover:bg-red-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isRegister ? "Registrando..." : "Ingresando..."}
                  </>
                ) : (
                  <>
                    {isRegister ? "Crear cuenta" : "Iniciar sesión"}
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isRegister ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta aún?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                  setName("");
                }}
                className="font-semibold text-primary hover:text-red-800 hover:underline transition-colors cursor-pointer"
              >
                {isRegister ? "Iniciar sesión" : "Crear una cuenta"}
              </button>
            </p>
          </div>

          {/* Footer note */}
          <p className="mt-10 text-center text-xs text-gray-400">
            DojoManager © {new Date().getFullYear()} · Gestión de Academias de Artes Marciales
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;