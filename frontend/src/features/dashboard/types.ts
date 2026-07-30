export type NextPurchase = {
  id: string;
  gearListId: string;
  gearListName: string;
  name: string;
  category: number;
  estimatedPrice: number | null;
  storeName: string | null;
};

export type RecentGearList = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  purchasedItemCount: number;
  totalEstimated: number;
  updatedAt: string;
};

export type DashboardSummary = {
  listCount: number;
  pendingItemCount: number;
  purchasedItemCount: number;
  totalEstimated: number;
  nextPurchase: NextPurchase | null;
  recentLists: RecentGearList[];
};

export type GearListSummary = {
  gearListId: string;
  itemCount: number;
  pendingItemCount: number;
  purchasedItemCount: number;
  totalEstimated: number;
  buyNowEstimated: number;
  actualSpent: number;
  difference: number;
  nextPurchase: NextPurchase | null;
};

export type PurchasedItem = {
  id: string;
  gearListId: string;
  gearListName: string;
  name: string;
  category: number;
  estimatedPrice: number | null;
  actualPrice: number | null;
  difference: number;
  purchasedAt: string;
  storeName: string | null;
  productUrl: string | null;
};
