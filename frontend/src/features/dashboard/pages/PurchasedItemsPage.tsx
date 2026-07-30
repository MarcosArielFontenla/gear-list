import { ExternalLink, ReceiptText } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/QueryState";
import { formatCurrency, formatDate } from "../../../shared/lib/formatters";
import { categoryLabels } from "../../gear-items/types";
import { usePurchasedItems } from "../hooks/useDashboard";
import { getOfflineQueryErrorMessage } from "../../../pwa/offline/offlineQuery";

export function PurchasedItemsPage() {
  const purchases = usePurchasedItems();

  if (purchases.isPending) {
    return <LoadingState label="Cargando historial..." />;
  }

  if (purchases.isError) {
    return (
      <ErrorState
        message={getOfflineQueryErrorMessage(
          purchases.error,
          "No pudimos cargar el historial de compras.",
        )}
        onRetry={() => void purchases.refetch()}
      />
    );
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span /> Registro de adquisiciones</p>
          <h1>Historial de compras</h1>
          <p>Compara lo estimado con el costo real de cada accesorio.</p>
        </div>
      </header>

      {purchases.data.length === 0 ? (
        <EmptyState
          title="Todavía no hay compras"
          description="Cuando cambies un accesorio a Comprado aparecerá en este historial."
        />
      ) : (
        <section className="purchase-list">
          {purchases.data.map((item) => (
            <article className="purchase-row glass" key={item.id}>
              <span className="purchase-icon"><ReceiptText /></span>
              <div className="purchase-main">
                <strong>{item.name}</strong>
                <span>
                  {categoryLabels[item.category as keyof typeof categoryLabels]} ·{" "}
                  {item.gearListName}
                </span>
              </div>
              <dl>
                <div><dt>Estimado</dt><dd>{formatCurrency(item.estimatedPrice)}</dd></div>
                <div><dt>Real</dt><dd>{formatCurrency(item.actualPrice)}</dd></div>
                <div>
                  <dt>Diferencia</dt>
                  <dd className={item.difference > 0 ? "over-budget" : "under-budget"}>
                    {formatCurrency(item.difference)}
                  </dd>
                </div>
              </dl>
              <div className="purchase-meta">
                <span>{formatDate(item.purchasedAt)}</span>
                <span>{item.storeName || "Tienda sin definir"}</span>
              </div>
              {item.productUrl && (
                <a
                  aria-label={`Abrir producto ${item.name} en una nueva pestaña`}
                  className="icon-button"
                  href={item.productUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" />
                </a>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
