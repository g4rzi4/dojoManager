export default function Navbar() {
  return (
    <header className="hidden md:flex justify-between items-center px-8 w-full h-16 sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex-1 flex items-center">
        {/* Search bar */}
        <div className="relative w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50/70 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
            placeholder="Buscar..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notificaciones"
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>

        <button
          type="button"
          aria-label="Ayuda"
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">help</span>
        </button>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-red-100 text-primary flex items-center justify-center border border-red-200 ml-2 font-bold text-sm shadow-xs cursor-pointer select-none">
          <span className="material-symbols-outlined text-[22px]">account_circle</span>
        </div>
      </div>
    </header>
  );
}
