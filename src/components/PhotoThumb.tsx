import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { getPhotoUrl } from "@/lib/photos";

export function PhotoThumb({
  path,
  url: urlProp,
  className,
}: {
  path?: string;
  url?: string | null;
  className?: string;
}) {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const url = urlProp ?? fetchedUrl;

  useEffect(() => {
    let active = true;
    if (!path || urlProp !== undefined) return;
    getPhotoUrl(path)
      .then((u) => active && setFetchedUrl(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path, urlProp]);

  if (!path) {
    return (
      <div
        className={
          "flex items-center justify-center rounded-lg bg-muted text-muted-foreground " +
          (className ?? "")
        }
      >
        <ImageIcon className="size-7" />
      </div>
    );
  }
  return (
    <div className={"overflow-hidden rounded-lg bg-muted " + (className ?? "")}>
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