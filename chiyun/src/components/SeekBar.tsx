import { useRef, useState, type PointerEvent } from "react";
import { formatClock } from "../utils/format";

export default function SeekBar({
  currentTime,
  duration,
  buffered = 0,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  buffered?: number;
  onSeek: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(0);
  const lastSeek = useRef(0);

  const total = duration || 0;
  const shown = dragging ? preview : currentTime;
  const played = total > 0 ? Math.min(1, shown / total) : 0;
  const loaded = total > 0 ? Math.min(1, buffered / total) : 0;

  const timeFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || total <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * total;
  };

  const emitSeek = (time: number, force = false) => {
    const now = performance.now();
    if (!force && now - lastSeek.current < 32) return;
    lastSeek.current = now;
    onSeek(time);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const time = timeFromClientX(event.clientX);
    setDragging(true);
    setPreview(time);
    emitSeek(time, true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const time = timeFromClientX(event.clientX);
    setPreview(time);
    emitSeek(time);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const time = timeFromClientX(event.clientX);
    setPreview(time);
    emitSeek(time, true);
    setDragging(false);
  };

  return (
    <div className="px-1">
      <div
        className={`seek-bar ${dragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {dragging ? (
          <div className="seek-bubble" style={{ left: `${played * 100}%` }}>
            {formatClock(shown)}
          </div>
        ) : null}
        <div ref={trackRef} className="seek-track">
          <div className="seek-loaded" style={{ width: `${loaded * 100}%` }} />
          <div className="seek-played" style={{ width: `${played * 100}%` }} />
          <div className="seek-thumb" style={{ left: `${played * 100}%` }} />
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-white/55">
        <span>{formatClock(shown)}</span>
        <span>{formatClock(total)}</span>
      </div>
    </div>
  );
}
