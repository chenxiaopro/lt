import React, { useEffect } from "react";

export default function Lightbox({ images, index, onClose, onIndex }) {
  const list = (images || []).filter(Boolean);
  if (!list.length || index == null || index < 0) return null;
  const i = Math.max(0, Math.min(index, list.length - 1));
  const src = list[i];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && onIndex) onIndex((i + 1) % list.length);
      if (e.key === "ArrowLeft" && onIndex) onIndex((i - 1 + list.length) % list.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, list.length, onClose, onIndex]);

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="查看图片">
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        {list.length > 1 ? (
          <button type="button" onClick={() => onIndex((i - 1 + list.length) % list.length)} aria-label="上一张">上一张</button>
        ) : null}
        <span>{i + 1} / {list.length}</span>
        {list.length > 1 ? (
          <button type="button" onClick={() => onIndex((i + 1) % list.length)} aria-label="下一张">下一张</button>
        ) : null}
        <button type="button" className="lightbox-x" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
