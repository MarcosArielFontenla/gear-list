import { Crosshair } from "lucide-react";

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Ir al inicio de Gear List">
      <span className="brand-mark" aria-hidden="true">
        <Crosshair />
      </span>
      <span>Gear List</span>
    </a>
  );
}
