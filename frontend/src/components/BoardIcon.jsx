import React from "react";

function Tile({ bg, size, children }) {
  return (
    <span
      className="board-ico"
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Art({ children }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {children}
    </svg>
  );
}

const ARTS = {
  follow: (
    <Art>
      <path fill="#fff" d="M24 8.5 28.7 20h12.1l-9.8 7.2 3.8 11.3L24 31.6l-10.8 6.9 3.8-11.3-9.8-7.2h12.1z" />
    </Art>
  ),
  patriot: (
    <Art>
      <path fill="#f7d14a" d="M24 10.5 27.6 21h11.2l-9 6.6 3.4 10.4L24 31.6l-9.2 6.4 3.4-10.4-9-6.6H20.4z" />
    </Art>
  ),
  original: (
    <Art>
      <path fill="#fff" d="M24 8c-5.5 0-10 4.2-10 9.4 0 3.3 1.7 6.2 4.3 7.9v4.2h11.4v-4.2c2.6-1.7 4.3-4.6 4.3-7.9C34 12.2 29.5 8 24 8zm-4 24.2h8v2.4h-8zm1.2 4h5.6V38h-5.6z" />
    </Art>
  ),
  techshare: (
    <Art>
      <path fill="#fff" d="M16.2 28.4 28.6 16a4.2 4.2 0 0 1 6 6L22.2 34.4a2.4 2.4 0 0 1-3.4 0l-2.6-2.6a2.4 2.4 0 0 1 0-3.4z" />
      <circle cx="32.4" cy="15.8" r="3.2" fill="#fff" />
      <path fill="#fff" d="M14 33.5h8.5v3.2H14z" />
    </Art>
  ),
  locke: (
    <Art>
      <ellipse cx="24" cy="26" rx="12" ry="11" fill="#fff" />
      <ellipse cx="16" cy="16" rx="5" ry="6.5" fill="#fff" />
      <ellipse cx="32" cy="16" rx="5" ry="6.5" fill="#fff" />
      <circle cx="19.5" cy="24.5" r="2.1" fill="#1d4ed8" />
      <circle cx="28.5" cy="24.5" r="2.1" fill="#1d4ed8" />
      <path fill="#1d4ed8" d="M20.5 31c2 1.8 5 1.8 7 0" stroke="#1d4ed8" strokeWidth="1.6" fill="none" />
    </Art>
  ),
  aiplanet: (
    <Art>
      <text x="24" y="31" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800" fontFamily="ui-sans-serif,system-ui">
        Ai
      </text>
    </Art>
  ),
  delta: (
    <Art>
      <path fill="#34d399" d="M24 10 38 36H10z" />
      <path fill="#111" d="M24 18 32.4 34H15.6z" />
    </Art>
  ),
  kog: (
    <Art>
      <path fill="#fff" d="M10 20h28v4H10zm4-6 4 6h12l4-6-5 2-5-4-5 4zM16 26h16l-2 10H18z" />
    </Art>
  ),
  summer: (
    <Art>
      <path fill="#fff" d="M24 34c-6 0-10-4.2-10-9.5 0-6 5.2-11 10-14.5 4.8 3.5 10 8.5 10 14.5C34 29.8 30 34 24 34z" />
      <ellipse cx="24" cy="16" rx="3.2" ry="4" fill="#ffb4d0" />
    </Art>
  ),
  model: (
    <Art>
      <path fill="#fff" d="M10 12h12v10H10zm16 0h12v24H26zM10 26h12v10H10z" />
    </Art>
  ),
  draw: (
    <Art>
      <path fill="#fff" d="M14 34.5 32.5 16l4 4L18 38.5z" />
      <path fill="#fff" d="M31 12.5 36.5 18l2.4-2.4a3 3 0 0 0 0-4.2L35.6 10a3 3 0 0 0-4.2 0z" />
      <rect x="12" y="36" width="10" height="3.2" rx="1" fill="#fff" />
    </Art>
  ),
  pool: (
    <Art>
      <circle cx="24" cy="24" r="13" fill="none" stroke="#fff" strokeWidth="5" />
      <circle cx="24" cy="24" r="4.2" fill="#fff" />
      <path fill="#fff" d="M22.2 8.4h3.6v7.2h-3.6zm0 24h3.6v7.2h-3.6zM8.4 22.2h7.2v3.6H8.4zm24 0h7.2v3.6h-7.2z" />
    </Art>
  ),
  miaoyi: (
    <Art>
      <ellipse cx="24" cy="24" rx="14" ry="10" fill="#fff" />
      <path fill="#fff" d="M34 18 42 24l-8 6z" />
      <circle cx="18" cy="22" r="2" fill="#b91c1c" />
      <path d="M12 24c4 6 12 6 16 0" fill="none" stroke="#b91c1c" strokeWidth="1.6" />
    </Art>
  ),
  notice: (
    <Art>
      <rect x="13" y="10" width="22" height="28" rx="3" fill="#fff" />
      <rect x="18" y="7" width="12" height="6" rx="2" fill="#fff" />
      <path stroke="#f59e0b" strokeWidth="2.2" d="M18 20h12M18 25h12M18 30h8" />
    </Art>
  ),
  feedback: (
    <Art>
      <rect x="8" y="14" width="32" height="22" rx="3" fill="#fff" />
      <path d="M8 16 24 28 40 16" fill="none" stroke="#38bdf8" strokeWidth="2.4" />
    </Art>
  ),
  genshin: (
    <Art>
      <path fill="#fff" d="M24 8 30 22l14 2-11 9 4 13-13-8-13 8 4-13-11-9 14-2z" />
    </Art>
  ),
  mc: (
    <Art>
      <path fill="#fff" d="M10 18 24 10l14 8v16L24 42 10 34z" />
      <path fill="#166534" d="M24 18v24" />
      <path fill="#166534" d="M10 18h28" />
    </Art>
  ),
  pubg: (
    <Art>
      <path fill="#fff" d="M16 20a8 8 0 1 1 16 0v4H16zm-3 8h22v4l-3 8H16l-3-8z" />
    </Art>
  ),
  stardew: (
    <Art>
      <path fill="#fff" d="M24 8c2 6 8 10 8 16a8 8 0 1 1-16 0c0-6 6-10 8-16z" />
      <rect x="22" y="30" width="4" height="10" fill="#fff" />
    </Art>
  ),
  android: (
    <Art>
      <rect x="16" y="12" width="16" height="24" rx="3" fill="#fff" />
      <circle cx="24" cy="16" r="1.2" fill="#2f6f5e" />
      <rect x="20" y="32" width="8" height="1.6" fill="#2f6f5e" />
    </Art>
  ),
  theme: (
    <Art>
      <circle cx="24" cy="24" r="13" fill="#fff" />
      <circle cx="18" cy="20" r="3" fill="#f59e0b" />
      <circle cx="26" cy="18" r="3" fill="#60a5fa" />
      <circle cx="29" cy="26" r="3" fill="#34d399" />
      <circle cx="20" cy="28" r="3" fill="#f472b6" />
    </Art>
  ),
  chess: (
    <Art>
      <path fill="#fff" d="M20 10h8l-2 6h6l-4 8h-8l-4-8h6zm-4 24h16v4H16zm2-8h12l2 8H16z" />
    </Art>
  ),
  mobile: (
    <Art>
      <path fill="#fff" d="M8 18h10v12H8zm22 0h10v12H30zM20 14h8v20h-8z" />
    </Art>
  ),
  general: (
    <Art>
      <path fill="#fff" d="M10 12h22a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H20l-8 6v-6h-2a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" />
    </Art>
  ),
  qa: (
    <Art>
      <circle cx="24" cy="24" r="14" fill="#fff" />
      <text x="24" y="30" textAnchor="middle" fill="#7a5c45" fontSize="20" fontWeight="800">
        ?
      </text>
    </Art>
  ),
  share: (
    <Art>
      <path fill="#fff" d="M10 18h10l3-4h15v20H10z" />
    </Art>
  ),
  newbie: (
    <Art>
      <path fill="#fff" d="M24 8c6 8 10 12 10 20a10 10 0 1 1-20 0c0-8 4-12 10-20z" />
    </Art>
  ),
  media: (
    <Art>
      <rect x="8" y="12" width="32" height="24" rx="4" fill="#fff" />
      <path fill="#8e6bb0" d="M20 18v12l12-6z" />
    </Art>
  ),
  hot: (
    <Art>
      <path fill="#fff" d="M24 8c2 7 10 10 10 18a10 10 0 1 1-20 2c0-6 5-9 6-14 3 3 5 5 5 10 0-6 0-10-1-16z" />
    </Art>
  )
};

const BG = {
  follow: "#22c55e",
  patriot: "#e23c2f",
  original: "#ff8a1a",
  techshare: "#3b82f6",
  locke: "#5b9cf6",
  aiplanet: "#3b82f6",
  delta: "#111111",
  kog: "#d4a017",
  summer: "#ff4d8d",
  model: "#f472b6",
  draw: "#f59e0b",
  pool: "#2dd4bf",
  miaoyi: "#b91c1c",
  notice: "#f59e0b",
  feedback: "#38bdf8",
  genshin: "#4c8dda",
  mc: "#3d8b5f",
  pubg: "#6b8f71",
  stardew: "#e08a3a",
  android: "#2f6f5e",
  theme: "#e06c75",
  chess: "#0ea5e9",
  mobile: "#ff6a00",
  general: "#7a8b9a",
  qa: "#7a5c45",
  share: "#b85c38",
  newbie: "#5b8c5a",
  media: "#8e6bb0",
  hot: "#e24b4a"
};

export default function BoardIcon({ slug, color, name = "", size = 52 }) {
  const bg = BG[slug] || color || "#94a3b8";
  const art = ARTS[slug] || (
    <Art>
      <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">
        {(name || "版").slice(0, 1)}
      </text>
    </Art>
  );
  return (
    <Tile bg={bg} size={size}>
      {art}
    </Tile>
  );
}
