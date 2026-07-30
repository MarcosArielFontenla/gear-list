export const purchasePriorities = [1, 2, 3, 4] as const;

export type PurchasePriority = (typeof purchasePriorities)[number];

export const purchaseStatuses = [1, 2, 3, 4, 5] as const;
export type PurchaseStatus = (typeof purchaseStatuses)[number];

export const gearCategories = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
] as const;
export type GearCategory = (typeof gearCategories)[number];

export type GearItemListResponse = {
  id: string;
  gearListId: string;
  name: string;
  category: GearCategory;
  priority: PurchasePriority;
  status: PurchaseStatus;
  estimatedPrice: number | null;
  actualPrice: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  storeName: string | null;
  position: number;
  updatedAt: string;
  purchasedAt: string | null;
  version: string;
};

export type GearItemDetailResponse = GearItemListResponse & {
  description: string | null;
  notes: string | null;
  createdAt: string;
};

export type GearItemInput = {
  name: string;
  description: string | null;
  category: GearCategory;
  priority: PurchasePriority;
  status: PurchaseStatus;
  estimatedPrice: number | null;
  actualPrice: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  storeName: string | null;
  notes: string | null;
};

export type UpdateGearItemInput = GearItemInput & {
  version: string;
};

export type UpdateGearItemStatusInput = {
  status: PurchaseStatus;
  actualPrice: number | null;
  version: string;
};

export const categoryLabels: Record<GearCategory, string> = {
  1: "Arma primaria",
  2: "Arma secundaria",
  3: "Protección",
  4: "Indumentaria",
  5: "Equipo táctico",
  6: "Óptica",
  7: "Accesorio de arma",
  8: "Comunicación",
  9: "Mochila y guardado",
  10: "Mantenimiento",
  11: "Otro",
};

export const priorityLabels: Record<PurchasePriority, string> = {
  1: "Comprar ahora",
  2: "Comprar después",
  3: "Más adelante",
  4: "Algún día",
};

export const statusLabels: Record<PurchaseStatus, string> = {
  1: "Planificado",
  2: "Investigando",
  3: "Listo para comprar",
  4: "Comprado",
  5: "Cancelado",
};

export type ReorderGearItemRequest = {
  itemId: string;
  priority: PurchasePriority;
  position: number;
  version: string;
};

export type ReorderGearItemsRequest = {
  items: ReorderGearItemRequest[];
};

export type ReorderGearItemsResponse = {
  items: GearItemListResponse[];
};
