import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { label: "Students", icon: "group", path: "/students" },
    { label: "Classes", icon: "calendar_today", path: "/classes" },
    { label: "Payments", icon: "payments", path: "/payments" },
    { label: "Settings", icon: "settings", path: "/settings" },
  ];

  return (
    <nav className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-white border-r border-gray-200 shadow-xs flex-col py-6 z-50">
      {/* Brand Logo & Name */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[28px]">
            sports_martial_arts
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">
            DojoManager
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Academy Admin
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 font-medium text-sm ${
                isActive
                  ? "bg-red-50 text-primary font-semibold shadow-xs"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout / Footer Action */}
      <div className="px-3 pt-3 border-t border-gray-100">
        <Link
          to="/"
          onClick={() => localStorage.removeItem("token")}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 text-sm font-medium"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span>Cerrar Sesión</span>
        </Link>
      </div>
    </nav>
  );
}
