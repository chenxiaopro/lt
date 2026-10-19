export function imgUrl(url?: string, size = 200) {
  if (!url) return "";
  const https = url.replace(/^http:\/\//, "https://");
  const join = https.includes("?") ? "&" : "?";
  return `${https}${join}param=${size}y${size}`;
}

export function formatCount(n?: number) {
  const value = n ?? 0;
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return String(value);
}

export function formatDuration(ms?: number) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClock(seconds?: number) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const RECENT_KEY = "chiyun-recent";
const LIKED_KEY = "chiyun-liked";
const MODE_KEY = "chiyun-mode";
const QUALITY_KEY = "chiyun-quality";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export { RECENT_KEY, LIKED_KEY, MODE_KEY, QUALITY_KEY };
