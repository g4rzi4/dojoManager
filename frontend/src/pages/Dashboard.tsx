import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {
  // Estado inicial limpio (sin datos ficticios)
  const stats = {
    activeStudents: 0,
    monthlyIncome: 0,
    todayAttendance: 0,
  };

  // Lista de clases reales (vacía por defecto hasta que se creen)
  const todayClasses: Array<{
    id: number;
    title: string;
    instructor: string;
    location: string;
    schedule: string;
    enrolled: number;
    capacity: number;
  }> = [];

  // Lista de alertas reales (vacía por defecto)
  const alerts: Array<{
    id: number;
    type: "warning" | "info";
    title: string;
    message: string;
    actionText: string;
    actionLink: string;
  }> = [];

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 md:p-10 bg-[#f8fafc]">
        {/* Greeting Section */}
        <section className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              ¡Hola, Sensei! 👋
            </h2>
            <p className="text-gray-500 text-base">
              Bienvenido al panel de control de tu dojo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/classes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-red-800 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nueva Clase</span>
            </Link>
          </div>
        </section>

        {/* Metrics Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Metric 1: Alumnos Activos */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Alumnos Activos
              </h3>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  group
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {stats.activeStudents}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-400">
              <span>0 alumnos registrados</span>
            </div>
          </div>

          {/* Metric 2: Ingresos Mes */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ingresos del Mes
              </h3>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                <span className="material-symbols-outlined text-[22px]">
                  payments
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              ${stats.monthlyIncome}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-400">
              <span>Sin pagos registrados este mes</span>
            </div>
          </div>

          {/* Metric 3: Asistencia Hoy */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-400"></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Asistencia Hoy
              </h3>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <span className="material-symbols-outlined text-[22px]">
                  fact_check
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {stats.todayAttendance}%
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-400">
              <span>Sin clases activas hoy</span>
            </div>
          </div>
        </section>

        {/* Main Content Split */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Clases de Hoy */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-900">
                Clases de Hoy
              </h3>
              <Link
                to="/classes"
                className="text-sm font-semibold text-primary hover:text-red-800 hover:underline"
              >
                Ver Todas
              </Link>
            </div>

            {todayClasses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[26px]">
                    calendar_today
                  </span>
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-1">
                  No hay clases programadas para hoy
                </h4>
                <p className="text-sm text-gray-500 max-w-md w-full mb-4 leading-relaxed">
                  Crea y agenda tus clases para llevar el control de horarios, tatamis y asistencia.
                </p>
                <Link
                  to="/classes"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Programar primera clase</span>
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
                {todayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[26px]">
                          sports_martial_arts
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base">
                          {cls.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {cls.instructor} • {cls.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {cls.schedule}
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {cls.enrolled}/{cls.capacity} Alumnos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Alertas */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Alertas
            </h3>

            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 text-center shadow-xs flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[26px]">
                    check_circle
                  </span>
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-1">
                  Todo está al día
                </h4>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  No tienes pagos vencidos ni alertas pendientes en este momento.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl flex items-start gap-3.5 shadow-xs border ${
                    alert.type === "warning"
                      ? "bg-red-50/70 border-red-200/80"
                      : "bg-amber-50/70 border-amber-200/80"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[24px] mt-0.5 shrink-0 ${
                      alert.type === "warning" ? "text-red-600" : "text-amber-600"
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {alert.type === "warning" ? "warning" : "military_tech"}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base mb-1">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {alert.message}
                    </p>
                    <Link
                      to={alert.actionLink}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {alert.actionText} &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}