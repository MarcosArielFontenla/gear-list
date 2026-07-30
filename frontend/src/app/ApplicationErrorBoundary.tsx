import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type PropsWithChildren } from "react";

type ApplicationErrorBoundaryState = {
  hasError: boolean;
};

export class ApplicationErrorBoundary extends Component<
  PropsWithChildren,
  ApplicationErrorBoundaryState
> {
  public state: ApplicationErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ApplicationErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The application failed to render.", error, info);
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="fatal-error-page" id="main-content" tabIndex={-1}>
        <section className="fatal-error-card glass" role="alert">
          <span className="fatal-error-icon" aria-hidden="true">
            <AlertTriangle />
          </span>
          <p className="eyebrow">Error inesperado</p>
          <h1>No pudimos mostrar la aplicación</h1>
          <p>
            Tus datos guardados no fueron modificados. Recarga la página para
            volver a intentarlo.
          </p>
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            <RefreshCw aria-hidden="true" /> Recargar aplicación
          </button>
        </section>
      </main>
    );
  }
}
