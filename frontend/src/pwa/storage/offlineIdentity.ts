const identityKey = "loadout-queue-offline-identity";

export type OfflineIdentity = {
  id: string;
  displayName: string;
  email: string;
};

export function saveOfflineIdentity(identity: OfflineIdentity) {
  try {
    localStorage.setItem(identityKey, JSON.stringify(identity));
  } catch {
    // A storage-restricted browser can still use the online session.
  }
}

export function getOfflineIdentity(): OfflineIdentity | null {
  let stored: string | null;

  try {
    stored = localStorage.getItem(identityKey);
  } catch {
    return null;
  }

  if (!stored) {
    return null;
  }

  try {
    const identity = JSON.parse(stored) as Partial<OfflineIdentity>;
    return identity.id && identity.displayName && identity.email
      ? (identity as OfflineIdentity)
      : null;
  } catch {
    return null;
  }
}

export function clearOfflineIdentity() {
  try {
    localStorage.removeItem(identityKey);
  } catch {
    // Local logout still continues if browser storage is unavailable.
  }
}
