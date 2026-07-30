import {
  Download,
  KeyRound,
  LogOut,
  Radio,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { ChangePasswordForm } from "../../auth/components/ChangePasswordForm";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";
import { usePwa } from "../../../pwa/service-worker/PwaProvider";

export function SettingsPage() {
  const { user, logout, isOfflineSession } = useAuth();
  const { isOnline, status, checkConnectivity } = useNetwork();
  const { canInstall, install, isInstalled } = usePwa();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  return (
    <div className="page-stack settings-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span /> Preferencias</p>
          <h1>Configuración</h1>
          <p>Información de la cuenta y estado básico de la aplicación.</p>
        </div>
      </header>
      <section className="settings-grid">
        <article
          className={`settings-card glass ${
            !isOnline ? "settings-card-with-action" : ""
          }`}
        >
          <UserRound aria-hidden="true" />
          <div>
            <span className="micro-label">Usuario</span>
            <h2>{user?.displayName}</h2>
            <p>{user?.email}</p>
          </div>
        </article>
        <article
          className={`settings-card glass ${
            canInstall && !isInstalled ? "settings-card-with-action" : ""
          }`}
        >
          <Radio aria-hidden="true" />
          <div>
            <span className="micro-label">Conexión</span>
            <h2>{isOnline ? "En línea" : "Sin conexión"}</h2>
            <p>
              {isOnline
                ? "La API está disponible para sincronizar cambios."
                : isOfflineSession
                  ? "Sesión local activa. Las operaciones de escritura están bloqueadas."
                  : "Las operaciones requieren recuperar la conexión."}
            </p>
          </div>
          <span
            className={`connection-pill ${isOnline ? "online" : "offline"}`}
            role="status"
          >
            {isOnline ? "En línea" : "Sin conexión"}
          </span>
          {!isOnline && (
            <button
              className="text-link connectivity-check"
              disabled={status === "checking"}
              onClick={() => void checkConnectivity()}
              type="button"
            >
              Verificar conexión
            </button>
          )}
        </article>
        <article className="settings-card glass">
          <Smartphone aria-hidden="true" />
          <div>
            <span className="micro-label">Aplicación</span>
            <h2>Gear List</h2>
            <p>
              {isInstalled
                ? "Instalada como aplicación y preparada para lectura sin conexión."
                : canInstall
                  ? "Este dispositivo permite instalar la aplicación."
                  : "Usa la opción Instalar aplicación de tu navegador cuando esté disponible."}
            </p>
          </div>
          {canInstall && !isInstalled && (
            <button
              className="button button-secondary settings-card-action"
              onClick={() => void install()}
              type="button"
            >
              <Download aria-hidden="true" /> Instalar
            </button>
          )}
        </article>
        <article className="settings-card settings-card-with-action glass">
          <KeyRound aria-hidden="true" />
          <div>
            <span className="micro-label">Seguridad</span>
            <h2>Contraseña</h2>
            <p>
              Actualiza tu clave y cierra las sesiones abiertas en otros
              dispositivos.
            </p>
          </div>
          <button
            className="button button-secondary settings-card-action"
            disabled={!isOnline || isOfflineSession}
            onClick={() => setIsChangingPassword(true)}
            title={
              !isOnline || isOfflineSession
                ? "Esta acción requiere conexión."
                : undefined
            }
            type="button"
          >
            Cambiar contraseña
          </button>
        </article>
      </section>
      <button className="button button-danger logout-button" onClick={() => void logout()} type="button">
        <LogOut aria-hidden="true" /> Cerrar sesión
      </button>
      {isChangingPassword && (
        <ChangePasswordForm onClose={() => setIsChangingPassword(false)} />
      )}
    </div>
  );
}
