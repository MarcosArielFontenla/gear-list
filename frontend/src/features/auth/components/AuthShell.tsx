import type { PropsWithChildren } from "react";
import { Brand } from "../../../shared/components/Brand";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import { useTheme } from "../../../shared/theme/ThemeProvider";

export function AuthShell({ children }: PropsWithChildren) {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="auth-page" id="main-content" tabIndex={-1}>
      <a className="skip-link" href="#auth-form">Saltar al formulario</a>
      <div className="grain" aria-hidden="true" />
      <header className="auth-header">
        <Brand />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <section className="auth-grid">
        <div className="auth-intro">
          <p className="eyebrow"><span /> Espacio de planificación</p>
          <h1>
            Tu equipo.
            <br />
            <em>En el orden correcto.</em>
          </h1>
          <p>
            Planifica cada compra, protege el presupuesto y mantén una cola
            clara desde cualquier dispositivo.
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}
