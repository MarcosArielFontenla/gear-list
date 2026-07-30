export const offlineCacheKeys = {
  dashboardSummary: "dashboard:summary",
  purchases: "dashboard:purchases",
  gearLists: "gear-lists:list",
  gearList: (listId: string) => `gear-lists:${listId}`,
  gearListSummary: (listId: string) => `gear-lists:${listId}:summary`,
  gearItems: (listId: string) => `gear-lists:${listId}:items`,
  gearItem: (listId: string, itemId: string) =>
    `gear-lists:${listId}:items:${itemId}`,
} as const;
