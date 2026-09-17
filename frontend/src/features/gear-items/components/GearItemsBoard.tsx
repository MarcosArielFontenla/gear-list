import { GearItemCover } from "./GearItemCover";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  GripVertical,
  PackageCheck,
  Store,
  Target,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../../shared/lib/formatters";
import type {
  GearItemListResponse,
  PurchasePriority,
  ReorderGearItemRequest,
} from "../types";
import {
  categoryLabels,
  priorityLabels,
  purchasePriorities,
  statusLabels,
} from "../types";

type GearItemsBoardProps = {
  initialItems: GearItemListResponse[];
  isSaving?: boolean;
  onReorder?: (
    items: ReorderGearItemRequest[],
  ) => Promise<GearItemListResponse[] | void>;
  onOpen?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onDelete?: (item: GearItemListResponse) => void;
};

const priorityDetails: Record<
  PurchasePriority,
  { code: string; tone: string }
> = {
  1: { code: "P1", tone: "ember" },
  2: { code: "P2", tone: "glacier" },
  3: { code: "P3", tone: "ice" },
  4: { code: "P4", tone: "slate" },
};

export function GearItemsBoard({
  initialItems,
  isSaving = false,
  onReorder,
  onEdit,
  onOpen,
  onDelete,
}: GearItemsBoardProps) {
  const [items, setItems] = useState(() => normalizePositions(initialItems));
  const [isPersisting, setIsPersisting] = useState(false);
  const [feedback, setFeedback] = useState(
    "Arrastra un accesorio o usa el teclado para reordenarlo.",
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setItems(normalizePositions(initialItems));
  }, [initialItems]);

  const getItemName = (id: UniqueIdentifier) =>
    items.find((item) => item.id === id)?.name ?? "accesorio";

  const handleDragStart = ({ active }: { active: { id: UniqueIdentifier } }) => {
    setFeedback(
      `${getItemName(active.id)} seleccionado. Usa las flechas para cambiar su posición.`,
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || isSaving || isPersisting) {
      setFeedback("Orden sin cambios.");
      return;
    }

    const targetPriority = getTargetPriority(over.data.current?.priority);

    if (!targetPriority) {
      return;
    }

    const previous = items;
    const next = reorderBoardItems(
      previous,
      active.id,
      over.id,
      targetPriority,
    );

    if (next === previous) {
      return;
    }

    setItems(next);

    if (!onReorder) {
      setFeedback("Orden local actualizado.");
      return;
    }

    setFeedback("Guardando orden...");
    setIsPersisting(true);
    void onReorder(toReorderRequest(next))
      .then((persisted) => {
        if (persisted) {
          setItems(normalizePositions(persisted));
        }
        setFeedback("Orden guardado.");
      })
      .catch(() => {
        setItems(previous);
        setFeedback(
          "El orden cambió en otra sesión. Recargando la versión actual.",
        );
      })
      .finally(() => {
        setIsPersisting(false);
      });
  };

  return (
    <>
      <p className="drag-feedback" aria-live="polite">
        {feedback}
      </p>
      <DndContext
        accessibility={{
          announcements: {
            onDragStart: ({ active }) =>
              `${getItemName(active.id)} seleccionado para reordenar.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${getItemName(active.id)} sobre una nueva posición.`
                : `${getItemName(active.id)} fuera de una zona de destino.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `${getItemName(active.id)} ubicado en su nueva posición.`
                : `Movimiento de ${getItemName(active.id)} cancelado.`,
            onDragCancel: ({ active }) =>
              `Movimiento de ${getItemName(active.id)} cancelado.`,
          },
          screenReaderInstructions: {
            draggable:
              "Para tomar un accesorio presiona Espacio. Muévelo con las flechas y confirma con Espacio. Presiona Escape para cancelar.",
          },
        }}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragCancel={() => setFeedback("Movimiento cancelado.")}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <div className="priority-grid">
          {purchasePriorities.map((priority) => (
            <PriorityLane
              disabled={isSaving || isPersisting}
              items={items.filter((item) => item.priority === priority)}
              key={priority}
              onDelete={onDelete}
              onOpen={onOpen}
              onEdit={onEdit}
              priority={priority}
            />
          ))}
        </div>
      </DndContext>
    </>
  );
}

type PriorityLaneProps = {
  disabled: boolean;
  items: GearItemListResponse[];
  priority: PurchasePriority;
  onOpen?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onDelete?: (item: GearItemListResponse) => void;
};

function PriorityLane({
  disabled,
  items,
  priority,
  onEdit,
  onOpen,
  onDelete,
}: PriorityLaneProps) {
  const details = priorityDetails[priority];
  const { isOver, setNodeRef } = useDroppable({
    id: `priority-${priority}`,
    data: { priority },
  });

  return (
    <article
      aria-labelledby={`priority-${priority}-title`}
      className={`priority-lane lane-${details.tone}${
        isOver ? " lane-over" : ""
      }`}
      ref={setNodeRef}
    >
      <header>
        <div>
          <span className="lane-code">{details.code}</span>
          <h3 id={`priority-${priority}-title`}>
            {priorityLabels[priority]}
          </h3>
        </div>
        <span className="count">{items.length}</span>
      </header>

      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="gear-card-list">
          {items.length === 0 && (
            <p className="lane-empty">
              No hay accesorios con esta prioridad.
            </p>
          )}
          {items.map((item) => (
            <SortableGearItem
              disabled={disabled}
              item={item}
              key={item.id}
              onDelete={onDelete}
              onOpen={onOpen}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>

      <div className="lane-track" aria-hidden="true">
        <span />
      </div>
    </article>
  );
}

type SortableGearItemProps = {
  disabled: boolean;
  item: GearItemListResponse;
  onOpen?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onDelete?: (item: GearItemListResponse) => void;
};

function SortableGearItem({
  disabled,
  item,
  onEdit,
  onOpen,
  onDelete,
}: SortableGearItemProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    data: { priority: item.priority },
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      aria-labelledby={`gear-item-${item.id}-title`}
      className={`gear-card${isDragging ? " gear-card-dragging" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      {onOpen ? <button className="gear-card-image gear-card-open-photo" type="button"
        aria-label={`Ver fotos de ${item.name}`} onClick={() => onOpen(item.id)}><GearItemCover item={item} /></button>
        : <div className="gear-card-image" aria-hidden="true"><GearItemCover item={item} /></div>}
      <div className="gear-card-copy">
        <span className="gear-card-topline">
          <span className="gear-icon" aria-hidden="true">
            {item.status === 4
              ? <CheckCircle2 />
              : item.priority === 1
                ? <Target />
                : <PackageCheck />}
          </span>
          <span className={`status-chip status-${item.status}`}>
            {statusLabels[item.status]}
          </span>
        </span>
        {onOpen ? <button className="gear-card-title gear-card-open-name" type="button"
          id={`gear-item-${item.id}-title`} onClick={() => onOpen(item.id)}>{item.name}</button>
          : <span className="gear-card-title" id={`gear-item-${item.id}-title`}>{item.name}</span>}
        <span className="gear-card-meta">
          {categoryLabels[item.category]}
        </span>
        {item.storeName && (
          <span className="gear-card-store">
            <Store aria-hidden="true" /> {item.storeName}
          </span>
        )}
        <span className="gear-card-price">
          <span>Precio estimado</span>
          <strong>{formatCurrency(item.estimatedPrice)}</strong>
        </span>
      </div>
      <div className="gear-card-actions">
        {item.productUrl && (
          <a
            aria-label={`Abrir producto ${item.name} en una nueva pestaña`}
            className="mini-action"
            href={item.productUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
          </a>
        )}
        {onEdit && (
          <button
            aria-label={`Editar ${item.name}`}
            className="mini-action"
            onClick={() => onEdit(item.id)}
            type="button"
          >
            <Edit3 aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            aria-label={`Eliminar ${item.name}`}
            className="mini-action danger"
            onClick={() => onDelete(item)}
            type="button"
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
        <button
          aria-label={`Reordenar ${item.name}`}
          className="mini-action drag-handle"
          disabled={disabled}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export function reorderBoardItems(
  items: GearItemListResponse[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  targetPriority: PurchasePriority,
): GearItemListResponse[] {
  const activeItem = items.find((item) => item.id === activeId);

  if (!activeItem) {
    return items;
  }

  if (activeItem.priority === targetPriority) {
    const laneItems = items
      .filter((item) => item.priority === targetPriority)
      .sort((left, right) => left.position - right.position);
    const oldIndex = laneItems.findIndex((item) => item.id === activeId);
    const overIndex = laneItems.findIndex((item) => item.id === overId);
    const newIndex = overIndex === -1 ? laneItems.length - 1 : overIndex;

    if (oldIndex === newIndex) {
      return items;
    }

    const reorderedLane = arrayMove(laneItems, oldIndex, newIndex).map(
      (item, position) => ({ ...item, position }),
    );
    return normalizePositions([
      ...items.filter((item) => item.priority !== targetPriority),
      ...reorderedLane,
    ]);
  }

  const remaining = items.filter((item) => item.id !== activeId);
  const targetItems = remaining
    .filter((item) => item.priority === targetPriority)
    .sort((left, right) => left.position - right.position);
  const overIndex = targetItems.findIndex((item) => item.id === overId);
  const insertionIndex = overIndex === -1 ? targetItems.length : overIndex;

  targetItems.splice(insertionIndex, 0, {
    ...activeItem,
    priority: targetPriority,
  });
  const positionedTargetItems = targetItems.map((item, position) => ({
    ...item,
    position,
  }));

  return normalizePositions([
    ...remaining.filter((item) => item.priority !== targetPriority),
    ...positionedTargetItems,
  ]);
}

function normalizePositions(
  items: GearItemListResponse[],
): GearItemListResponse[] {
  return purchasePriorities.flatMap((priority) =>
    items
      .filter((item) => item.priority === priority)
      .sort((left, right) => left.position - right.position)
      .map((item, position) => ({ ...item, position })),
  );
}

function toReorderRequest(
  items: GearItemListResponse[],
): ReorderGearItemRequest[] {
  return items.map((item) => ({
    itemId: item.id,
    priority: item.priority,
    position: item.position,
    version: item.version,
  }));
}

function getTargetPriority(value: unknown): PurchasePriority | null {
  return purchasePriorities.includes(value as PurchasePriority)
    ? (value as PurchasePriority)
    : null;
}
