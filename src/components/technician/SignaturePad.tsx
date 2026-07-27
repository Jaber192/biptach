import { useEffect, useRef, useState } from "react";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  initial?: string | null;
}

export function SignaturePad({ onSave, onClear, initial }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(initial));
  const [saved, setSaved] = useState(Boolean(initial));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";

    if (initial) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      };
      img.src = initial;
    }
  }, [initial]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    setSaved(false);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const point = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
    setHasInk(true);
  }

  function end() {
    drawing.current = false;
    lastPoint.current = null;
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setSaved(false);
    onClear?.();
  }

  function save() {
    if (!hasInk) return;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSave(dataUrl);
    setSaved(true);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Sign here with your finger or stylus
          </p>
        )}
        {saved && (
          <span className="absolute right-2 top-2 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900 dark:text-accent-300">
            Saved
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Eraser className="h-4 w-4" />
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasInk}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Save signature
        </button>
      </div>
    </div>
  );
}
