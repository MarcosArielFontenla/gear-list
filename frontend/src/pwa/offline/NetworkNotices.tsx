import { CloudOff, CloudSun, X } from "lucide-react";
import { useNetwork } from "./NetworkProvider";

export function NetworkNotices() {
  const { status, reconnected, dismissReconnected } = useNetwork();

  return (
    <div className="network-notices" aria-live="polite">
      {status === "offline" && (
        <div className="network-banner offline" role="status">
          <CloudOff aria-hidden="true" />
          <span>
            <strong>Sin conexión</strong>
            Mostrando datos guardados sin conexión. Las escrituras están bloqueadas.
          </span>
        </div>
      )}
      {reconnected && (
        <div className="network-banner reconnected" role="status">
          <CloudSun aria-hidden="true" />
          <span>
            <strong>Conexión recuperada</strong>
            Actualizando los datos desde la API.
          </span>
          <button
            aria-label="Cerrar aviso"
            className="mini-action"
            onClick={dismissReconnected}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
