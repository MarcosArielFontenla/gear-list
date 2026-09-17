import { useConfirm } from "../../../shared/components/ConfirmProvider";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { ErrorState, LoadingState } from "../../../shared/components/QueryState";
import { formatCurrency } from "../../../shared/lib/formatters";
import { useAuth } from "../../auth/AuthProvider";
import { useGearListSummary } from "../../dashboard/hooks/useDashboard";
import { GearItemForm } from "../../gear-items/components/GearItemForm";
import { GearItemsBoard } from "../../gear-items/components/GearItemsBoard";
import { useGearItemMutations, useGearItems } from "../../gear-items/hooks/useGearItems";
import { useReorderGearItems } from "../../gear-items/hooks/useReorderGearItems";
import type { GearItemListResponse } from "../../gear-items/types";
import { useGearList } from "../hooks/useGearLists";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";
import { getOfflineQueryErrorMessage } from "../../../pwa/offline/offlineQuery";
import { OperationFeedback } from "../../../shared/components/OperationFeedback";

export function GearListDetailPage() {
  const confirm = useConfirm();
  const { listId = "" } = useParams();
  const { accessToken } = useAuth();
  const { isOnline } = useNetwork();
  const list = useGearList(listId);
  const items = useGearItems(listId);
  const summary = useGearListSummary(listId);
  const reorder = useReorderGearItems(listId, accessToken!);
  const { remove } = useGearItemMutations(listId);
  const [editingItemId, setEditingItemId] = useState<string | null | "new">(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  if (list.isPending || items.isPending || summary.isPending) {
    return <LoadingState label="Preparando la lista..." />;
  }

  if (list.isError || items.isError || summary.isError) {
    return (
      <ErrorState
        message={getOfflineQueryErrorMessage(
          list.error ?? items.error ?? summary.error,
          "No pudimos cargar esta lista o ya no está disponible.",
        )}
        onRetry={() => {
          void list.refetch();
          void items.refetch();
          void summary.refetch();
        }}
      />
    );
  }

  const handleDelete = async (item: GearItemListResponse) => {
    if (!await confirm({ title: "¿Eliminar accesorio?", description: `Vas a eliminar “${item.name}” definitivamente. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar accesorio", intent: "delete" })) {
      return;
    }
    setFeedback(null);
    try {
      await remove.mutateAsync(item.id);
      setFeedback({ message: "Accesorio eliminado.", tone: "success" });
    } catch (error) {
      setFeedback({ message: getApiErrorMessage(error), tone: "error" });
    }
  };

  return (
    <div className="page-stack detail-page">
      <Link className="back-link" to="/lists"><ArrowLeft /> Volver a listas</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span /> Cola de compra</p>
          <h1>{list.data.name}</h1>
          <p>{list.data.description || "Sin descripción."}</p>
        </div>
        <button
          className="button button-primary"
          disabled={!isOnline}
          onClick={() => setEditingItemId("new")}
          title={!isOnline ? "Esta acción requiere conexión." : undefined}
          type="button"
        >
          <Plus aria-hidden="true" /> Nuevo accesorio
        </button>
      </header>

      <section className="summary-strip glass" aria-label="Resumen de lista">
        <div><span>Accesorios</span><strong>{summary.data.itemCount}</strong></div>
        <div><span>Pendientes</span><strong>{summary.data.pendingItemCount}</strong></div>
        <div><span>Comprados</span><strong>{summary.data.purchasedItemCount}</strong></div>
        <div><span>Comprar ahora</span><strong>{formatCurrency(summary.data.buyNowEstimated)}</strong></div>
        <div><span>Gasto real</span><strong>{formatCurrency(summary.data.actualSpent)}</strong></div>
      </section>
      {feedback && <OperationFeedback {...feedback} />}

      {items.data.length === 0 ? (
        <div className="empty-state compact">
          <h2>La cola está vacía</h2>
          <p>Agrega el primer accesorio y asígnale una prioridad.</p>
          <button
            className="button button-primary"
            disabled={!isOnline}
            onClick={() => setEditingItemId("new")}
            type="button"
          >
            Crear accesorio
          </button>
        </div>
      ) : (
        <GearItemsBoard
          initialItems={items.data}
          isSaving={reorder.isPending || !isOnline}
          onDelete={isOnline ? (item) => void handleDelete(item) : undefined}
          onEdit={isOnline ? setEditingItemId : undefined}
          onReorder={(next) =>
            reorder.mutateAsync({ items: next }).then((result) => result.items)
          }
        />
      )}

      {editingItemId && (
        <GearItemForm
          itemId={editingItemId === "new" ? null : editingItemId}
          listId={listId}
          onClose={() => setEditingItemId(null)}
        />
      )}
    </div>
  );
}
