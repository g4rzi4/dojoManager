import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

interface Student {
  id: string;
  code: string;
  name: string;
  rank: string;
  beltColor: "white" | "yellow" | "green" | "blue" | "brown" | "black";
  ageGroup: string;
  status: "active" | "trial" | "inactive";
  lastAttendance: string;
  className: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRank, setSelectedRank] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para nuevo alumno
  const [formName, setFormName] = useState("");
  const [formBelt, setFormBelt] = useState<Student["beltColor"]>("white");
  const [formRankName, setFormRankName] = useState("Cinta Blanca");
  const [formAgeGroup, setFormAgeGroup] = useState("Adultos (18+)");
  const [formStatus, setFormStatus] = useState<Student["status"]>("active");
  const [formClass, setFormClass] = useState("Karate - Principiantes");

  const rankFilters: Array<{
    id: string;
    label: string;
    colorClass?: string;
    borderClass?: string;
  }> = [
    { id: "all", label: "Todos los Rangos" },
    { id: "white", label: "Blanca", colorClass: "bg-white", borderClass: "border-gray-300" },
    { id: "yellow", label: "Amarilla", colorClass: "bg-yellow-400" },
    { id: "green", label: "Verde", colorClass: "bg-green-600" },
    { id: "blue", label: "Azul", colorClass: "bg-blue-600" },
    { id: "brown", label: "Marrón", colorClass: "bg-amber-800" },
    { id: "black", label: "Negra", colorClass: "bg-gray-900" },
  ];

  function handleBeltChange(belt: Student["beltColor"]) {
    setFormBelt(belt);
    const names: Record<Student["beltColor"], string> = {
      white: "Cinta Blanca",
      yellow: "Cinta Amarilla",
      green: "Cinta Verde",
      blue: "Cinta Azul",
      brown: "Cinta Marrón",
      black: "Cinta Negra (1er Dan)",
    };
    setFormRankName(names[belt]);
  }

  function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    const newStudent: Student = {
      id: Date.now().toString(),
      code: `DJM-${String(students.length + 1).padStart(5, "0")}`,
      name: formName.trim(),
      rank: formRankName,
      beltColor: formBelt,
      ageGroup: formAgeGroup,
      status: formStatus,
      lastAttendance: "Hoy",
      className: formClass,
    };

    setStudents([newStudent, ...students]);
    setFormName("");
    setIsModalOpen(false);
  }

  function handleDeleteStudent(id: string) {
    setStudents(students.filter((s) => s.id !== id));
  }

  const filteredStudents = students.filter((s) => {
    const matchesRank = selectedRank === "all" || s.beltColor === selectedRank;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rank.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRank && matchesSearch;
  });

  const beltColorMap: Record<Student["beltColor"], string> = {
    white: "bg-white border-gray-300",
    yellow: "bg-yellow-400 border-yellow-500",
    green: "bg-green-600 border-green-700",
    blue: "bg-blue-600 border-blue-700",
    brown: "bg-amber-800 border-amber-900",
    black: "bg-gray-900 border-gray-950",
  };

  const statusBadgeMap = {
    active: {
      text: "Activo",
      class: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
    },
    trial: {
      text: "En prueba",
      class: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
    },
    inactive: {
      text: "Inactivo",
      class: "text-gray-600 bg-gray-100 border-gray-200",
      dot: "bg-gray-400",
    },
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 md:p-10 bg-[#f8fafc]">
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              Alumnos
            </h2>
            <p className="text-gray-500 text-base">
              Gestiona los alumnos inscritos y monitorea su progreso y asistencia.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-red-800 transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Alumno</span>
          </button>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Rank Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1 whitespace-nowrap">
              Filtrar:
            </span>

            {rankFilters.map((filter) => {
              const isSelected = selectedRank === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedRank(filter.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "border border-primary bg-red-50 text-primary shadow-xs"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {filter.colorClass && (
                    <span
                      className={`w-3 h-3 rounded-sm border ${filter.colorClass} ${
                        filter.borderClass || "border-transparent"
                      } inline-block`}
                    />
                  )}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Data Table / Bento Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Nombre del Alumno</div>
            <div className="col-span-2">Rango / Cinta</div>
            <div className="col-span-2">Grupo de Edad</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {/* Table Body */}
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
              <div className="w-14 h-14 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-[30px]">group</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {students.length === 0
                  ? "No hay alumnos registrados aún"
                  : "No se encontraron alumnos con los filtros seleccionados"}
              </h3>
              <p className="text-sm text-gray-500 max-w-md w-full mb-5 leading-relaxed">
                {students.length === 0
                  ? "Comienza agregando el primer alumno a tu academia para llevar el control de rangos, asistencia y pagos."
                  : "Intenta cambiar el término de búsqueda o selecciona otro filtro de rango."}
              </p>
              {students.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-primary text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-red-800 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Registrar Primer Alumno</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const statusInfo = statusBadgeMap[student.status];
                const initials = student.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={student.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-6 py-4 items-center hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Student Info */}
                    <div className="sm:col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-primary border border-red-200 flex items-center justify-center font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {student.code}
                        </p>
                      </div>
                    </div>

                    {/* Rank / Belt */}
                    <div className="sm:col-span-2 flex items-center">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50/50">
                        <span
                          className={`w-3.5 h-2 rounded-xs block border ${beltColorMap[student.beltColor]}`}
                        />
                        <span className="text-xs font-medium text-gray-800">
                          {student.rank}
                        </span>
                      </div>
                    </div>

                    {/* Age Group */}
                    <div className="sm:col-span-2 text-sm text-gray-700">
                      {student.ageGroup}
                    </div>

                    {/* Status */}
                    <div className="sm:col-span-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.class}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.text}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar alumno"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/60 flex justify-between items-center text-xs text-gray-500">
            <p>
              Mostrando {filteredStudents.length} de {students.length} alumnos
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors disabled:opacity-40"
                disabled
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors disabled:opacity-40"
                disabled
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Registrar Nuevo Alumno */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-gray-100 relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">person_add</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Registrar Nuevo Alumno
                    </h3>
                    <p className="text-xs text-gray-500">
                      Completa los datos del nuevo estudiante.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Liam Nakamura"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Cinta / Rango
                    </label>
                    <select
                      value={formBelt}
                      onChange={(e) => handleBeltChange(e.target.value as Student["beltColor"])}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="white">Blanca</option>
                      <option value="yellow">Amarilla</option>
                      <option value="green">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="brown">Marrón</option>
                      <option value="black">Negra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Grupo de Edad
                    </label>
                    <select
                      value={formAgeGroup}
                      onChange={(e) => setFormAgeGroup(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="Niños (5-12)">Niños (5-12)</option>
                      <option value="Jóvenes (13-17)">Jóvenes (13-17)</option>
                      <option value="Adultos (18+)">Adultos (18+)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Estado
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as Student["status"])}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="active">Activo</option>
                      <option value="trial">En prueba</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Clase Asignada
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Karate Adultos"
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
                  >
                    Guardar Alumno
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
