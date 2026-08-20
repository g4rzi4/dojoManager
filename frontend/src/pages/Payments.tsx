import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

type PaymentStatus = "paid" | "pending" | "overdue";

interface Payment {
  id: string;
  studentName: string;
  initials: string;
  plan: string;
  lastPayment: string;
  nextDue: string;
  amount: number;
  status: PaymentStatus;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formStudent, setFormStudent] = useState("");
  const [formPlan, setFormPlan] = useState("Adulto Ilimitado");
  const [formAmount, setFormAmount] = useState<number>(150);
  const [formStatus, setFormStatus] = useState<PaymentStatus>("paid");
  const [formLastPayment, setFormLastPayment] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formNextDue, setFormNextDue] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const pendingTotal = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueCount = payments.filter((p) => p.status === "overdue").length;

  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!formStudent.trim()) return;

    const initials = formStudent
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const newPayment: Payment = {
      id: Date.now().toString(),
      studentName: formStudent.trim(),
      initials,
      plan: formPlan,
      lastPayment: formLastPayment,
      nextDue: formNextDue,
      amount: Number(formAmount) || 0,
      status: formStatus,
    };

    setPayments([newPayment, ...payments]);
    setFormStudent("");
    setIsModalOpen(false);
  }

  function handleDeletePayment(id: string) {
    setPayments(payments.filter((p) => p.id !== id));
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusConfig: Record<
    PaymentStatus,
    { label: string; icon: string; className: string }
  > = {
    paid: {
      label: "PAGADO",
      icon: "check_circle",
      className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    },
    pending: {
      label: "PENDIENTE",
      icon: "schedule",
      className: "bg-amber-50 text-amber-800 border border-amber-200",
    },
    overdue: {
      label: "VENCIDO",
      icon: "error",
      className: "bg-red-50 text-red-700 border border-red-200",
    },
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 md:p-10 bg-[#f8fafc]">
        <div className="max-w-[1280px] mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Pagos y Membresías
              </h2>
              <p className="text-gray-500 text-base">
                Gestiona el seguimiento financiero y las suscripciones de los alumnos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-red-800 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_card</span>
              <span>Registrar Pago</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Ingresos del Mes
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ${totalRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">trending_up</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {payments.filter((p) => p.status === "paid").length} pagos confirmados
              </p>
            </div>

            {/* Pending */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 rounded-l-2xl" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Pagos Pendientes
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">{pendingCount}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                  <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Total:{" "}
                <span className="font-bold text-gray-800">
                  ${pendingTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            {/* Overdue */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 rounded-l-2xl" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Membresías Vencidas
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">{overdueCount}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined text-[22px]">warning</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {overdueCount === 0 ? "Sin vencimientos pendientes" : "Requieren atención inmediata"}
              </p>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50/60">
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por alumno o plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 sm:flex-none bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="paid">Pagados</option>
                  <option value="pending">Pendientes</option>
                  <option value="overdue">Vencidos</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-semibold">Alumno</th>
                    <th className="px-5 py-3.5 font-semibold">Plan de Membresía</th>
                    <th className="px-5 py-3.5 font-semibold">Último Pago</th>
                    <th className="px-5 py-3.5 font-semibold">Próximo Vencimiento</th>
                    <th className="px-5 py-3.5 font-semibold">Monto</th>
                    <th className="px-5 py-3.5 font-semibold">Estado</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="text-sm divide-y divide-gray-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="py-14 text-center flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-[28px]">payments</span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mb-1">
                            {payments.length === 0
                              ? "No hay pagos registrados aún"
                              : "No se encontraron pagos con los filtros actuales"}
                          </h4>
                          <p className="text-sm text-gray-500 max-w-md w-full mb-5 leading-relaxed">
                            {payments.length === 0
                              ? "Comienza registrando el primer pago o membresía de un alumno."
                              : "Intenta cambiar los filtros de estado o el término de búsqueda."}
                          </p>
                          {payments.length === 0 && (
                            <button
                              type="button"
                              onClick={() => setIsModalOpen(true)}
                              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-800 transition-all shadow-xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">add_card</span>
                              <span>Registrar Primer Pago</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const sc = statusConfig[payment.status];
                      return (
                        <tr
                          key={payment.id}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          {/* Student */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-red-50 text-primary border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {payment.initials}
                              </div>
                              <span className="font-semibold text-gray-900">
                                {payment.studentName}
                              </span>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-5 py-3.5 text-gray-500">{payment.plan}</td>

                          {/* Last Payment */}
                          <td className="px-5 py-3.5 text-gray-500">
                            {formatDate(payment.lastPayment)}
                          </td>

                          {/* Next Due */}
                          <td
                            className={`px-5 py-3.5 font-medium ${
                              payment.status === "overdue"
                                ? "text-red-600 font-bold"
                                : "text-gray-900"
                            }`}
                          >
                            {formatDate(payment.nextDue)}
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-3.5 font-semibold text-gray-900">
                            ${payment.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.className}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {sc.icon}
                              </span>
                              {sc.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1 text-gray-400">
                              <button
                                type="button"
                                className="p-1.5 hover:text-primary hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Generar recibo"
                              >
                                <span className="material-symbols-outlined text-[19px]">
                                  receipt_long
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[19px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
              <span>
                Mostrando {filteredPayments.length} de {payments.length} registros
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold"
                >
                  1
                </button>
                <button
                  type="button"
                  disabled
                  className="p-1 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Registrar Pago */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">add_card</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Registrar Pago</h3>
                    <p className="text-xs text-gray-500">
                      Asocia un pago o membresía a un alumno.
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

              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre del Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Martínez"
                    value={formStudent}
                    onChange={(e) => setFormStudent(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Plan de Membresía
                    </label>
                    <select
                      value={formPlan}
                      onChange={(e) => setFormPlan(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white"
                    >
                      <option value="Adulto Ilimitado">Adulto Ilimitado</option>
                      <option value="Kids Básico (2x/sem)">Kids Básico (2x/sem)</option>
                      <option value="Equipo Competición">Equipo Competición</option>
                      <option value="Plan Familiar (x3)">Plan Familiar (x3)</option>
                      <option value="Mensual Estándar">Mensual Estándar</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Monto ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Fecha de Pago
                    </label>
                    <input
                      type="date"
                      value={formLastPayment}
                      onChange={(e) => setFormLastPayment(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Próximo Vencimiento
                    </label>
                    <input
                      type="date"
                      value={formNextDue}
                      onChange={(e) => setFormNextDue(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Estado del Pago
                  </label>
                  <div className="flex gap-2">
                    {(["paid", "pending", "overdue"] as PaymentStatus[]).map((s) => {
                      const config = statusConfig[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormStatus(s)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            formStatus === s
                              ? config.className + " ring-2 ring-offset-1 ring-gray-300"
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {config.label}
                        </button>
                      );
                    })}
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
                    Guardar Pago
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
