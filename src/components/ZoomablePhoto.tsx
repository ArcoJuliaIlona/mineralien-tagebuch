import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
};

/**
 * Bildbetrachter mit Pinch-Zoom, Doppeltap-Zoom, Mausrad-Zoom und Pan.
 * Stoppt Klicks, damit der umgebende Dialog nicht schließt.
 */
export function ZoomablePhoto({ src, alt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Pointer/Gesten-State
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<{
    startDist: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    startTx: number;
    startTy: number;
  } | null>(null);
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef<number>(0);

  const clamp = (s: number) => Math.min(6, Math.max(1, s));

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  useEffect(() => {
    reset();
  }, [src]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      gesture.current = {
        startDist: Math.hypot(dx, dy) || 1,
        startScale: scale,
        startMidX: (a.x + b.x) / 2,
        startMidY: (a.y + b.y) / 2,
        startTx: tx,
        startTy: ty,
      };
      pan.current = null;
    } else if (pointers.current.size === 1 && scale > 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const next = clamp((gesture.current.startScale * dist) / gesture.current.startDist);
      setScale(next);
    } else if (pointers.current.size === 1 && pan.current) {
      setTx(pan.current.tx + (e.clientX - pan.current.x));
      setTy(pan.current.ty + (e.clientY - pan.current.y));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) pan.current = null;
  };

  const onDoubleTap = () => {
    setScale((s) => (s > 1 ? 1 : 2.5));
    setTx(0);
    setTy(0);
  };

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTap();
    }
    lastTap.current = now;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0025;
    setScale((s) => clamp(s + s * delta));
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-[95vh] max-w-[95vw] select-none rounded-lg object-contain"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: pointers.current.size === 0 ? "transform 120ms ease-out" : "none",
          willChange: "transform",
        }}
      />
    </div>
  );
}