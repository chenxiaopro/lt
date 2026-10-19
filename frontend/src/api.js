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
  if (!res.ok) {
    const fallback = res.status === 404
      ? "接口不存在，请覆盖更新后执行 bash 一键安装.sh 重启后端"
      : "请求失败";
    throw new Error(data.error || fallback);
  }
  return data;
}

export function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/video");
    const token = localStorage.getItem("qh_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("视频上传失败，请检查网络"));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.urls && data.urls[0]) {
        resolve(data.urls[0]);
      } else {
        reject(new Error(data.error || "视频上传失败"));
      }
    };
    const form = new FormData();
    form.append("files", file);
    xhr.send(form);
  });
}

export async function compressImage(file, maxSide = 1920, quality = 0.84) {
  if (!file || !/^image\/(jpeg|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 2 * 1024 * 1024) {
      bitmap.close && bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close && bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "image"}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now()
    });
  } catch {
    return file;
  }
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
