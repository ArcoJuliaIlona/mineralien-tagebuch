import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { getPhotoUrl } from "@/lib/photos";

export function PhotoThumb({ path, className }: { path?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) return;
    getPhotoUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path]);

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
        <img src={url} alt="Mineral" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}