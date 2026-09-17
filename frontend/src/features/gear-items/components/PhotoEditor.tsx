import { ImagePlus, Star, X, ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PhotoDraft } from "../hooks/useGearItemPhotos";

export function PhotoEditor({ photos, onChange, disabled }: {
  photos: PhotoDraft[]; onChange: (photos: PhotoDraft[]) => void; disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const owned = urls.current;
    return () => { owned.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const addFiles = (files: File[]) => {
    if (disabled) return;
    setError("");
    if (photos.length + files.length > 6) {
      setError("Puedes agregar hasta 6 fotos. Selecciona menos archivos.");
      return;
    }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Selecciona fotos JPG, PNG o WebP. Si tu foto es HEIC, expórtala como JPG.");
      return;
    }
    if (files.some(file => file.size > 12 * 1024 * 1024 || !file.size)) {
      setError("Cada foto debe pesar como máximo 12 MB.");
      return;
    }
    onChange([...photos, ...files.map(file => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: crypto.randomUUID(), url, file };
    })]);
  };

  return (
    <section className="photo-editor field-span-2" aria-label="Fotos del producto">
      <div className="photo-editor-heading"><strong>Fotos</strong><span>{photos.length}/6</span></div>
      <div className={`photo-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
        <ImagePlus aria-hidden="true" />
        <button type="button" className="button button-secondary" disabled={disabled || photos.length >= 6}
          onClick={() => input.current?.click()}>Agregar fotos</button>
        <span>Selecciona varias o arrástralas aquí.</span>
        <small>JPG, PNG o WebP · hasta 12 MB por foto. Ajustamos el tamaño automáticamente.</small>
        <input ref={input} aria-label="Seleccionar fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
          disabled={disabled} onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </div>
      {error && <p className="photo-error" role="alert">{error}</p>}
      {photos.length > 0 && <ol className="photo-editor-grid">
        {photos.map((photo, index) => <li key={photo.id}>
          <div className="photo-preview"><img src={photo.url} alt={`Foto ${index + 1}`}
            onError={event => { event.currentTarget.style.visibility = "hidden"; }} /><ImageOff className="photo-fallback" aria-hidden="true" /></div>
          <button type="button" className="photo-remove mini-action" aria-label={`Quitar foto ${index + 1}`} disabled={disabled}
            onClick={() => onChange(photos.filter(p => p.id !== photo.id))}><X aria-hidden="true" /></button>
          <button type="button" className={`photo-cover${index === 0 ? " selected" : ""}`} disabled={disabled || index === 0}
            aria-label={index === 0 ? `Foto ${index + 1}, portada` : `Usar foto ${index + 1} como portada`}
            onClick={() => onChange([photo, ...photos.filter(p => p.id !== photo.id)])}>
            <Star aria-hidden="true" />{index === 0 ? "Portada" : "Usar de portada"}
          </button>
        </li>)}
      </ol>}
    </section>
  );
}
