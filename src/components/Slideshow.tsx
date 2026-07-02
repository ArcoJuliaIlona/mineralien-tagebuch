import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { Mineral } from "@/lib/minerals";
import { formatCollectionNumber } from "@/lib/minerals";
import { getOriginalPhotoUrl } from "@/lib/photos";

type Props = {
  items: Mineral[];
  onClose: () => void;
  intervalMs?: number;
};

export function Slideshow({ items, onClose, intervalMs = 5000 }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const timerRef = useRef<number | null>(null);

  const total = items.length;
  const current = items[index];

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  // Preload current + next couple of photos in high resolution.
  useEffect(() => {
    const wanted = [index, (index + 1) % total, (index + 2) % total];
    wanted.forEach((i) => {
      if (urls[i]) return;
      const path = items[i]?.photo_paths?.[0];
      if (!path) {
        setUrls((u) => ({ ...u, [i]: "" }));
        return;
      }
      getOriginalPhotoUrl(path)
        .then((url) => setUrls((u) => ({ ...u, [i]: url })))
        .catch(() => setUrls((u) => ({ ...u, [i]: "" })));
    });
  }, [index, items, total, urls]);

  // Auto-advance.
  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setTimeout(next, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, playing, intervalMs, next]);

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

  // Request fullscreen on mount, restore body scroll on unmount.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const url = urls[index];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* Photo */}
      <div className="relative flex-1 overflow-hidden">
        {url ? (
          <img
            key={index}
            src={url}
            alt={current?.mineral_name ?? ""}
            className="absolute inset-0 h-full w-full object-contain animate-in fade-in duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            Lade…
          </div>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 backdrop-blur transition hover:bg-white/20"
          aria-label="Schließen"
        >
          <X className="size-6" />
        </button>

        {/* Prev / Next */}
        <button
          type="button"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur transition hover:bg-white/20"
          aria-label="Zurück"
        >
          <ChevronLeft className="size-7" />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur transition hover:bg-white/20"
          aria-label="Weiter"
        >
          <ChevronRight className="size-7" />
        </button>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-4 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
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
              #{current ? formatCollectionNumber(current.collection_number, current.category) : ""}
            </span>
            {current?.mineral_name}
          </p>
          <p className="truncate text-xs text-white/60">
            {[current?.location, current?.country, current?.era, current?.origin]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 tabular-nums text-xs text-white/60">
          {index + 1} / {total}
        </span>
      </div>
    </div>
  );
}