import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { label: "Students", icon: "group", path: "/students" },
    { label: "Classes", icon: "calendar_today", path: "/classes" },
    { label: "Payments", icon: "payments", path: "/payments" },
    { label: "Settings", icon: "settings", path: "/settings" },
  ];

  return (
    <div className="font-sans text-gray-900 bg-[#f8fafc] flex flex-col md:flex-row antialiased min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]">
            sports_martial_arts
          </span>
          <span className="font-bold text-primary text-lg">DojoManager</span>
        </div>
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </header>

      {/* Mobile Dropdown Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-1 sticky top-[57px] z-40 shadow-md">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm ${
                location.pathname === item.path
                  ? "bg-red-50 text-primary font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <Link
            to="/"
            onClick={() => {
              localStorage.removeItem("token");
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Cerrar Sesión</span>
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen bg-[#f8fafc]">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
