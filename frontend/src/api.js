export function timeAgo(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const day = Math.floor(h / 24);
  if (day < 10) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function formatHeat(n) {
  const v = Number(n) || 0;
  if (v >= 100000000) return `${(v / 100000000).toFixed(1).replace(/\.0$/, "")}亿`;
  if (v >= 10000) return `${(v / 10000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, "")}万`;
  return String(v);
}

export async function api(path, opts = {}) {
  const token = localStorage.getItem("qh_token");
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = opts.body instanceof FormData;
  if (!isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    ...opts,
    headers,
    body: isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

const HISTORY_KEY = "qh_history";

export function pushHistory(post) {
  if (!post || !post.id) return;
  const list = getHistory().filter((x) => x.id !== post.id);
  list.unshift({
    id: post.id,
    title: post.title,
    content: post.content,
    cover: (post.images && post.images[0]) || "",
    at: Date.now()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function removeHistory(id) {
  const list = getHistory().filter((x) => String(x.id) !== String(id));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}
