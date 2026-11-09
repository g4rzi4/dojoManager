export type EquipmentCategory = "UNIFORME" | "PROTECCION";

export type EquipmentRequestStatus =
  | "SOLICITADO"
  | "CONFIRMADO"
  | "REPORTADO"
  | "PAGADO"
  | "ENTREGADO"
  | "RECHAZADO";

export type EquipmentModel = {
  id: number;
  name: string;
  priceCents: number;
  brandName: string;
  url: string | null;
  isExample: boolean;
};

export type EquipmentProduct = {
  id: number;
  name: string;
  category: EquipmentCategory;
  sizes: string[];
  colors: string[];
  models: EquipmentModel[];
};

export type EquipmentRequestItem = {
  id: number;
  productName: string;
  brandName: string;
  modelName: string | null;
  size: string;
  color: string | null;
  priceCents: number | null;
};

export type EquipmentRequest = {
  id: number;
  status: EquipmentRequestStatus;
  amountCents: number | null;
  note: string | null;
  staffNote: string | null;
  method: import("./payment").PaymentMethod | null;
  createdAt: string;
  studentName: string;
  teacherName: string | null;
  requestedBy: string | null;
  items: EquipmentRequestItem[];
};

export type NewEquipmentItem = {
  productId: number;
  modelId?: number;
  customBrand?: string;
  size: string;
  color?: string;
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentRequestStatus, string> = {
  SOLICITADO: "Esperando al profesor",
  CONFIRMADO: "Por pagar",
  REPORTADO: "Por confirmar",
  PAGADO: "Pagado",
  ENTREGADO: "Entregado",
  RECHAZADO: "Rechazado",
};

export const EQUIPMENT_STATUS_STYLES: Record<EquipmentRequestStatus, string> = {
  SOLICITADO: "bg-amber-50 text-amber-900 border-amber-200",
  CONFIRMADO: "bg-violet-50 text-violet-800 border-violet-200",
  REPORTADO: "bg-sky-50 text-sky-800 border-sky-200",
  PAGADO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ENTREGADO: "bg-neutral-100 text-neutral-800 border-neutral-300",
  RECHAZADO: "bg-red-50 text-red-800 border-red-200",
};
