export const gearItemKeys = {
  all: ["gear-items"] as const,
  list: (listId: string) => [...gearItemKeys.all, "list", listId] as const,
};
