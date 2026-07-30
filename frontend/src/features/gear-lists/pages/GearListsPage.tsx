import { Archive, ArrowRight, Edit3, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/QueryState";
import { formatCurrency, formatDate } from "../../../shared/lib/formatters";
import { GearListForm } from "../components/GearListForm";
import { useGearListMutations, useGearLists } from "../hooks/useGearLists";
import type { GearList } from "../types";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";
import { getOfflineQueryErrorMessage } from "../../../pwa/offline/offlineQuery";
import { OperationFeedback } from "../../../shared/components/OperationFeedback";

export function GearListsPage() {
  const lists = useGearLists();
  const { archive } = useGearListMutations();
  const { isOnline } = useNetwork();
  const [editing, setEditing] = useState<GearList | "new" | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const handleArchive = async (list: GearList) => {
    if (!window.confirm(`¿Archivar "${list.name}"?`)) {
      return;
    }
    setFeedback(null);
    try {
      await archive.mutateAsync(list.id);
      setFeedback({ message: "Lista archivada.", tone: "success" });
    } catch (error) {
      setFeedback({ message: getApiErrorMessage(error), tone: "error" });
    }
  };

  if (lists.isPending) {
    return <LoadingState label="Cargando listas..." />;
  }

  if (lists.isError) {
    return (
      <ErrorState
        message={getOfflineQueryErrorMessage(
          lists.error,
          "No pudimos cargar tus listas.",
        )}
        onRetry={() => void lists.refetch()}
      />
    );
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span /> Inventario planificado</p>
          <h1>Listas de equipo</h1>
          <p>Crea una cola separada para cada equipamiento u objetivo.</p>
        </div>
        <button
          className="button button-primary"
          disabled={!isOnline}
          onClick={() => setEditing("new")}
          title={!isOnline ? "Esta acción requiere conexión." : undefined}
          type="button"
        >
          <Plus aria-hidden="true" /> Nueva lista
        </button>
      </header>
      {feedback && <OperationFeedback {...feedback} />}

      {lists.data.length === 0 ? (
        <EmptyState
          title="Tu primera lista empieza acá"
          description="Agrupa accesorios y define qué comprar ahora, después o más adelante."
          action={
            <button
              className="button button-primary"
              disabled={!isOnline}
              onClick={() => setEditing("new")}
              type="button"
            >
              Crear lista
            </button>
          }
        />
      ) : (
        <section className="list-card-grid" aria-label="Listas de equipo">
          {lists.data.map((list) => (
            <article className="list-card glass" key={list.id}>
              <div className="list-card-head">
                <span className="micro-label">
                  {list.purchasedItemCount}/{list.itemCount} comprados
                </span>
                <div className="card-actions">
                  <button
                    aria-label={`Editar ${list.name}`}
                    className="icon-button"
                    disabled={!isOnline || archive.isPending}
                    onClick={() => setEditing(list)}
                    type="button"
                  >
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`Archivar ${list.name}`}
                    className="icon-button danger"
                    disabled={!isOnline || archive.isPending}
                    onClick={() => void handleArchive(list)}
                    type="button"
                  >
                    <Archive aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div>
                <h2>{list.name}</h2>
                <p>{list.description || "Sin descripción."}</p>
              </div>
              <dl className="list-card-stats">
                <div><dt>Accesorios</dt><dd>{list.itemCount}</dd></div>
                <div><dt>Estimado</dt><dd>{formatCurrency(list.totalEstimated)}</dd></div>
              </dl>
              <footer>
                <span>Actualizada {formatDate(list.updatedAt)}</span>
                <Link
                  className="button button-secondary list-card-open"
                  to={`/lists/${list.id}`}
                >
                  Abrir <ArrowRight aria-hidden="true" />
                </Link>
              </footer>
            </article>
          ))}
        </section>
      )}

      {editing && (
        <GearListForm
          list={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
