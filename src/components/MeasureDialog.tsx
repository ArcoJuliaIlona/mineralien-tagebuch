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

const REF_STORAGE_KEY = "measure.refMm";
const REF_PRESETS: { label: string; mm: number }[] = [
  { label: "10 mm (1 cm Würfel)", mm: 10 },
  { label: "20 mm (2 cm)", mm: 20 },
  { label: "23,25 mm (1 € Münze)", mm: 23.25 },
  { label: "25,75 mm (2 € Münze)", mm: 25.75 },
  { label: "50 mm (Lineal 0–5 cm)", mm: 50 },
  { label: "100 mm (Lineal 0–10 cm)", mm: 100 },
];

/**
 * Messen mit frei wählbarer Referenzlänge (Würfel, Lineal, Münze).
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
  const [refMm, setRefMm] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    const raw = window.localStorage.getItem(REF_STORAGE_KEY);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 10;
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customStr, setCustomStr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REF_STORAGE_KEY, String(refMm));
    }
  }, [refMm]);

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

  // Umrechnung Pixel → mm (Kalibrierung: 2 Punkte = refMm)
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
    return (pxDist(pair[0], pair[1]) / calPx) * refMm;
  };
  const lenMm = toMm(len);
  const widMm = toMm(wid);

  const refLabel = `${refMm.toString().replace(".", ",")} mm`;
  const instructions: Record<Step, string> = {
    cal1: `1/6 · Referenz: ersten Punkt antippen (Strecke = ${refLabel})`,
    cal2: `2/6 · Referenz: zweiten Punkt antippen (= ${refLabel})`,
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
          <div className="font-semibold">Messen · Referenz {refLabel}</div>
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

      <div className="flex flex-wrap items-center gap-2 px-3 pb-2 text-xs text-white">
        <span className="text-white/70">Referenzlänge:</span>
        <select
          value={
            REF_PRESETS.some((p) => p.mm === refMm) && !customOpen
              ? String(refMm)
              : "custom"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") {
              setCustomOpen(true);
              setCustomStr(refMm.toString().replace(".", ","));
            } else {
              setCustomOpen(false);
              setRefMm(parseFloat(v));
              reset();
            }
          }}
          className="rounded-md bg-white/10 px-2 py-1 text-white outline-none"
        >
          {REF_PRESETS.map((p) => (
            <option key={p.mm} value={p.mm} className="bg-neutral-900">
              {p.label}
            </option>
          ))}
          <option value="custom" className="bg-neutral-900">
            Eigener Wert…
          </option>
        </select>
        {customOpen && (
          <>
            <input
              type="text"
              inputMode="decimal"
              value={customStr}
              onChange={(e) => setCustomStr(e.target.value)}
              placeholder="mm"
              className="w-24 rounded-md bg-white/10 px-2 py-1 text-white outline-none placeholder:text-white/40"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const n = parseFloat(customStr.replace(",", "."));
                if (Number.isFinite(n) && n > 0) {
                  setRefMm(n);
                  setCustomOpen(false);
                  reset();
                }
              }}
            >
              Übernehmen
            </Button>
          </>
        )}
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