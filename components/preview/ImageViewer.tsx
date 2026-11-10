"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { cn, clamp } from "@/lib/cn";

interface Transform {
  s: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SWIPE_DISTANCE = 70;

interface ImageViewerProps {
  src: string;
  alt: string;
  /** Called on a horizontal swipe while not zoomed. -1 = previous, 1 = next. */
  onSwipe?: (direction: -1 | 1) => void;
}

/** Zoomable image: wheel / pinch / double-tap / buttons, drag to pan, swipe to navigate. */
export function ImageViewer({ src, alt, onSwipe }: ImageViewerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef<Transform>({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const pan = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const lastToggle = useRef(0);

  const [transform, setTransform] = useState<Transform>({ s: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function apply(next: Transform) {
    transformRef.current = next;
    setTransform(next);
  }

  function clampPan(scale: number, x: number, y: number) {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return { x: 0, y: 0 };
    const maxX = Math.max(0, (img.offsetWidth * scale - wrap.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - wrap.clientHeight) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  function zoomTo(scale: number) {
    const current = transformRef.current;
    const s = clamp(scale, MIN_SCALE, MAX_SCALE);
    const ratio = s / current.s;
    apply({ s, ...clampPan(s, current.x * ratio, current.y * ratio) });
  }

  function onWheel(event: WheelEvent) {
    zoomTo(transformRef.current.s * (event.deltaY < 0 ? 1.18 : 1 / 1.18));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setDragging(true);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: transformRef.current.s };
      pan.current = null;
    } else {
      pan.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
        moved: false,
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const s = clamp(pinch.current.scale * (distance / pinch.current.distance), MIN_SCALE, MAX_SCALE);
      const current = transformRef.current;
      const ratio = s / current.s;
      apply({ s, ...clampPan(s, current.x * ratio, current.y * ratio) });
      return;
    }

    const gesture = pan.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gesture.moved = true;

    const { s } = transformRef.current;
    if (s <= 1.001) {
      // Not zoomed: follow the finger horizontally so swiping feels physical.
      apply({ s: 1, x: onSwipe ? dx : 0, y: 0 });
    } else {
      apply({ s, ...clampPan(s, gesture.originX + dx, gesture.originY + dy) });
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size < 2) pinch.current = null;

    if (pointers.current.size === 1) {
      // One finger left after a pinch: continue panning from where it is.
      const [rest] = [...pointers.current.values()];
      pan.current = {
        startX: rest.x,
        startY: rest.y,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
        moved: true,
      };
      return;
    }
    if (pointers.current.size > 0) return;

    setDragging(false);
    const gesture = pan.current;
    pan.current = null;
    const current = transformRef.current;

    if (current.s <= 1.001) {
      if (onSwipe && Math.abs(current.x) > SWIPE_DISTANCE) {
        apply({ s: 1, x: 0, y: 0 });
        onSwipe(current.x < 0 ? 1 : -1);
        return;
      }
      apply({ s: 1, x: 0, y: 0 });
    }

    // Double-tap (touch / pen) toggles zoom.
    if (gesture && !gesture.moved && event.pointerType !== "mouse") {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        lastToggle.current = now;
        zoomTo(transformRef.current.s > 1.05 ? 1 : 2.5);
      } else {
        lastTap.current = now;
      }
    }
  }

  const zoomed = transform.s > 1.001;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative flex size-full touch-none select-none items-center justify-center overflow-hidden",
        zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
      )}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={() => {
        // Touch double-taps are handled in endPointer; ignore the synthetic dblclick that may follow.
        if (Date.now() - lastToggle.current < 500) return;
        zoomTo(transformRef.current.s > 1.05 ? 1 : 2.5);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from IndexedDB */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.s})`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms",
        }}
        className={cn(
          "max-h-full max-w-full object-contain will-change-transform [-webkit-user-drag:none]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-white/10 bg-black/60 p-1 backdrop-blur-xl"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomTo(transformRef.current.s / 1.5)}
          disabled={transform.s <= MIN_SCALE}
          className="flex size-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 disabled:opacity-35"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={() => apply({ s: 1, x: 0, y: 0 })}
          className="min-w-14 rounded-xl px-1 text-center font-mono text-xs tabular-nums text-white/90 transition hover:bg-white/15"
          style={{ height: 40 }}
        >
          {Math.round(transform.s * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomTo(transformRef.current.s * 1.5)}
          disabled={transform.s >= MAX_SCALE}
          className="flex size-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 disabled:opacity-35"
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Fit to screen"
          onClick={() => apply({ s: 1, x: 0, y: 0 })}
          className="flex size-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 max-sm:hidden"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
