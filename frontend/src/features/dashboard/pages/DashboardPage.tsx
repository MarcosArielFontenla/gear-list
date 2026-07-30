import {
  ArrowRight,
  CheckCheck,
  CircleDollarSign,
  ListChecks,
  PackageOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../../../shared/components/QueryState";
import { formatCurrency, formatDate } from "../../../shared/lib/formatters";
import { useAuth } from "../../auth/AuthProvider";
import { useDashboardSummary } from "../hooks/useDashboard";
import { getOfflineQueryErrorMessage } from "../../../pwa/offline/offlineQuery";

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useDashboardSummary();

  if (summary.isPending) {
    return <LoadingState label="Preparando tu resumen..." />;
  }

  if (summary.isError) {
    return (
      <ErrorState
        message={getOfflineQueryErrorMessage(
          summary.error,
          "No pudimos cargar el resumen de tu equipo.",
        )}
        onRetry={() => void summary.refetch()}
      />
    );
  }

  const data = summary.data;
  const stats = [
    { label: "Listas activas", value: data.listCount, icon: ListChecks },
    { label: "Pendientes", value: data.pendingItemCount, icon: PackageOpen },
    { label: "Comprados", value: data.purchasedItemCount, icon: CheckCheck },
    {
      label: "Total estimado",
      value: formatCurrency(data.totalEstimated),
      icon: CircleDollarSign,
      className: "metric-card-currency",
    },
  ];

  return (
    <div className="page-stack">
      <section className="page-hero dashboard-hero">
        <div>
          <p className="eyebrow"><span /> Resumen operativo</p>
          <h1>Hola, {user?.displayName.split(" ")[0]}.</h1>
          <p>Tu próxima decisión y el estado de cada lista, de un vistazo.</p>
        </div>
        <Link className="button button-primary" to="/lists">
          Ver listas <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className="metric-grid" aria-label="Resumen">
        {stats.map(({ label, value, icon: Icon, className }) => (
          <article
            className={`metric-card glass${className ? ` ${className}` : ""}`}
            key={label}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="next-card glass">
          <p className="micro-label">Próxima compra</p>
          {data.nextPurchase ? (
            <>
              <h2>{data.nextPurchase.name}</h2>
              <p>
                {data.nextPurchase.gearListName}
                {data.nextPurchase.storeName
                  ? ` · ${data.nextPurchase.storeName}`
                  : ""}
              </p>
              <strong>{formatCurrency(data.nextPurchase.estimatedPrice)}</strong>
              <Link
                className="text-link"
                to={`/lists/${data.nextPurchase.gearListId}`}
              >
                Abrir cola <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <h2>Cola despejada</h2>
              <p>Agrega un accesorio pendiente para definir el siguiente paso.</p>
              <Link className="text-link" to="/lists">Ir a listas</Link>
            </>
          )}
        </article>

        <section className="recent-panel">
          <div className="section-title-row">
            <div>
              <p className="micro-label">Actividad reciente</p>
              <h2>Listas actualizadas</h2>
            </div>
            <Link className="text-link" to="/lists">Ver todas</Link>
          </div>
          <div className="recent-list">
            {data.recentLists.length === 0 && (
              <p className="muted">Todavía no creaste listas.</p>
            )}
            {data.recentLists.map((list) => (
              <Link className="recent-row glass" key={list.id} to={`/lists/${list.id}`}>
                <div>
                  <strong>{list.name}</strong>
                  <span>Actualizada {formatDate(list.updatedAt)}</span>
                </div>
                <div>
                  <span>{list.purchasedItemCount}/{list.itemCount} comprados</span>
                  <strong>{formatCurrency(list.totalEstimated)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
