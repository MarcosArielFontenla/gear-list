import { useEffect } from "react";

const blockers = new Set<symbol>();
export function updatesBlocked() { return blockers.size > 0; }
export function blockUpdates() {
  const key = Symbol();
  blockers.add(key);
  return () => {
    blockers.delete(key);
    window.dispatchEvent(new Event("app-update-ready"));
  };
}
export function useUpdateBlocker(active = true) {
  useEffect(() => active ? blockUpdates() : undefined, [active]);
}
