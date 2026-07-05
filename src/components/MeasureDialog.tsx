import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

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
  const [step, setStep] = useState<"cal1" | "cal2" | "meas1" | "meas2" | "done">("cal1");
  const [cal, setCal] = useState<[Point, Point] | null>(null);
  const [calTmp, setCalTmp] = useState<Point | null>(null);
  const [meas, setMeas] = useState<[Point, Point] | null>(null);
  const [measTmp, setMeasTmp] = useState<Point | null>(null);
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
    // relative Koordinaten in % der dargestellten Bildgröße
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
      setStep("meas1");
    } else if (step === "meas1") {
      setMeasTmp(p);
      setStep("meas2");
    } else if (step === "meas2" && measTmp) {
      setMeas([measTmp, p]);
      setMeasTmp(null);
      setStep("done");
    }
  };

  const reset = () => {
    setCal(null);
    setCalTmp(null);
    setMeas(null);
    setMeasTmp(null);
    setStep("cal1");
  };

  const restartMeasure = () => {
    setMeas(null);
    setMeasTmp(null);
    setStep("meas1");
  };

  // Länge in mm — Kalibrierung: 2 Punkte = 10 mm
  const img = imgRef.current;
  let mm: number | null = null;
  if (cal && meas && img) {
    const w = img.clientWidth;
    const h = img.clientHeight;
    const dx1 = ((cal[0].x - cal[1].x) / 100) * w;
    const dy1 = ((cal[0].y - cal[1].y) / 100) * h;
    const calPx = Math.hypot(dx1, dy1);
    const dx2 = ((meas[0].x - meas[1].x) / 100) * w;
    const dy2 = ((meas[0].y - meas[1].y) / 100) * h;
    const measPx = Math.hypot(dx2, dy2);
    if (calPx > 0) mm = (measPx / calPx) * 10;
  }

  const instructions: Record<typeof step, string> = {
    cal1: "1/4 · Ersten Rand des Würfels antippen",
    cal2: "2/4 · Gegenüberliegenden Rand des Würfels antippen (= 10 mm)",
    meas1: "3/4 · Ersten Punkt am Stein antippen",
    meas2: "4/4 · Zweiten Punkt am Stein antippen",
    done: mm != null ? `Länge: ${mm.toFixed(1)} mm` : "Fertig",
  };

  const dot = (p: Point, color: string, key: string) => (
    <div
      key={key}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: 14,
        height: 14,
        background: color,
      }}
    />
  );

  const line = (a: Point, b: Point, color: string, key: string) => (
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
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );

  const apply = async () => {
    if (mm == null || !onApply) return;
    setApplying(true);
    try {
      await onApply(`${mm.toFixed(1)} mm`);
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
              {cal && line(cal[0], cal[1], "#60a5fa", "cal-line")}
              {meas && line(meas[0], meas[1], "#22d3ee", "meas-line")}
              {calTmp && dot(calTmp, "#60a5fa", "cal-tmp")}
              {cal && dot(cal[0], "#60a5fa", "cal-0")}
              {cal && dot(cal[1], "#60a5fa", "cal-1")}
              {measTmp && dot(measTmp, "#22d3ee", "meas-tmp")}
              {meas && dot(meas[0], "#22d3ee", "meas-0")}
              {meas && dot(meas[1], "#22d3ee", "meas-1")}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 p-3 pb-6 text-white">
        {mm != null && (
          <div className="w-full text-center text-2xl font-bold">
            {mm.toFixed(1)} mm
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={reset}>
          Neu kalibrieren
        </Button>
        {cal && (
          <Button size="sm" variant="secondary" onClick={restartMeasure}>
            Neu messen
          </Button>
        )}
        {mm != null && onApply && (
          <Button size="sm" onClick={apply} disabled={applying} className="gap-2">
            {applying && <Loader2 className="size-4 animate-spin" />}
            In „Größe" übernehmen
          </Button>
        )}
      </div>
    </div>
  );
}