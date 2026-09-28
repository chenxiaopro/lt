import React from "react";

export function Ico({ children, size = 22, fill = "none", stroke }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke ?? (fill === "none" ? "currentColor" : "none")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const HomeIco = (p) => (
  <Ico {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></Ico>
);
export const GridIco = (p) => (
  <Ico {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Ico>
);
export const CompassIco = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 7-7-2 7-7z" /></Ico>
);
export const BellIco = (p) => (
  <Ico {...p}><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Ico>
);
export const UserIco = (p) => (
  <Ico {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5 19c1.2-3.2 3.4-5 7-5s5.8 1.8 7 5" /></Ico>
);
export const SearchIco = (p) => (
  <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" /></Ico>
);
export const PenIco = (p) => (
  <Ico {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></Ico>
);
export const GearIco = (p) => (
  <Ico {...p}>
    <path d="M10 3.2h4l.5 2c.6.2 1.2.5 1.7.9l2-.7 2 3.5-1.6 1.2c.1.5.1 1.1 0 1.6l1.6 1.2-2 3.5-2-.7c-.5.4-1.1.7-1.7.9l-.5 2h-4l-.5-2a7 7 0 0 1-1.7-.9l-2 .7-2-3.5 1.6-1.2a7 7 0 0 1 0-1.6L4.3 8.9l2-3.5 2 .7c.5-.4 1.1-.7 1.7-.9z" />
    <circle cx="12" cy="12" r="2.7" />
  </Ico>
);
export const ChatIco = ({ filled, ...p }) => (
  <Ico {...p} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : undefined}>
    <path d="M7 4.8h10A3.2 3.2 0 0 1 20.2 8v6.2A3.2 3.2 0 0 1 17 17.4h-4.4L8 20.6v-3.2H7A3.2 3.2 0 0 1 3.8 14.2V8A3.2 3.2 0 0 1 7 4.8z" />
  </Ico>
);
export const BackIco = (p) => (
  <Ico {...p}><path d="M15 5 8 12l7 7" /></Ico>
);
export const TrophyIco = (p) => (
  <Ico {...p}><path d="M8 5h8v3a4 4 0 0 1-8 0z" /><path d="M8 8H5a3 3 0 0 0 3 3M16 8h3a3 3 0 0 1-3 3" /><path d="M12 12v3M9 20h6M10 17h4" /></Ico>
);
export const GiftIco = (p) => (
  <Ico {...p}><rect x="4" y="10" width="16" height="10" rx="1" /><path d="M12 10v10M4 14h16M12 10c-2-4-5-4-5-2s2 2 5 2 5 0 5-2-3-2-5 2z" /></Ico>
);
export const CheckIco = (p) => (
  <Ico {...p}><path d="M5 12.5 10 17l9-10" /></Ico>
);
export const PlusIco = (p) => (
  <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>
);
export const CloseIco = (p) => (
  <Ico {...p}><path d="M6 6l12 12M18 6 6 18" /></Ico>
);
export const MenuIco = (p) => (
  <Ico {...p}><path d="M5 7h14M5 12h14M5 17h14" /></Ico>
);
export const RefreshIco = (p) => (
  <Ico {...p}><path d="M20 12a8 8 0 1 1-2.2-5.5" /><path d="M20 5v5h-5" /></Ico>
);
export const HeartIco = ({ filled, ...p }) => (
  <Ico {...p} fill={filled ? "currentColor" : "none"}><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" /></Ico>
);
export const ThumbIco = ({ filled, ...p }) => (
  <Ico {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M7 11v9H4v-9z" />
    <path d="M7 20h9.2a2 2 0 0 0 2-1.6l1.3-6A1.5 1.5 0 0 0 18 10h-5l.8-3.4A1.8 1.8 0 0 0 12 4.5L7 11" />
  </Ico>
);
export const EyeIco = (p) => (
  <Ico {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Ico>
);
export const StarIco = ({ filled, ...p }) => (
  <Ico {...p} fill={filled ? "currentColor" : "none"}><path d="M12 4.5 14.4 10l6 .5-4.6 3.8 1.5 5.7L12 16.8 6.7 20l1.5-5.7L3.6 10.5l6-.5z" /></Ico>
);
export const ShopIco = (p) => (
  <Ico {...p}><path d="M5 9h14l-1 11H6z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></Ico>
);
export const SoftIco = (p) => (
  <Ico {...p}><rect x="7" y="3.5" width="10" height="17" rx="2" /><path d="M10 7h4M10 10.5h4M10 14h2" /></Ico>
);
export const MusicIco = (p) => (
  <Ico {...p}><path d="M9 18V6l10-2v12" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="16" r="2" /></Ico>
);
export const UsersIco = (p) => (
  <Ico {...p}><circle cx="9" cy="8" r="3" /><path d="M3 19c.8-3 2.8-5 6-5s5.2 2 6 5" /><circle cx="17" cy="9" r="2.2" /><path d="M16 19c.4-1.6 1.4-3 3.2-3.8" /></Ico>
);
export const MicIco = (p) => (
  <Ico {...p}><rect x="9" y="4" width="6" height="10" rx="3" /><path d="M6 12a6 6 0 0 0 12 0M12 18v3" /></Ico>
);
export const ImageIco = (p) => (
  <Ico {...p}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m8 16 3-3 3 3 2-2 3 2" /></Ico>
);
export const CameraIco = (p) => (
  <Ico {...p}>
    <path d="M9 7 10.2 5h3.6L15 7h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4z" />
    <circle cx="12" cy="13" r="3.2" />
  </Ico>
);
export const AtIco = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M15.2 12v1.6a1.8 1.8 0 0 0 3.4-.4V12" />
  </Ico>
);
export const SmileIco = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.6 2.2 4 2.2 4-2.2 4-2.2" />
    <circle cx="9" cy="10" r="0.8" fill="currentColor" />
    <circle cx="15" cy="10" r="0.8" fill="currentColor" />
  </Ico>
);
export const ChevronIco = (p) => (
  <Ico {...p}><path d="M9 6l6 6-6 6" /></Ico>
);
export const ClockIco = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></Ico>
);
export const PlayIco = (p) => (
  <Ico {...p} fill="currentColor" stroke="none"><path d="M8 5.5v13l11-6.5z" /></Ico>
);
export const PauseIco = (p) => (
  <Ico {...p} fill="currentColor" stroke="none"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></Ico>
);
export const FlameIco = (p) => (
  <Ico {...p} fill="currentColor" stroke="none"><path d="M12 3s4 4.2 4 8.2c0 2.4-1.8 4.8-4 4.8S8 13.6 8 11.2C8 8.4 10 6 12 3zm0 10.6c1.4 0 2.4-1.2 2.4-2.6 0-1.2-.8-2.4-1.6-3.4-.2 1.6-1.4 2.6-1.4 4 0 1.1.3 2 1.6 2z" /></Ico>
);
