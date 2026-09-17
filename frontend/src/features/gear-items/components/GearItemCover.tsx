import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { GearItemListResponse } from "../types";
import { useGearItemPhotos } from "../hooks/useGearItemPhotos";

export function GearItemCover({ item }: { item: GearItemListResponse }) {
  if (!item.photoCount) return item.imageUrl ? <img alt="" src={item.imageUrl} loading="lazy" /> : <ImageOff aria-hidden="true" />;
  return <UploadedCover item={item} />;
}

function UploadedCover({ item }: { item: GearItemListResponse }) {
  const photos = useGearItemPhotos(item.gearListId, item.id, Boolean(item.photoCount));
  const url = photos.data?.[0]?.thumbnailUrl ?? item.imageUrl;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return url && url !== failedUrl
    ? <img alt="" src={url} loading="lazy" onError={() => setFailedUrl(url)} />
    : <ImageOff aria-hidden="true" />;
}
