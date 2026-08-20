import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  colorClass: string;
}

interface SchoolProfile {
  name: string;
  phone: string;
  address: string;
  email: string;
}

interface Notifications {
  paymentReminders: boolean;
  attendanceAlerts: boolean;
  newEnrollments: boolean;
}

interface SystemPrefs {
  language: string;
  currency: string;
  timezone: string;
}

export default function Settings() {
  // School Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState<SchoolProfile>({
    name: "",
    phone: "",
    address: "",
    email: "",
  });
  const [draftProfile, setDraftProfile] = useState<SchoolProfile>({ ...profile });

  // System Preferences
  const [prefs, setPrefs] = useState<SystemPrefs>({
    language: "es",
    currency: "MXN",
    timezone: "America/Mexico_City",
  });
  const [savedPrefs, setSavedPrefs] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notifications>({
    paymentReminders: true,
    attendanceAlerts: false,
    newEnrollments: true,
  });

  // Membership Plans
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formPlanName, setFormPlanName] = useState("");
  const [formPlanDesc, setFormPlanDesc] = useState("");
  const [formPlanPrice, setFormPlanPrice] = useState<number>(0);
  const [formPlanColor, setFormPlanColor] = useState("bg-primary");

  const planColors = [
    { label: "Rojo", value: "bg-primary" },
    { label: "Ámbar", value: "bg-amber-500" },
    { label: "Verde", value: "bg-emerald-600" },
    { label: "Azul", value: "bg-blue-600" },
    { label: "Gris", value: "bg-gray-500" },
    { label: "Morado", value: "bg-purple-600" },
  ];

  function openNewPlan() {
    setEditingPlan(null);
    setFormPlanName("");
    setFormPlanDesc("");
    setFormPlanPrice(0);
    setFormPlanColor("bg-primary");
    setIsPlanModalOpen(true);
  }

  function openEditPlan(plan: MembershipPlan) {
    setEditingPlan(plan);
    setFormPlanName(plan.name);
    setFormPlanDesc(plan.description);
    setFormPlanPrice(plan.price);
    setFormPlanColor(plan.colorClass);
    setIsPlanModalOpen(true);
  }

  function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!formPlanName.trim()) return;

    if (editingPlan) {
      setPlans(
        plans.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                name: formPlanName.trim(),
                description: formPlanDesc.trim(),
                price: Number(formPlanPrice),
                colorClass: formPlanColor,
              }
            : p
        )
      );
    } else {
      setPlans([
        ...plans,
        {
          id: Date.now().toString(),
          name: formPlanName.trim(),
          description: formPlanDesc.trim(),
          price: Number(formPlanPrice),
          colorClass: formPlanColor,
        },
      ]);
    }
    setIsPlanModalOpen(false);
  }

  function handleDeletePlan(id: string) {
    setPlans(plans.filter((p) => p.id !== id));
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfile({ ...draftProfile });
    setIsEditingProfile(false);
  }

  function handleSavePrefs(e: React.FormEvent) {
    e.preventDefault();
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2000);
  }

  const Toggle = ({
    id,
    checked,
    onChange,
  }: {
    id: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
        checked ? "bg-primary" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 md:p-10 bg-[#f8fafc]">
        <div className="max-w-[1280px] mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              Configuración
            </h2>
            <p className="text-gray-500 text-base">
              Administra los detalles de tu escuela, planes de membresía y preferencias del sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* School Profile Card */}
              <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />

                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">storefront</span>
                    Perfil de la Escuela
                  </h3>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftProfile({ ...profile });
                        setIsEditingProfile(true);
                      }}
                      className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Nombre de la Escuela
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Academia Dragón Rojo"
                          value={draftProfile.name}
                          onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          placeholder="+52 55 1234 5678"
                          value={draftProfile.phone}
                          onChange={(e) => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Correo de Contacto
                        </label>
                        <input
                          type="email"
                          placeholder="info@academia.com"
                          value={draftProfile.email}
                          onChange={(e) => setDraftProfile({ ...draftProfile, email: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Dirección
                        </label>
                        <input
                          type="text"
                          placeholder="Calle, número, ciudad"
                          value={draftProfile.address}
                          onChange={(e) => setDraftProfile({ ...draftProfile, address: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Nombre de la Escuela", value: profile.name, placeholder: "Sin configurar" },
                      { label: "Teléfono", value: profile.phone, placeholder: "Sin configurar" },
                      { label: "Correo de Contacto", value: profile.email, placeholder: "Sin configurar" },
                      { label: "Dirección", value: profile.address, placeholder: "Sin configurar" },
                    ].map((field) => (
                      <div key={field.label}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {field.label}
                        </p>
                        <p className={`text-sm font-medium ${field.value ? "text-gray-900" : "text-gray-400 italic"}`}>
                          {field.value || field.placeholder}
                        </p>
                      </div>
                    ))}

                    {!profile.name && !profile.phone && !profile.address && !profile.email && (
                      <div className="md:col-span-2 mt-2 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
                        <p className="text-sm text-gray-500 mb-2">
                          No has configurado el perfil de tu escuela aún.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftProfile({ ...profile });
                            setIsEditingProfile(true);
                          }}
                          className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Configurar ahora →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* System Preferences Card */}
              <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-l-2xl" />

                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-amber-600 text-[22px]">tune</span>
                  Preferencias del Sistema
                </h3>

                <form onSubmit={handleSavePrefs} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Idioma
                      </label>
                      <select
                        value={prefs.language}
                        onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white cursor-pointer"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Moneda
                      </label>
                      <select
                        value={prefs.currency}
                        onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white cursor-pointer"
                      >
                        <option value="MXN">MXN ($)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="COP">COP ($)</option>
                        <option value="ARS">ARS ($)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Zona Horaria
                      </label>
                      <select
                        value={prefs.timezone}
                        onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white cursor-pointer"
                      >
                        <option value="America/Mexico_City">(GMT-06:00) Ciudad de México</option>
                        <option value="America/Bogota">(GMT-05:00) Bogotá, Lima, Quito</option>
                        <option value="America/Caracas">(GMT-04:00) Caracas</option>
                        <option value="America/Buenos_Aires">(GMT-03:00) Buenos Aires</option>
                        <option value="America/New_York">(GMT-05:00) Nueva York</option>
                        <option value="Europe/Madrid">(GMT+01:00) Madrid, París, Roma</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
                    >
                      {savedPrefs ? (
                        <>
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          Guardado
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          Guardar Preferencias
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Notifications Card */}
              <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 relative overflow-hidden">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-gray-500 text-[22px]">notifications_active</span>
                  Notificaciones
                </h3>

                <div className="flex flex-col divide-y divide-gray-100">
                  {(
                    [
                      {
                        key: "paymentReminders",
                        label: "Recordatorios de Pago",
                        desc: "Enviar email a alumnos con pagos pendientes.",
                      },
                      {
                        key: "attendanceAlerts",
                        label: "Alertas de Asistencia",
                        desc: "Notificar si un alumno falta a 3 clases seguidas.",
                      },
                      {
                        key: "newEnrollments",
                        label: "Nuevas Inscripciones",
                        desc: "Recibir email cuando se une un nuevo alumno.",
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="pr-4">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle
                        id={`toggle-${item.key}`}
                        checked={notifications[item.key]}
                        onChange={(v) =>
                          setNotifications({ ...notifications, [item.key]: v })
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Membership Plans Card */}
              <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 relative overflow-hidden flex-1">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-500 text-[22px]">card_membership</span>
                    Planes de Membresía
                  </h3>
                  <button
                    type="button"
                    onClick={openNewPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-red-800 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nuevo
                  </button>
                </div>

                {plans.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[24px]">card_membership</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">No hay planes configurados</p>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed max-w-xs">
                      Crea los planes de membresía que ofrecerá tu academia para asignarlos a tus alumnos.
                    </p>
                    <button
                      type="button"
                      onClick={openNewPlan}
                      className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Crear primer plan →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between bg-gray-50/70 border border-gray-200 px-4 py-3 rounded-xl hover:shadow-xs transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-8 rounded-full ${plan.colorClass}`} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                            <p className="text-xs text-gray-500">{plan.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-gray-900">
                            ${plan.price.toLocaleString("es-MX")}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEditPlan(plan)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar plan"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar plan"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Modal: Plan de Membresía */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">card_membership</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingPlan ? "Editar Plan" : "Nuevo Plan de Membresía"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editingPlan ? "Modifica los detalles del plan." : "Define nombre, precio y descripción."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Plan Mensual Adultos"
                    value={formPlanName}
                    onChange={(e) => setFormPlanName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Descripción
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 3 clases por semana, acceso al tatami"
                    value={formPlanDesc}
                    onChange={(e) => setFormPlanDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Precio ($/mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={formPlanPrice}
                    onChange={(e) => setFormPlanPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Color del Plan
                  </label>
                  <div className="flex gap-2">
                    {planColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormPlanColor(color.value)}
                        title={color.label}
                        className={`w-8 h-8 rounded-full ${color.value} transition-all cursor-pointer ${
                          formPlanColor === color.value
                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                            : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
                  >
                    {editingPlan ? "Guardar Cambios" : "Crear Plan"}
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
