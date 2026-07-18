import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { Mineral } from "@/lib/minerals";
import { formatCollectionNumber } from "@/lib/minerals";
import { getPhotoUrl } from "@/lib/photos";
import { cutoutPhoto } from "@/lib/photos-edit.functions";

type Props = {
  items: Mineral[];
  onClose: () => void;
  intervalMs?: number;
};

type Frame = { item: Mineral; kind: "normal" | "uv"; path: string; label?: string };

export function Slideshow({ items, onClose, intervalMs = 5000 }: Props) {
  // Compare-Modus: pro Fund zuerst Normalfoto, direkt danach UV-Foto (falls vorhanden)
  const frames = useMemo<Frame[]>(() => {
    const out: Frame[] = [];
    for (const it of items) {
      const firstNormal = it.photo_paths?.[0];
      if (firstNormal) out.push({ item: it, kind: "normal", path: firstNormal });
      (it.uv_photos ?? []).forEach((uv, i) => {
        const label = it.uv_types?.[i]?.trim() || "UV";
        out.push({ item: it, kind: "uv", path: uv, label });
      });
    }
    return out;
  }, [items]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [uiVisible, setUiVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const cutoutFn = useServerFn(cutoutPhoto);
  const inFlight = useRef<Set<number>>(new Set());

  const total = frames.length;
  const current = frames[index];

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  // Preload current + next couple of photos.
  // Normal-Frames: KI-Freistellung. UV-Frames: Rohbild direkt (kein Studio).
  useEffect(() => {
    const wanted = [index, (index + 1) % total, (index + 2) % total];
    wanted.forEach((i) => {
      if (urls[i] || inFlight.current.has(i)) return;
      const frame = frames[i];
      if (!frame) {
        setUrls((u) => ({ ...u, [i]: "" }));
        return;
      }
      inFlight.current.add(i);
      (async () => {
        try {
          const { path: cutout } = await cutoutFn({ data: { path: frame.path } });
          const url = await getPhotoUrl(cutout);
          setUrls((u) => ({ ...u, [i]: url }));
        } catch (e) {
          console.error("Slideshow-Foto fehlgeschlagen", e);
          setUrls((u) => ({ ...u, [i]: "" }));
        } finally {
          inFlight.current.delete(i);
        }
      })();
    });
  }, [index, frames, total, urls, cutoutFn]);

  // Auto-advance — but only once the current image has loaded.
  useEffect(() => {
    if (!playing) return;
    if (!urls[index]) return;
    timerRef.current = window.setTimeout(next, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, playing, intervalMs, next, urls]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  // Lock body scroll while the slideshow is open. We do not request
  // fullscreen here, because the browser would show a security hint with
  // the page URL. The fixed overlay already covers the viewport.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const url = urls[index];
  const item = current?.item;
  const isUv = current?.kind === "uv";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* Photo */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={() => setUiVisible((v) => !v)}
      >
        {url ? (
          <img
            key={index}
            src={url}
            alt={item?.mineral_name ?? ""}
            className="absolute inset-0 h-full w-full object-contain animate-in fade-in duration-500"
          />
        ) : url === "" && urls[index] === "" ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            Kein Foto verfügbar
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="size-8 animate-spin" />
            <span className="text-sm">Freistellen läuft…</span>
          </div>
        )}


        {/* Close */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`absolute right-4 top-4 rounded-full bg-white/10 p-2 backdrop-blur transition hover:bg-white/20 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Schließen"
        >
          <X className="size-6" />
        </button>

        {/* Prev / Next */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur transition hover:bg-white/20 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Zurück"
        >
          <ChevronLeft className="size-7" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); next(); }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur transition hover:bg-white/20 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Weiter"
        >
          <ChevronRight className="size-7" />
        </button>

        {/* Permanent location overlay — always visible even when UI is hidden */}
        {(item?.location || item?.country) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
            <p className="max-w-full rounded bg-black/70 px-6 py-3 text-center font-serif text-3xl font-medium leading-tight text-white shadow-lg backdrop-blur">
              {item?.location && <span className="block break-words">{item.location}</span>}
              {item?.country && <span className="block break-words text-white/80">{item.country}</span>}
            </p>
          </div>
        )}

        {/* Info bar (overlay) */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center gap-4 bg-black/60 px-4 py-3 backdrop-blur transition-opacity ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            aria-label={playing ? "Pause" : "Abspielen"}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg">
              <span className="mr-2 font-mono text-xs uppercase tracking-wider text-primary/80">
                #{item ? formatCollectionNumber(item.collection_number, item.category) : ""}
              </span>
              {item?.mineral_name}{isUv ? ` · ${current?.label || "UV"}` : ""}
            </p>
            {(item?.era || item?.origin) && (
              <p className="truncate text-xs text-white/60">
                {[item?.era, item?.origin].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <span className="shrink-0 tabular-nums text-xs text-white/60">
            {index + 1} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}