import { ChevronLeft, ChevronRight, Expand, ExternalLink, ImageOff, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "../../../shared/components/Modal";
import { ErrorState, LoadingState } from "../../../shared/components/QueryState";
import { formatCurrency } from "../../../shared/lib/formatters";
import { useGearItem } from "../hooks/useGearItems";
import { useGearItemPhotos } from "../hooks/useGearItemPhotos";
import { categoryLabels, priorityLabels, statusLabels } from "../types";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

export function GearItemDetail({ listId, itemId, onClose, onEdit }: {
  listId: string; itemId: string; onClose: () => void; onEdit: () => void;
}) {
  const item = useGearItem(listId, itemId);
  const photos = useGearItemPhotos(listId, itemId, Boolean(item.data?.photoCount));
  const { isOnline } = useNetwork();
  const touchStart = useRef<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const gallery = [...(photos.data ?? []), ...(item.data?.imageUrl
    ? [{ id: "legacy", url: item.data.imageUrl, thumbnailUrl: item.data.imageUrl }] : [])];
  const index = Math.min(selected, Math.max(0, gallery.length - 1));
  const current = gallery[index];
  const move = (direction: number) => setSelected((index + direction + gallery.length) % gallery.length);
  const galleryContent = (large = false) => (
    <div className={`product-gallery${large ? " expanded" : ""}`}>
      <div className="product-photo-main"
        onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={event => {
          const end = event.changedTouches[0]?.clientX;
          if (touchStart.current !== null && end !== undefined && gallery.length > 1 && Math.abs(end - touchStart.current) > 50)
            move(end < touchStart.current ? 1 : -1);
          touchStart.current = null;
        }} onKeyDown={event => {
        if (gallery.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
        {current && failed !== current.url
          ? <img src={current.url} alt={`${item.data?.name}, foto ${index + 1} de ${gallery.length}`} onError={() => setFailed(current.url)} />
          : <div className="product-no-photo"><ImageOff /><span>{current ? "No se pudo cargar la foto." : "Sin fotos todavía"}</span></div>}
        {current && !large && <button className="mini-action photo-expand" type="button" aria-label="Ampliar foto" onClick={() => setExpanded(true)}><Expand /></button>}
        {gallery.length > 1 && <div className="gallery-navigation">
          <button type="button" className="mini-action" aria-label="Foto anterior" onClick={() => move(-1)}><ChevronLeft /></button>
          <span aria-live="polite">{index + 1} / {gallery.length}</span>
          <button type="button" className="mini-action" aria-label="Foto siguiente" onClick={() => move(1)}><ChevronRight /></button>
        </div>}
      </div>
      {gallery.length > 1 && <div className="gallery-thumbnails" aria-label="Elegir foto">
        {gallery.map((photo, n) => <button type="button" key={photo.id} aria-label={`Ver foto ${n + 1}`} aria-pressed={n === index}
          onClick={() => setSelected(n)}><img src={photo.thumbnailUrl} alt="" /></button>)}
      </div>}
    </div>
  );

  return <Modal title={item.data?.name ?? "Detalle del producto"} onClose={onClose} className="product-detail-dialog">
    {item.isPending ? <LoadingState label="Cargando producto..." /> : item.isError
      ? <ErrorState message="No pudimos cargar el producto." onRetry={() => void item.refetch()} />
      : <div className="product-detail-layout">
        <div>
          {galleryContent()}
          {photos.isFetching && !photos.data && <p role="status">Cargando fotos...</p>}
          {photos.isError && <ErrorState message={isOnline ? "No pudimos cargar las fotos." : "Conéctate para ver las fotos."}
            onRetry={() => void photos.refetch()} />}
        </div>
        <div className="product-detail-copy">
          <div className="product-detail-chips"><span className={`status-chip status-${item.data.status}`}>{statusLabels[item.data.status]}</span>
            <span>{priorityLabels[item.data.priority]}</span></div>
          <p className="product-description">{item.data.description || "Sin descripción."}</p>
          <dl className="product-facts">
            <div><dt>Categoría</dt><dd>{categoryLabels[item.data.category]}</dd></div>
            <div><dt>Tienda</dt><dd>{item.data.storeName || "Sin especificar"}</dd></div>
            <div><dt>Precio estimado</dt><dd>{formatCurrency(item.data.estimatedPrice)}</dd></div>
            <div><dt>Precio real</dt><dd>{formatCurrency(item.data.actualPrice)}</dd></div>
          </dl>
          {item.data.notes && <div className="product-notes"><h3>Notas</h3><p>{item.data.notes}</p></div>}
          <div className="product-detail-actions">
            <button className="button button-primary" type="button" disabled={!isOnline} onClick={onEdit}><Pencil />Editar producto</button>
            {item.data.productUrl && <a className="button button-secondary" href={item.data.productUrl} target="_blank" rel="noreferrer"><ExternalLink />Ver en tienda</a>}
          </div>
        </div>
      </div>}
    {expanded && <Modal title={item.data?.name ?? "Fotos"} description="Usa las flechas para recorrer las fotos."
      className="photo-lightbox-dialog" onKeyDown={event => {
        if (gallery.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation(); move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }} onClose={() => setExpanded(false)}>{galleryContent(true)}</Modal>}
  </Modal>;
}
