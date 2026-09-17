import { PhotoEditor } from "./PhotoEditor";
import { useGearItemPhotos, type PhotoDraft } from "../hooks/useGearItemPhotos";
import { useConfirm } from "../../../shared/components/ConfirmProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { Modal } from "../../../shared/components/Modal";
import { ErrorState, LoadingState } from "../../../shared/components/QueryState";
import { useGearItem, useGearItemMutations } from "../hooks/useGearItems";
import {
  categoryLabels,
  gearCategories,
  priorityLabels,
  purchasePriorities,
  purchaseStatuses,
  statusLabels,
  type GearCategory,
  type GearItemInput,
  type PurchasePriority,
  type PurchaseStatus,
} from "../types";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^https?:\/\/.+/i.test(value),
    "Usa una URL HTTP o HTTPS válida.",
  );
const price = z
  .string()
  .refine(
    (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
    "Ingresa un importe mayor o igual a cero.",
  );
const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
  description: z.string().trim().max(2000),
  category: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]),
  priority: z.enum(["1", "2", "3", "4"]),
  status: z.enum(["1", "2", "3", "4", "5"]),
  estimatedPrice: price,
  actualPrice: price,
  productUrl: optionalUrl,
  imageUrl: optionalUrl,
  storeName: z.string().trim().max(120),
  notes: z.string().trim().max(4000),
});

type Values = z.infer<typeof schema>;

const emptyValues: Values = {
  name: "",
  description: "",
  category: "11",
  priority: "1",
  status: "1",
  estimatedPrice: "",
  actualPrice: "",
  productUrl: "",
  imageUrl: "",
  storeName: "",
  notes: "",
};

export function GearItemForm({
  listId,
  itemId,
  onClose,
}: {
  listId: string;
  itemId: string | null;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const item = useGearItem(listId, itemId);
  const photoQuery = useGearItemPhotos(listId, itemId, Boolean(item.data?.photoCount));
  const [photos, setPhotos] = useState<PhotoDraft[] | null>(itemId ? null : []);
  const initialized = useRef(false);
  const mutations = useGearItemMutations(listId);
  const { isOnline } = useNetwork();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!item.data) {
      reset(emptyValues);
      return;
    }

    if (initialized.current) return;
    initialized.current = true;
    reset({
      name: item.data.name,
      description: item.data.description ?? "",
      category: String(item.data.category) as Values["category"],
      priority: String(item.data.priority) as Values["priority"],
      status: String(item.data.status) as Values["status"],
      estimatedPrice: item.data.estimatedPrice?.toString() ?? "",
      actualPrice: item.data.actualPrice?.toString() ?? "",
      productUrl: item.data.productUrl ?? "",
      imageUrl: item.data.imageUrl ?? "",
      storeName: item.data.storeName ?? "",
      notes: item.data.notes ?? "",
    });
  }, [item.data, reset]);

  useEffect(() => {
    if (photos !== null || !item.data) return;
    if (item.data.photoCount && !photoQuery.data) return;
    setPhotos([
      ...(photoQuery.data ?? []).map(photo => ({ id: photo.id, url: photo.thumbnailUrl })),
      ...(item.data.imageUrl ? [{ id: "legacy", url: item.data.imageUrl }] : []),
    ]);
  }, [photos, item.data, photoQuery.data]);

  const selectedStatus = Number(watch("status")) as PurchaseStatus;
  const isSaving =
    isSubmitting ||
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.saveWithPhotos.isPending;
  const onSubmit = handleSubmit(async (values) => {
    if (photos === null) return;
    const input: GearItemInput = {
      name: values.name,
      description: toNullable(values.description),
      category: Number(values.category) as GearCategory,
      priority: Number(values.priority) as PurchasePriority,
      status: Number(values.status) as PurchaseStatus,
      estimatedPrice: toPrice(values.estimatedPrice),
      actualPrice: toPrice(values.actualPrice),
      productUrl: toNullable(values.productUrl),
      imageUrl: photos.some(photo => photo.id === "legacy") ? toNullable(values.imageUrl) : null,
      storeName: toNullable(values.storeName),
      notes: toNullable(values.notes),
    };

    if (
      input.status === 4 &&
      item.data?.status !== 4 &&
      !await confirm({ title: "¿Confirmar compra?", description: `“${input.name}” se marcará como comprado y se registrará en tu historial.`, confirmLabel: "Confirmar compra", intent: "purchase" })
    ) {
      return;
    }

    setApiError(null);
    try {
      if (photos.length > 0 || item.data?.photoCount || item.data?.imageUrl) {
        await mutations.saveWithPhotos.mutateAsync({ itemId, photos, input: itemId && item.data ? { ...input, version: item.data.version } : input });
      } else if (itemId && item.data) {
        await mutations.update.mutateAsync({
          itemId,
          input: { ...input, version: item.data.version },
        });
      } else {
        await mutations.create.mutateAsync(input);
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

  return (
    <Modal
      title={itemId ? "Editar accesorio" : "Nuevo accesorio"}
      description="Define el producto, su prioridad y el estado de compra."
      onClose={() => { if (!isSaving) onClose(); }}
    >
      {itemId && item.isPending ? (
        <LoadingState label="Cargando accesorio..." />
      ) : itemId && item.isError ? (
        <ErrorState
          message="No pudimos cargar el accesorio."
          onRetry={() => void item.refetch()}
        />
      ) : (
        <form
          aria-busy={isSaving}
          className="form-stack"
          onSubmit={onSubmit}
          noValidate
        >
          {apiError && <p className="form-alert" role="alert">{apiError}</p>}
          <div className="form-grid">
            <label className="field field-span-2">
              <span>Nombre</span>
              <input
                aria-describedby={errors.name ? "gear-item-name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                autoFocus
                {...register("name")}
              />
              {errors.name && <small id="gear-item-name-error" role="alert">{errors.name.message}</small>}
            </label>
            <label className="field field-span-2">
              <span>Descripción</span>
              <textarea
                aria-describedby={errors.description ? "gear-item-description-error" : undefined}
                aria-invalid={Boolean(errors.description)}
                rows={3}
                {...register("description")}
              />
              {errors.description && <small id="gear-item-description-error" role="alert">{errors.description.message}</small>}
            </label>
            <label className="field">
              <span>Categoría</span>
              <select {...register("category")}>
                {gearCategories.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridad</span>
              <select {...register("priority")}>
                {purchasePriorities.map((value) => (
                  <option key={value} value={value}>{priorityLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Estado</span>
              <select {...register("status")}>
                {purchaseStatuses.map((value) => (
                  <option key={value} value={value}>{statusLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Precio estimado</span>
              <input
                aria-describedby={errors.estimatedPrice ? "gear-item-estimated-price-error" : undefined}
                aria-invalid={Boolean(errors.estimatedPrice)}
                inputMode="decimal"
                placeholder="0.00"
                {...register("estimatedPrice")}
              />
              {errors.estimatedPrice && <small id="gear-item-estimated-price-error" role="alert">{errors.estimatedPrice.message}</small>}
            </label>
            {selectedStatus === 4 && (
              <label className="field field-purchased">
                <span>Precio real</span>
                <input
                  aria-describedby={errors.actualPrice ? "gear-item-actual-price-error" : undefined}
                  aria-invalid={Boolean(errors.actualPrice)}
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("actualPrice")}
                />
                {errors.actualPrice && <small id="gear-item-actual-price-error" role="alert">{errors.actualPrice.message}</small>}
              </label>
            )}
            <label className="field">
              <span>Tienda</span>
              <input {...register("storeName")} />
            </label>
            <label className="field field-span-2">
              <span>URL del producto</span>
              <input
                aria-describedby={errors.productUrl ? "gear-item-product-url-error" : undefined}
                aria-invalid={Boolean(errors.productUrl)}
                inputMode="url"
                placeholder="https://..."
                type="url"
                {...register("productUrl")}
              />
              {errors.productUrl && <small id="gear-item-product-url-error" role="alert">{errors.productUrl.message}</small>}
            </label>
            {photos !== null ? <PhotoEditor photos={photos} onChange={setPhotos} disabled={isSaving || !isOnline} />
              : photoQuery.isError ? <div className="field-span-2"><ErrorState message="No pudimos cargar las fotos. Reintenta antes de guardar."
                onRetry={() => void photoQuery.refetch()} /></div>
              : <p className="field-span-2" role="status">Cargando fotos...</p>}
            <label className="field field-span-2">
              <span>Notas</span>
              <textarea rows={3} {...register("notes")} />
            </label>
          </div>
          <div className="form-actions">
            <button className="button button-secondary" disabled={isSaving} onClick={onClose} type="button">
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={!isOnline || isSaving || photos === null}
              title={!isOnline ? "Esta acción requiere conexión." : undefined}
              type="submit"
            >
              {isSaving ? "Guardando..." : "Guardar accesorio"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function toNullable(value: string) {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function toPrice(value: string) {
  return value === "" ? null : Number(value);
}
