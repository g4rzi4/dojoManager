import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import BrandMark from "../components/BrandMark";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

type Props = {
  children: ReactNode;
};

function DashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex lg:items-start lg:gap-3 lg:p-3">
      {/* Permite a quien navega con teclado saltarse el menú */}
      <a
        href="#contenido"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:rounded-2xl focus:bg-violet-600 focus:px-4 focus:py-2
          focus:font-semibold focus:text-white
        "
      >
        Saltar al contenido
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra flotante: el menú y la marca solo en móvil, la campana siempre */}
        <div className="sticky top-3 z-20 mx-3 mt-3 flex items-center gap-2 rounded-[1.4rem] border border-neutral-200/80 bg-white p-1.5 shadow-surface lg:mx-0 lg:mt-0 lg:ml-auto lg:w-fit">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            className="
              flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl
              text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-100
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
              lg:hidden
            "
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <BrandMark className="h-8 w-8 lg:hidden" />
          <span className="font-bold text-neutral-800 lg:hidden">
            DojoManager
          </span>

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        <main
          id="contenido"
          className="flex-1 scroll-mt-20 px-4 py-6 sm:px-6 lg:px-6 lg:pt-2 lg:pb-8"
        >
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
