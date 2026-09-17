import { Download, X } from "lucide-react";
import { usePwa } from "./PwaProvider";

export function PwaNotices() {
  const { offlineReady, dismissOfflineReady } = usePwa();

  if (!offlineReady) {
    return null;
  }

  return (
    <div className="pwa-notices" aria-live="polite">
      {offlineReady && (
        <div className="pwa-notice glass" role="status">
          <Download aria-hidden="true" />
          <span>
            <strong>Lista para usar sin conexión</strong>
            Los recursos básicos quedaron guardados en este dispositivo.
          </span>
          <button
            aria-label="Cerrar aviso"
            className="mini-action"
            onClick={dismissOfflineReady}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
