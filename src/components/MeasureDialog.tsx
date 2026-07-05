import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };
type Step = "cal1" | "cal2" | "len1" | "len2" | "wid1" | "wid2" | "done";

type Props = {
  src: string;
  onClose: () => void;
  onApply?: (sizeText: string) => Promise<void> | void;
};

/**
 * Messen mit 1×1×1 cm Referenzwürfel:
 * 1. Zwei Punkte an gegenüberliegenden Kanten des Würfels antippen (Kalibrierung = 10 mm)
 * 2. Zwei Punkte am Stein antippen → Länge in mm
 */
export function MeasureDialog({ src, onClose, onApply }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>("cal1");
  const [cal, setCal] = useState<[Point, Point] | null>(null);
  const [calTmp, setCalTmp] = useState<Point | null>(null);
  const [len, setLen] = useState<[Point, Point] | null>(null);
  const [lenTmp, setLenTmp] = useState<Point | null>(null);
  const [wid, setWid] = useState<[Point, Point] | null>(null);
  const [widTmp, setWidTmp] = useState<Point | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    const p: Point = {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
    if (step === "cal1") {
      setCalTmp(p);
      setStep("cal2");
    } else if (step === "cal2" && calTmp) {
      setCal([calTmp, p]);
      setCalTmp(null);
      setStep("len1");
    } else if (step === "len1") {
      setLenTmp(p);
      setStep("len2");
    } else if (step === "len2" && lenTmp) {
      setLen([lenTmp, p]);
      setLenTmp(null);
      setStep("wid1");
    } else if (step === "wid1") {
      setWidTmp(p);
      setStep("wid2");
    } else if (step === "wid2" && widTmp) {
      setWid([widTmp, p]);
      setWidTmp(null);
      setStep("done");
    }
  };

  const reset = () => {
    setCal(null);
    setCalTmp(null);
    setLen(null);
    setLenTmp(null);
    setWid(null);
    setWidTmp(null);
    setStep("cal1");
  };

  const restartLength = () => {
    setLen(null);
    setLenTmp(null);
    setWid(null);
    setWidTmp(null);
    setStep("len1");
  };

  const restartWidth = () => {
    setWid(null);
    setWidTmp(null);
    setStep("wid1");
  };

  // Umrechnung Pixel → mm (Kalibrierung: 2 Punkte = 10 mm)
  const img = imgRef.current;
  const pxDist = (a: Point, b: Point): number => {
    if (!img) return 0;
    const dx = ((a.x - b.x) / 100) * img.clientWidth;
    const dy = ((a.y - b.y) / 100) * img.clientHeight;
    return Math.hypot(dx, dy);
  };
  const calPx = cal ? pxDist(cal[0], cal[1]) : 0;
  const toMm = (pair: [Point, Point] | null): number | null => {
    if (!pair || calPx <= 0) return null;
    return (pxDist(pair[0], pair[1]) / calPx) * 10;
  };
  const lenMm = toMm(len);
  const widMm = toMm(wid);

  const instructions: Record<Step, string> = {
    cal1: "1/6 · Ersten Rand des Würfels antippen",
    cal2: "2/6 · Gegenüberliegenden Rand des Würfels antippen (= 10 mm)",
    len1: "3/6 · Länge: ersten Punkt am Stein antippen",
    len2: "4/6 · Länge: zweiten Punkt am Stein antippen",
    wid1: "5/6 · Breite: ersten Punkt am Stein antippen",
    wid2: "6/6 · Breite: zweiten Punkt am Stein antippen",
    done:
      lenMm != null && widMm != null
        ? `${lenMm.toFixed(1)} × ${widMm.toFixed(1)} mm`
        : "Fertig",
  };

  const dot = (p: Point, color: string, key: string, size = 10) => (
    <div
      key={key}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white"
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: size,
        height: size,
        background: color,
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{ width: 2, height: 2 }}
      />
    </div>
  );

  const line = (a: Point, b: Point, color: string, key: string, width = 0.4) => (
    <svg
      key={key}
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={color}
        strokeWidth={width}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );

  const apply = async () => {
    if (lenMm == null || widMm == null || !onApply) return;
    setApplying(true);
    try {
      await onApply(`${lenMm.toFixed(1)} × ${widMm.toFixed(1)} mm`);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Messen"
      className="fixed inset-0 z-[120] flex flex-col bg-black/95"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <div className="text-sm">
          <div className="font-semibold">Messen (1 cm Würfel)</div>
          <div className="text-xs text-white/70">{instructions[step]}</div>
        </div>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        <div className="relative inline-block">
          <img
            ref={imgRef}
            src={src}
            alt="Messen"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onClick={onImgClick}
            className="max-h-[75vh] max-w-[95vw] cursor-crosshair select-none rounded-lg object-contain"
            style={{ touchAction: "manipulation" }}
          />
          {loaded && (
            <>
              {cal && line(cal[0], cal[1], "#60a5fa", "cal-line", 0.2)}
              {len && line(len[0], len[1], "#22d3ee", "len-line")}
              {wid && line(wid[0], wid[1], "#f472b6", "wid-line")}
              {calTmp && dot(calTmp, "#60a5fa", "cal-tmp", 8)}
              {cal && dot(cal[0], "#60a5fa", "cal-0", 8)}
              {cal && dot(cal[1], "#60a5fa", "cal-1", 8)}
              {lenTmp && dot(lenTmp, "#22d3ee", "len-tmp")}
              {len && dot(len[0], "#22d3ee", "len-0")}
              {len && dot(len[1], "#22d3ee", "len-1")}
              {widTmp && dot(widTmp, "#f472b6", "wid-tmp")}
              {wid && dot(wid[0], "#f472b6", "wid-0")}
              {wid && dot(wid[1], "#f472b6", "wid-1")}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 p-3 pb-6 text-white">
        {(lenMm != null || widMm != null) && (
          <div className="w-full text-center text-2xl font-bold">
            {lenMm != null ? `${lenMm.toFixed(1)} mm` : "—"}
            <span className="mx-2 text-white/50">×</span>
            {widMm != null ? `${widMm.toFixed(1)} mm` : "…"}
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={reset}>
          Neu kalibrieren
        </Button>
        {cal && (
          <Button size="sm" variant="secondary" onClick={restartLength}>
            Länge neu
          </Button>
        )}
        {len && (
          <Button size="sm" variant="secondary" onClick={restartWidth}>
            Breite neu
          </Button>
        )}
        {lenMm != null && widMm != null && onApply && (
          <Button size="sm" onClick={apply} disabled={applying} className="gap-2">
            {applying && <Loader2 className="size-4 animate-spin" />}
            In „Größe" übernehmen
          </Button>
        )}
      </div>
    </div>
  );
}