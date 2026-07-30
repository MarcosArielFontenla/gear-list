export type GearList = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  purchasedItemCount: number;
  totalEstimated: number;
  updatedAt: string;
};

export type GearListDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GearListInput = {
  name: string;
  description?: string | null;
};
