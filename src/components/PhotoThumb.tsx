import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { getPhotoUrl } from "@/lib/photos";

export function PhotoThumb({
  path,
  url: urlProp,
  className,
  version,
}: {
  path?: string;
  url?: string | null;
  className?: string;
  version?: number;
}) {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const baseUrl = urlProp ?? fetchedUrl;
  const url = baseUrl
    ? version
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${version}`
      : baseUrl
    : null;

  useEffect(() => {
    let active = true;
    if (!path || urlProp !== undefined) return;
    getPhotoUrl(path)
      .then((u) => active && setFetchedUrl(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path, urlProp, version]);

  if (!path) {
    return (
      <div
        className={
          "flex items-center justify-center rounded-lg bg-black text-white/30 " +
          (className ?? "")
        }
      >
        <ImageIcon className="size-7" />
      </div>
    );
  }
  return (
    <div className={"overflow-hidden rounded-lg bg-black " + (className ?? "")}>
      {url ? (
        <img
          src={url}
          alt="Mineral"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}