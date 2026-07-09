import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { getPhotoUrl } from "@/lib/photos";

// Module-level cache of trim boxes, so repeated renders (list scrolling,
// navigations) skip the canvas work.
const trimCache = new Map<string, { x: number; y: number; w: number; h: number } | null>();

function baseKey(u: string): string {
  const q = u.indexOf("?");
  return q >= 0 ? u.slice(0, q) : u;
}

async function computeTrimBox(
  url: string,
): Promise<{ x: number; y: number; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const MAX = 220;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        // Gate: only trim images with dark borders (studio / cutout).
        let borderSum = 0;
        let borderN = 0;
        const sampleBorder = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          borderSum += data[i] + data[i + 1] + data[i + 2];
          borderN += 3;
        };
        for (let x = 0; x < w; x += 4) {
          sampleBorder(x, 0);
          sampleBorder(x, h - 1);
        }
        for (let y = 0; y < h; y += 4) {
          sampleBorder(0, y);
          sampleBorder(w - 1, y);
        }
        const borderAvg = borderSum / borderN;
        if (borderAvg > 28) return resolve(null); // bright border → don't trim

        const THRESH = 34;
        let minX = w,
          minY = h,
          maxX = -1,
          maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i + 3] < 8) continue;
            if (data[i] > THRESH || data[i + 1] > THRESH || data[i + 2] > THRESH) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0 || maxY < 0) return resolve(null);

        const pad = Math.round(Math.min(w, h) * 0.03);
        const bx = Math.max(0, minX - pad);
        const by = Math.max(0, minY - pad);
        const bw = Math.min(w, maxX + pad) - bx;
        const bh = Math.min(h, maxY + pad) - by;

        if (bw / w > 0.94 && bh / h > 0.94) return resolve(null);

        resolve({ x: bx / w, y: by / h, w: bw / w, h: bh / h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function PhotoThumb({
  path,
  url: urlProp,
  className,
  version,
  trim = false,
  fit = "cover",
}: {
  path?: string;
  url?: string | null;
  className?: string;
  version?: number;
  trim?: boolean;
  fit?: "cover" | "contain";
}) {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const baseUrl = urlProp ?? fetchedUrl;
  const url = baseUrl
    ? version
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${version}`
      : baseUrl
    : null;

  const cacheKey = baseUrl ? baseKey(baseUrl) : null;
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    trim && cacheKey ? trimCache.get(cacheKey) ?? null : null,
  );
  const trimReqRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!trim || !cacheKey || !url) return;
    if (trimCache.has(cacheKey)) {
      setBox(trimCache.get(cacheKey) ?? null);
      return;
    }
    if (trimReqRef.current === cacheKey) return;
    trimReqRef.current = cacheKey;
    let active = true;
    computeTrimBox(url).then((b) => {
      trimCache.set(cacheKey, b);
      if (active) setBox(b);
    });
    return () => {
      active = false;
    };
  }, [trim, cacheKey, url]);

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
        trim && box ? (
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={url}
              alt="Mineral"
              loading="lazy"
              decoding="async"
              style={{
                position: "absolute",
                left: `${-box.x * (100 / box.w)}%`,
                top: `${-box.y * (100 / box.h)}%`,
                width: `${100 / box.w}%`,
                height: `${100 / box.h}%`,
                objectFit: fit,
              }}
            />
          </div>
        ) : (
          <img
            src={url}
            alt="Mineral"
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-${fit}`}
          />
        )
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}