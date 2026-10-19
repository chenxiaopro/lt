import React from "react";

function MascotSvg({ kind, a, b }) {
  const fill = a || "#f59e0b";
  const lite = b || "#fff7ed";
  if (kind === "bird") {
    return (
      <g>
        <ellipse cx="32" cy="40" rx="16" ry="14" fill={fill} />
        <circle cx="32" cy="28" r="11" fill={fill} />
        <ellipse cx="24" cy="26" rx="5" ry="6" fill={lite} />
        <circle cx="27" cy="27" r="1.8" fill="#1f2937" />
        <path d="M42 28 L52 32 L42 36 Z" fill="#f59e0b" />
        <ellipse cx="18" cy="42" rx="7" ry="3.5" fill={lite} />
      </g>
    );
  }
  if (kind === "hamster") {
    return (
      <g>
        <ellipse cx="32" cy="38" rx="18" ry="16" fill="#f5d0a9" />
        <circle cx="18" cy="22" r="7" fill="#f5d0a9" />
        <circle cx="46" cy="22" r="7" fill="#f5d0a9" />
        <circle cx="18" cy="22" r="3.5" fill="#fecdd3" />
        <circle cx="46" cy="22" r="3.5" fill="#fecdd3" />
        <circle cx="26" cy="36" r="2" fill="#1f2937" />
        <circle cx="38" cy="36" r="2" fill="#1f2937" />
        <circle cx="24" cy="42" r="4" fill="#fda4af" opacity="0.7" />
        <circle cx="40" cy="42" r="4" fill="#fda4af" opacity="0.7" />
        <ellipse cx="32" cy="44" rx="3" ry="2" fill="#9a3412" />
      </g>
    );
  }
  if (kind === "duck") {
    return (
      <g>
        <ellipse cx="32" cy="40" rx="16" ry="13" fill="#facc15" />
        <circle cx="32" cy="28" r="11" fill="#facc15" />
        <ellipse cx="48" cy="30" rx="8" ry="4" fill="#f97316" />
        <circle cx="28" cy="26" r="2" fill="#1f2937" />
        <ellipse cx="22" cy="44" rx="5" ry="3" fill="#fde047" />
      </g>
    );
  }
  if (kind === "puppy") {
    return (
      <g>
        <ellipse cx="32" cy="40" rx="17" ry="14" fill={fill} />
        <circle cx="32" cy="28" r="12" fill={fill} />
        <ellipse cx="16" cy="22" rx="6" ry="8" fill={fill} />
        <ellipse cx="48" cy="22" rx="6" ry="8" fill={fill} />
        <circle cx="27" cy="28" r="2" fill="#1f2937" />
        <circle cx="37" cy="28" r="2" fill="#1f2937" />
        <ellipse cx="32" cy="36" rx="5" ry="3" fill={lite} />
      </g>
    );
  }
  if (kind === "corgi") {
    return (
      <g>
        <path d="M12 28 L20 8 L28 28 Z" fill={fill} />
        <path d="M52 28 L44 8 L36 28 Z" fill={fill} />
        <ellipse cx="32" cy="40" rx="20" ry="16" fill="#f5d0a9" />
        <ellipse cx="32" cy="46" rx="12" ry="8" fill={lite} />
        <circle cx="26" cy="36" r="2" fill="#1f2937" />
        <circle cx="38" cy="36" r="2" fill="#1f2937" />
        <circle cx="32" cy="42" r="2" fill="#9a3412" />
      </g>
    );
  }
  if (kind === "cloud") {
    return (
      <g>
        <ellipse cx="24" cy="36" rx="12" ry="10" fill="#fff" stroke="#c4b5fd" strokeWidth="2" />
        <ellipse cx="40" cy="36" rx="14" ry="12" fill="#fff" stroke="#c4b5fd" strokeWidth="2" />
        <circle cx="28" cy="34" r="2" fill="#1f2937" />
        <circle cx="38" cy="34" r="2" fill="#1f2937" />
        <path d="M30 42 Q32 46 34 42" fill="none" stroke="#1f2937" strokeWidth="1.5" />
      </g>
    );
  }
  if (kind === "cat") {
    return (
      <g>
        <path d="M14 28 L20 8 L30 24 Z" fill="#f97316" />
        <path d="M50 28 L44 8 L34 24 Z" fill="#f97316" />
        <ellipse cx="32" cy="38" rx="18" ry="16" fill="#fb923c" />
        <ellipse cx="32" cy="44" rx="10" ry="7" fill="#fed7aa" />
        <circle cx="26" cy="34" r="2" fill="#1f2937" />
        <circle cx="38" cy="34" r="2" fill="#1f2937" />
      </g>
    );
  }
  if (kind === "black") {
    return (
      <g>
        <path d="M16 26 L22 8 L30 24 Z" fill="#111827" />
        <path d="M48 26 L42 8 L34 24 Z" fill="#111827" />
        <ellipse cx="32" cy="38" rx="16" ry="14" fill="#111827" />
        <circle cx="26" cy="34" r="2.2" fill="#fbbf24" />
        <circle cx="38" cy="34" r="2.2" fill="#fbbf24" />
      </g>
    );
  }
  if (kind === "lantern") {
    return (
      <g>
        <rect x="22" y="18" width="20" height="26" rx="8" fill="#fb7185" />
        <rect x="26" y="22" width="12" height="18" rx="5" fill="#fecdd3" />
        <path d="M32 14 L32 18" stroke="#f59e0b" strokeWidth="2" />
        <path d="M32 44 L32 52" stroke="#f59e0b" strokeWidth="2" />
      </g>
    );
  }
  return (
    <g>
      <path d="M12 28 L18 6 L30 24 Z" fill={fill} />
      <path d="M52 28 L46 6 L34 24 Z" fill={fill} />
      <path d="M16 22 L20 10 L26 22 Z" fill="#fff" />
      <path d="M48 22 L44 10 L38 22 Z" fill="#fff" />
      <ellipse cx="32" cy="38" rx="18" ry="16" fill={fill} />
      <ellipse cx="32" cy="44" rx="10" ry="8" fill="#fff" />
      <circle cx="26" cy="34" r="2.2" fill="#1f2937" />
      <circle cx="38" cy="34" r="2.2" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="2.4" ry="1.6" fill="#9a3412" />
    </g>
  );
}

function RopeRing({ a, b }) {
  return (
    <>
      <circle cx="60" cy="60" r="44" fill="none" stroke={a} strokeWidth="9" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={b} strokeWidth="8" strokeDasharray="6 10" strokeLinecap="round" />
      <circle cx="60" cy="60" r="38.5" fill="none" stroke={a} strokeWidth="1.4" opacity="0.35" />
    </>
  );
}

function FrameTag({ text, color }) {
  const t = String(text || "").slice(0, 2);
  if (!t) return null;
  return (
    <g transform="translate(88,16)">
      <rect width="18" height={t.length > 1 ? 30 : 16} rx="3" fill={color} />
      <text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">{t[0]}</text>
      {t[1] ? <text x="9" y="24" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">{t[1]}</text> : null}
    </g>
  );
}

export function FrameArt({ style, color, color2, mark }) {
  const a = color || "#f59e0b";
  const b = color2 || "#fde68a";
  const kind = style || "shiba";
  if (kind === "wave") {
    return (
      <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="44" fill="none" stroke={a} strokeWidth="12" opacity="0.35" />
        <circle cx="60" cy="60" r="42" fill="none" stroke={a} strokeWidth="7" />
        <circle cx="60" cy="60" r="42" fill="none" stroke={b} strokeWidth="7" strokeDasharray="10 8" />
        <g transform="translate(8,74) scale(0.55)">
          <ellipse cx="32" cy="28" rx="18" ry="8" fill={a} />
          <path d="M10 28 Q32 8 54 28" fill={b} />
        </g>
        <FrameTag text={mark} color={a} />
      </svg>
    );
  }
  if (kind === "ice") {
    const spikes = Array.from({ length: 12 }, (_, i) => {
      const rad = (i * Math.PI) / 6;
      const x1 = 60 + Math.cos(rad) * 36;
      const y1 = 60 + Math.sin(rad) * 36;
      const x2 = 60 + Math.cos(rad) * 52;
      const y2 = 60 + Math.sin(rad) * 52;
      return <polygon key={i} points={`${x1 - 4},${y1} ${x2},${y2} ${x1 + 4},${y1}`} fill={i % 2 ? a : b} />;
    });
    return (
      <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="40" fill="none" stroke={a} strokeWidth="5" />
        {spikes}
        <FrameTag text={mark} color={a} />
      </svg>
    );
  }
  if (kind === "bunny") {
    return (
      <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
        <path d="M22 58 Q22 18 60 18 Q98 18 98 58" fill="none" stroke="#f9a8d4" strokeWidth="10" />
        <circle cx="22" cy="62" r="8" fill="#f472b6" />
        <circle cx="98" cy="62" r="8" fill="#f472b6" />
        <g transform="translate(36,78) scale(0.7)">
          <rect x="18" y="8" width="10" height="22" rx="5" fill="#fff" stroke="#111" strokeWidth="2" />
          <rect x="36" y="8" width="10" height="22" rx="5" fill="#fff" stroke="#111" strokeWidth="2" />
          <rect x="16" y="28" width="32" height="22" rx="8" fill="#fff" stroke="#111" strokeWidth="2" />
          <rect x="22" y="34" width="6" height="6" fill="#111" />
          <rect x="36" y="34" width="6" height="6" fill="#111" />
        </g>
        <FrameTag text={mark} color={a} />
      </svg>
    );
  }
  if (kind === "blaze") {
    return (
      <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="46" fill="none" stroke={a} strokeWidth="8" opacity="0.35" />
        <circle cx="60" cy="60" r="42" fill="none" stroke={a} strokeWidth="5" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={b} strokeWidth="2" />
        <FrameTag text={mark} color={a} />
      </svg>
    );
  }
  if (kind === "hat") {
    return (
      <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
        <path d="M18 40 Q60 8 102 40 L92 48 Q60 22 28 48 Z" fill={a} />
        <ellipse cx="60" cy="44" rx="46" ry="8" fill={b} />
        <path d="M86 70 L108 96" stroke={a} strokeWidth="4" />
        <rect x="96" y="88" width="18" height="8" rx="2" fill="#4b5563" transform="rotate(-28 105 92)" />
      </svg>
    );
  }
  return (
    <svg className="frame-art" viewBox="0 0 120 120" aria-hidden>
      <RopeRing a={a} b={b} />
      <g transform="translate(4,70) scale(0.62)">
        <MascotSvg kind={kind} a={a} b={b} />
      </g>
      <FrameTag text={mark} color={a} />
    </svg>
  );
}

export function FrameShop({ gift }) {
  const p = (gift && gift.payload) || {};
  return (
    <span className="frame-shop">
      <i className="frame-hole" />
      <FrameArt style={p.style} color={p.color} color2={p.color2} mark={p.mark} />
    </span>
  );
}

export function bubbleVars(bubble) {
  if (!bubble) return undefined;
  const color = bubble.color || "#f59e0b";
  const color2 = bubble.color2 || "#fff7ed";
  return {
    "--bub-a": color,
    "--bub-b": color2,
    background: color2,
    color: "#111",
    borderColor: color
  };
}

export function bubbleClass(bubble) {
  if (!bubble) return "";
  return `bub-skin st-${bubble.style || "shiba"} bub-${bubble.slug || "custom"}`;
}

export function BubbleSkin({ bubble, children, className = "", style, as = "div", ...rest }) {
  const Tag = as;
  if (!bubble) return <Tag className={className} style={style} {...rest}>{children}</Tag>;
  const st = bubble.style || "shiba";
  return (
    <Tag className={`${className} ${bubbleClass(bubble)}`.trim()} style={{ ...bubbleVars(bubble), ...style }} {...rest}>
      <span className="bub-mascot" aria-hidden>
        <svg viewBox="0 0 64 64"><MascotSvg kind={st} a={bubble.color} b={bubble.color2} /></svg>
      </span>
      {bubble.mark ? <i className="bub-tag">{String(bubble.mark).slice(0, 2)}</i> : null}
      {children}
    </Tag>
  );
}

export function applySiteTheme() {
  const root = document.documentElement;
  ["--accent", "--gourd", "--pine-2", "--gold", "--paper", "--card", "--ink"].forEach((k) => root.style.removeProperty(k));
  root.classList.remove("has-theme", "theme-dark");
}
