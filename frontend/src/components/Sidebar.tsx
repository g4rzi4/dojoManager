import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  LogOut,
  X,
} from "lucide-react";

import { clearSession, getUser } from "../services/session";

type Props = {
  /** En móvil el sidebar se muestra como panel deslizable. */
  open: boolean;
  onClose: () => void;
};

const NAV_ITEMS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/profesores", label: "Profesores", icon: GraduationCap },
  { to: "/alumnos", label: "Alumnos", icon: Users },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
];

function Sidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearSession();
    navigate("/");
  }

  return (
    <>
      {/* Fondo oscuro detrás del panel en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-72 flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-200 ease-out
          motion-reduce:transition-none
          lg:static lg:z-auto lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Navegación de administración"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <GraduationCap size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-slate-900">DojoManager</p>
              <p className="text-xs text-slate-600">Administración</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="
              flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg
              text-slate-600 transition-colors duration-200
              hover:bg-slate-100 hover:text-slate-900
              focus:ring-2 focus:ring-blue-600 focus:outline-none
              lg:hidden
            "
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Administración
          </p>

          <ul className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 rounded-xl px-3 py-3
                    text-sm font-medium transition-colors duration-200
                    motion-reduce:transition-none
                    focus:ring-2 focus:ring-blue-600 focus:outline-none
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={20}
                        aria-hidden="true"
                        className={isActive ? "text-blue-700" : "text-slate-500"}
                      />
                      {label}
                      {/* Marca el activo sin depender solo del color */}
                      {isActive && (
                        <span className="ml-auto h-6 w-1 rounded-full bg-blue-600" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Usuario y salida */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {(user?.name ?? "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.name ?? "Invitado"}
              </p>
              <p className="truncate text-xs text-slate-600">
                {user?.email ?? "Sin sesión"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="
              mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3
              text-sm font-medium text-slate-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-red-50 hover:text-red-700
              focus:ring-2 focus:ring-blue-600 focus:outline-none
            "
          >
            <LogOut size={20} aria-hidden="true" className="text-slate-500" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
