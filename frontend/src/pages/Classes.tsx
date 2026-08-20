import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

interface ClassItem {
  id: string;
  title: string;
  discipline: string;
  dayIndex: number; // 0 = Mon, 1 = Tue, ..., 6 = Sun
  startTime: string; // "08:30"
  endTime: string; // "10:00"
  instructor: string;
  location: string;
  level: string;
  capacity: number;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "list">("week");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para nueva clase
  const [formTitle, setFormTitle] = useState("");
  const [formDiscipline, setFormDiscipline] = useState("Karate");
  const [formDay, setFormDay] = useState<number>(0);
  const [formStartTime, setFormStartTime] = useState("16:00");
  const [formEndTime, setFormEndTime] = useState("17:30");
  const [formInstructor, setFormInstructor] = useState("");
  const [formLocation, setFormLocation] = useState("Tatami 1");
  const [formLevel, setFormLevel] = useState("Principiantes");
  const [formCapacity, setFormCapacity] = useState<number>(15);

  const daysOfWeek = [
    { name: "LUN", full: "Lunes", date: "12" },
    { name: "MAR", full: "Martes", date: "13" },
    { name: "MIÉ", full: "Miércoles", date: "14" },
    { name: "JUE", full: "Jueves", date: "15", isToday: true },
    { name: "VIE", full: "Viernes", date: "16" },
    { name: "SÁB", full: "Sábado", date: "17" },
    { name: "DOM", full: "Domingo", date: "18" },
  ];

  const timeSlots = [
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
    "22:00",
  ];

  function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formInstructor.trim()) return;

    const newClass: ClassItem = {
      id: Date.now().toString(),
      title: formTitle.trim(),
      discipline: formDiscipline,
      dayIndex: Number(formDay),
      startTime: formStartTime,
      endTime: formEndTime,
      instructor: formInstructor.trim(),
      location: formLocation,
      level: formLevel,
      capacity: Number(formCapacity) || 15,
    };

    setClasses([...classes, newClass]);
    setFormTitle("");
    setFormInstructor("");
    setIsModalOpen(false);
  }

  function handleDeleteClass(id: string) {
    setClasses(classes.filter((c) => c.id !== id));
  }

  function calculateTopPosition(startTime: string): number {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startHour = 8;
    const diffHours = (hours || 8) - startHour + (minutes || 0) / 60;
    return Math.max(0, diffHours * 45 + 10);
  }

  const disciplineColorMap: Record<string, { badge: string; border: string }> = {
    Karate: { badge: "bg-red-50 text-primary border-red-200", border: "border-l-primary" },
    BJJ: { badge: "bg-amber-50 text-amber-800 border-amber-200", border: "border-l-amber-600" },
    "Muay Thai": { badge: "bg-emerald-50 text-emerald-800 border-emerald-200", border: "border-l-emerald-600" },
    Taekwondo: { badge: "bg-blue-50 text-blue-800 border-blue-200", border: "border-l-blue-600" },
    Boxeo: { badge: "bg-slate-100 text-slate-800 border-slate-300", border: "border-l-slate-600" },
    Judo: { badge: "bg-purple-50 text-purple-800 border-purple-200", border: "border-l-purple-600" },
    MMA: { badge: "bg-orange-50 text-orange-800 border-orange-200", border: "border-l-orange-600" },
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 md:p-10 bg-[#f8fafc] flex flex-col">
        <div className="max-w-[1280px] w-full mx-auto flex-1 flex flex-col">
          {/* Page Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Horario de Clases
              </h2>
              <p className="text-gray-500 text-base">
                Gestiona las sesiones de entrenamiento semanales en todos los tatamis.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "week"
                      ? "bg-white text-primary shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-primary shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Lista
                </button>
              </div>

              {/* Add Class CTA */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-red-800 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Nueva Clase</span>
              </button>
            </div>
          </div>

          {/* Main View */}
          {viewMode === "week" ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden flex flex-col">
              {/* Horizontal Scroll Wrapper for smaller screens */}
              <div className="overflow-x-auto">
                <div className="min-w-[840px]">
                  {/* Days Header Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px repeat(7, minmax(0, 1fr))",
                    }}
                    className="border-b border-gray-200 bg-gray-50/80 sticky top-0 z-10"
                  >
                    <div className="p-3 text-center border-r border-gray-200 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        HORA
                      </span>
                    </div>

                    {daysOfWeek.map((day, idx) => (
                      <div
                        key={day.name}
                        className={`p-3 text-center ${
                          idx < 6 ? "border-r border-gray-200" : ""
                        } ${day.isToday ? "bg-red-50/60" : ""}`}
                      >
                        <span
                          className={`text-xs uppercase tracking-wider font-bold ${
                            day.isToday ? "text-primary" : "text-gray-500"
                          }`}
                        >
                          {day.name}
                        </span>
                        <div
                          className={`text-lg mt-0.5 font-bold ${
                            day.isToday ? "text-primary" : "text-gray-900"
                          }`}
                        >
                          {day.date}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid Body */}
                  <div className="relative">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px repeat(7, minmax(0, 1fr))",
                      }}
                      className="relative min-h-[640px]"
                    >
                      {/* Time Label Column */}
                      <div className="border-r border-gray-200 bg-gray-50/30 flex flex-col">
                        {timeSlots.map((time) => (
                          <div
                            key={time}
                            className="h-[90px] pr-2.5 border-b border-gray-100 text-right text-xs font-semibold text-gray-400 pt-2 select-none"
                          >
                            {time}
                          </div>
                        ))}
                      </div>

                      {/* 7 Days Columns */}
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const dayClasses = classes.filter((c) => c.dayIndex === dayIndex);
                        const isTodayCol = daysOfWeek[dayIndex]?.isToday;

                        return (
                          <div
                            key={dayIndex}
                            className={`relative border-r border-gray-100 last:border-r-0 ${
                              isTodayCol ? "bg-red-50/15" : ""
                            }`}
                          >
                            {/* Horizontal slot guide lines */}
                            {timeSlots.map((time) => (
                              <div
                                key={time}
                                className="h-[90px] border-b border-gray-100/70"
                              />
                            ))}

                            {/* Class Cards in this column */}
                            {dayClasses.map((item) => {
                              const topPos = calculateTopPosition(item.startTime);
                              const colors = disciplineColorMap[item.discipline] || {
                                badge: "bg-gray-100 text-gray-800 border-gray-200",
                                border: "border-l-primary",
                              };

                              return (
                                <div
                                  key={item.id}
                                  style={{ top: `${topPos}px` }}
                                  className={`absolute left-1.5 right-1.5 bg-white border border-gray-200 rounded-xl p-2.5 shadow-xs border-l-4 ${colors.border} hover:shadow-md transition-all z-10 group`}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colors.badge}`}
                                    >
                                      {item.discipline}
                                    </span>
                                    <span className="text-[11px] font-semibold text-gray-600">
                                      {item.startTime}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-bold text-gray-900 truncate">
                                    {item.title}
                                  </h4>

                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    {item.instructor}
                                  </p>

                                  <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                                    <span className="truncate">{item.location}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClass(item.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 transition-opacity cursor-pointer"
                                      title="Eliminar clase"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Clean Empty State Message (when no classes scheduled yet) */}
                    {classes.length === 0 && (
                      <div className="p-8 text-center border-t border-gray-100 bg-white flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[24px]">
                            calendar_today
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">
                          No hay clases programadas para esta semana
                        </h4>
                        <p className="text-sm text-gray-500 max-w-md w-full mb-4 leading-relaxed">
                          La cuadrícula está lista. Haz clic en el botón para programar tu primera clase por horario y tatami.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-800 transition-all shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          <span>Programar Primera Clase</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
              {classes.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
                  <div className="w-14 h-14 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px]">
                      calendar_today
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">
                    No hay clases registradas
                  </h4>
                  <p className="text-sm text-gray-500 max-w-md w-full mb-5 leading-relaxed">
                    Crea tu primera clase para asignarle instructor, horario y tatami.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-primary text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-red-800 transition-all shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Nueva Clase</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[26px]">
                            sports_martial_arts
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-base font-bold text-gray-900">
                              {cls.title}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                              {daysOfWeek[cls.dayIndex]?.full}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {cls.instructor} • {cls.location} • {cls.level}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {cls.startTime} - {cls.endTime}
                          </div>
                          <span className="text-xs text-gray-400">
                            Cupo: {cls.capacity} alumnos
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar clase"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Agregar Nueva Clase */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-gray-100 relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">calendar_add_on</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Programar Nueva Clase
                    </h3>
                    <p className="text-xs text-gray-500">
                      Configura el horario, instructor y tatami.
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

              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Título de la Clase *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Karate - Principiantes"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Disciplina
                    </label>
                    <select
                      value={formDiscipline}
                      onChange={(e) => setFormDiscipline(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="Karate">Karate</option>
                      <option value="BJJ">BJJ (Jiu-Jitsu)</option>
                      <option value="Muay Thai">Muay Thai</option>
                      <option value="Taekwondo">Taekwondo</option>
                      <option value="Boxeo">Boxeo</option>
                      <option value="Judo">Judo</option>
                      <option value="MMA">MMA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Día de la Semana
                    </label>
                    <select
                      value={formDay}
                      onChange={(e) => setFormDay(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value={0}>Lunes</option>
                      <option value={1}>Martes</option>
                      <option value={2}>Miércoles</option>
                      <option value={3}>Jueves</option>
                      <option value={4}>Viernes</option>
                      <option value={5}>Sábado</option>
                      <option value={6}>Domingo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Hora Fin
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Instructor *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Sensei Miguel"
                      value={formInstructor}
                      onChange={(e) => setFormInstructor(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Tatami / Sala
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Tatami 1"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nivel / Grupo
                    </label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="Principiantes">Principiantes</option>
                      <option value="Intermedios">Intermedios</option>
                      <option value="Avanzados">Avanzados</option>
                      <option value="Niños (5-12)">Niños (5-12)</option>
                      <option value="Todos los niveles">Todos los niveles</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Capacidad Máxima
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(Number(e.target.value))}
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
                    Guardar Clase
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
