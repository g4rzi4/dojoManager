import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

type Props = {
  children: ReactNode;
};

function DashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* Permite a quien navega con teclado saltarse el menú */}
      <a
        href="#contenido"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2
          focus:font-semibold focus:text-white
        "
      >
        Saltar al contenido
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior: el botón del menú solo en móvil, la campana siempre */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            className="
              flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg
              text-slate-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-slate-100
              focus:ring-2 focus:ring-blue-600 focus:outline-none
              lg:hidden
            "
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <span className="font-bold text-slate-900 lg:hidden">
            DojoManager
          </span>

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        <main
          id="contenido"
          className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
