import {
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { Brand } from "../../shared/components/Brand";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { useTheme } from "../../shared/theme/ThemeProvider";
import { NetworkNotices } from "../../pwa/offline/NetworkNotices";

const links = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/lists", label: "Listas", icon: ListChecks, end: false },
  { to: "/purchased", label: "Compras", icon: History, end: false },
  { to: "/settings", label: "Ajustes", icon: Settings, end: false },
] as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="application-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <div className="grain" aria-hidden="true" />
      <NetworkNotices />
      <aside className="app-sidebar">
        <Brand />
        <nav aria-label="Navegación principal">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
              end={end}
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="avatar" aria-hidden="true">
            {user?.displayName.charAt(0).toUpperCase()}
          </span>
          <div className="account-copy">
            <strong>{user?.displayName}</strong>
            <span>{user?.email}</span>
          </div>
          <button
            aria-label="Cerrar sesión"
            className="icon-button"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="app-column">
        <header className="mobile-header glass">
          <Brand />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <header className="desktop-tools">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <main className="app-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <nav className="mobile-nav glass" aria-label="Navegación móvil">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }) => (isActive ? "active" : "")}
              end={end}
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
