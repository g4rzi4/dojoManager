import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";

import BrandMark from "./BrandMark";
import ModuleTile from "./ModuleTile";
import { can, clearSession, getUser } from "../services/session";
import { ROLE_LABELS, type Permission } from "../types/user";
import type { ModuleKey } from "../lib/modules";

type Props = {
  /** En móvil el sidebar se muestra como panel deslizable. */
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  to: string;
  label: string;
  module: ModuleKey;
  /** Permiso necesario para ver esta entrada. */
  permission: Permission;
};

/**
 * Entradas del menú con el permiso que cada una exige.
 *
 * Un PROFESOR no verá "Profesores" porque no tiene teachers:read. Ocultarlo
 * es solo para no ofrecer algo que va a fallar: la puerta de verdad la cierra
 * el backend.
 */
const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Inicio",
    module: "inicio",
    permission: "students:read",
  },
  {
    to: "/profesores",
    label: "Profesores",
    module: "profesores",
    permission: "teachers:read",
  },
  {
    to: "/alumnos",
    label: "Alumnos",
    module: "alumnos",
    permission: "students:read",
  },
  {
    to: "/eventos",
    label: "Eventos",
    module: "eventos",
    permission: "events:read",
  },
  {
    to: "/clases",
    label: "Horario",
    module: "horario",
    // Lo ven los cuatro roles: el horario de clases le importa a la familia.
    permission: "events:read",
  },
  {
    to: "/pagos",
    label: "Pagos",
    module: "pagos",
    // self:read lo tienen los cuatro roles: el alcance de lo que se ve lo
    // decide el backend (sus pagos, los de sus hijos, o todos).
    permission: "self:read",
  },
  {
    to: "/notificaciones",
    label: "Notificaciones",
    module: "notificaciones",
    permission: "self:read",
  },
];

function Sidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const user = getUser();

  const visibleItems = NAV_ITEMS.filter((item) => can(user, item.permission));

  // Alumno y tutor no administran el dojo: entran a su propio panel.
  const esFamilia = user?.role === "ALUMNO" || user?.role === "TUTOR";
  const esAlumno = user?.role === "ALUMNO";

  function handleLogout() {
    clearSession();
    navigate("/");
  }

  return (
    <>
      {/* Fondo oscuro detrás del panel en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-72 flex-col overscroll-contain
          rounded-r-[2rem] border-r border-neutral-200/80 bg-white shadow-float
          transition-[transform,visibility] duration-200 ease-out
          motion-reduce:transition-none
          lg:visible lg:sticky lg:top-3 lg:z-auto lg:h-[calc(100dvh-1.5rem)]
          lg:translate-x-0 lg:rounded-[2rem] lg:border
          ${open ? "visible translate-x-0" : "invisible -translate-x-full"}
        `}
        aria-label="Navegación principal"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-lg leading-tight font-bold text-neutral-800">
                DojoManager
              </p>
              <p className="text-sm text-neutral-600">
                {esFamilia ? "Mi dojo" : "Administración"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="
              flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl
              text-neutral-600 transition-colors duration-200
              hover:bg-neutral-100 hover:text-neutral-900
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              lg:hidden
            "
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {esFamilia && (
              <SidebarLink
                to="/inicio"
                label="Inicio"
                module="inicio"
                onClose={onClose}
              />
            )}

            {esAlumno && (
              <SidebarLink
                to="/mi-tarjeta"
                label="Mi tarjeta"
                module="tarjeta"
                onClose={onClose}
              />
            )}

            {visibleItems.map(({ to, label, module }) => (
              <SidebarLink
                key={to}
                to={to}
                label={label}
                module={module}
                onClose={onClose}
              />
            ))}
          </ul>
        </nav>

        {/* Usuario y salida */}
        <div className="p-3">
          <div className="rounded-3xl border border-neutral-200/80 bg-neutral-50 p-2">
            <div className="flex items-center gap-3 p-1.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-800">
                  {user?.name ?? "Invitado"}
                </p>
                <p className="truncate text-sm text-neutral-600">
                  {user ? ROLE_LABELS[user.role] : "Sin sesión"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="
                mt-1 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5
                text-sm font-medium text-neutral-700 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-red-50 hover:text-red-700
                focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              "
            >
              <LogOut size={18} aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

type SidebarLinkProps = {
  to: string;
  label: string;
  module: ModuleKey;
  onClose: () => void;
};

function SidebarLink({ to, label, module, onClose }: SidebarLinkProps) {
  return (
    <li>
      <NavLink
        to={to}
        onClick={onClose}
        className={({ isActive }) => `
          flex items-center gap-3 rounded-[1.1rem] p-1.5 pr-3
          transition-colors duration-200
          motion-reduce:transition-none
          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
          ${
            isActive
              ? "bg-neutral-100 font-bold text-neutral-900"
              : "font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
          }
        `}
      >
        <ModuleTile module={module} size="sm" />
        {label}
      </NavLink>
    </li>
  );
}

export default Sidebar;
