import { Download, RefreshCw, X } from "lucide-react";
import { usePwa } from "./PwaProvider";

export function PwaNotices() {
  const {
    offlineReady,
    needRefresh,
    applyUpdate,
    dismissOfflineReady,
    dismissUpdate,
  } = usePwa();

  if (!offlineReady && !needRefresh) {
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
      {needRefresh && (
        <div className="pwa-notice glass" role="status">
          <RefreshCw aria-hidden="true" />
          <span>
            <strong>Nueva versión disponible</strong>
            Actualiza cuando estés listo para aplicar los cambios.
          </span>
          <div className="pwa-notice-actions">
            <button
              className="text-link"
              onClick={() => void applyUpdate()}
              type="button"
            >
              Actualizar
            </button>
            <button
              aria-label="Más tarde"
              className="mini-action"
              onClick={dismissUpdate}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
