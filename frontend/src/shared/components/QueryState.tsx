import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useId } from "react";

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="query-state"
      role="status"
    >
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "No pudimos cargar esta vista",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="query-state query-error"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button
          className="button button-secondary"
          onClick={onRetry}
          type="button"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <div aria-labelledby={titleId} className="empty-state" role="region">
      <span className="empty-mark" aria-hidden="true" />
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
