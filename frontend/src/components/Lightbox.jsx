import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Lightbox({ images, index, onClose, onIndex }) {
  const list = (images || []).filter(Boolean);
  const open = list.length > 0 && index != null && index >= 0;
  const i = open ? Math.max(0, Math.min(index, list.length - 1)) : 0;
  const src = open ? list[i] : "";

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose && onClose();
      if (e.key === "ArrowRight" && onIndex) onIndex((i + 1) % list.length);
      if (e.key === "ArrowLeft" && onIndex) onIndex((i - 1 + list.length) % list.length);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, i, list.length, onClose, onIndex]);

  if (!open) return null;

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="查看图片">
      <button type="button" className="lightbox-back" onClick={onClose} aria-label="关闭" />
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="关闭">×</button>
      <img src={src} alt="" />
      <div className="lightbox-bar">
        {list.length > 1 ? (
          <button type="button" onClick={() => onIndex((i - 1 + list.length) % list.length)} aria-label="上一张">上一张</button>
        ) : null}
        <span>{i + 1} / {list.length}</span>
        {list.length > 1 ? (
          <button type="button" onClick={() => onIndex((i + 1) % list.length)} aria-label="下一张">下一张</button>
        ) : null}
        <button type="button" className="lightbox-x" onClick={onClose}>关闭</button>
      </div>
    </div>,
    document.body
  );
}
