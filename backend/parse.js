const dns = require("dns").promises;
const net = require("net");

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

function pickUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[),.;]+$/, "") : "";
}

function detectPlatform(text) {
  const s = String(text || "").toLowerCase();
  if (/douyin|iesdouyin|v\.douyin/.test(s)) return "douyin";
  if (/kuaishou|gifshow|chenzhongtech|v\.kuaishou/.test(s)) return "kuaishou";
  if (/xiaohongshu|xhslink|xhscdn/.test(s)) return "xiaohongshu";
  if (/bilibili|b23\.tv/.test(s)) return "bilibili";
  if (/weibo\.|miaopai/.test(s)) return "weibo";
  if (/pipix/.test(s)) return "pipix";
  if (/toutiao/.test(s)) return "toutiao";
  if (/tiktok/.test(s)) return "tiktok";
  return "unknown";
}

function isPrivateIp(ip) {
  if (!ip) return true;
  let v = String(ip);
  if (v.startsWith("::ffff:")) v = v.slice(7);
  if (net.isIP(v) === 4) {
    const p = v.split(".").map(Number);
    const a = p[0];
    const b = p[1];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIP(ip) === 6) {
    const n = String(ip).toLowerCase();
    if (n === "::1" || n === "::") return true;
    if (n.startsWith("fc") || n.startsWith("fd") || n.startsWith("fe80")) return true;
    return false;
  }
  return true;
}

function isBlockedHost(host) {
  const h = String(host || "").toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal") return true;
  if (net.isIP(h) && isPrivateIp(h)) return true;
  return false;
}

async function assertPublicUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || ""));
  } catch {
    throw new Error("地址无效");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("仅支持 http/https");
  if (u.username || u.password) throw new Error("地址不安全");
  if (isBlockedHost(u.hostname)) throw new Error("地址不安全");
  const looked = await dns.lookup(u.hostname, { all: true });
  if (!looked.length) throw new Error("地址无法解析");
  for (const rec of looked) {
    if (isPrivateIp(rec.address)) throw new Error("地址不安全");
  }
  return u;
}

async function safeFetch(url, opts = {}, hops = 0) {
  if (hops > 6) throw new Error("跳转过多");
  const u = await assertPublicUrl(url);
  const ctrl = new AbortController();
  const ms = opts.timeout || 18000;
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(u.href, {
      method: opts.method || "GET",
      headers: {
        "User-Agent": UA,
        Accept: opts.accept || "*/*",
        ...(opts.headers || {})
      },
      redirect: "manual",
      signal: ctrl.signal
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("无效跳转");
      return safeFetch(new URL(loc, u.href).href, opts, hops + 1);
    }
    return { res, url: u.href };
  } catch (e) {
    if (e && e.name === "AbortError") throw new Error("请求超时");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function getPath(obj, path) {
  if (!path) return undefined;
  const parts = String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function firstHttp(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    if (Array.isArray(v)) {
      const s = firstHttp(...v);
      if (s) return s;
    } else if (v && typeof v === "object") {
      const s = firstHttp(v.url, v.src, v.playAddr, v.play_addr, v.uri, v.url_list);
      if (s) return s;
    }
  }
  return "";
}

function asList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(asList).filter((x) => typeof x === "string" && /^https?:\/\//i.test(x));
  if (typeof v === "string" && /^https?:\/\//i.test(v)) return [v];
  if (typeof v === "object") return asList(v.url_list || v.url || v.src);
  return [];
}

const PLATFORM_ALIAS = {
  抖音: "douyin",
  douyin: "douyin",
  快手: "kuaishou",
  kuaishou: "kuaishou",
  小红书: "xiaohongshu",
  xiaohongshu: "xiaohongshu",
  哔哩哔哩: "bilibili",
  bilibili: "bilibili",
  微博: "weibo",
  weibo: "weibo",
  皮皮虾: "pipix",
  pipix: "pipix",
  头条: "toutiao",
  toutiao: "toutiao",
  tiktok: "tiktok"
};

function mapPlatform(p) {
  const raw = String(p || "").trim();
  if (PLATFORM_ALIAS[raw]) return PLATFORM_ALIAS[raw];
  const s = raw.toLowerCase();
  if (PLATFORM_ALIAS[s]) return PLATFORM_ALIAS[s];
  if (/douyin|iesdouyin/.test(s)) return "douyin";
  if (/kuaishou|gifshow/.test(s)) return "kuaishou";
  if (/xiaohongshu|xhs/.test(s)) return "xiaohongshu";
  return s || "unknown";
}

function personName(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v.nickname || v.name || v.author || "");
  return "";
}

function personAvatar(v) {
  if (!v) return "";
  if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  if (typeof v === "object") return firstHttp(v.avatar, v.avatar_thumb, v.head, v.headUrl, v.url);
  return "";
}

function unwrapJson(body) {
  let v = body;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) throw new Error("远程接口返回为空");
    v = JSON.parse(t);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("{") || t.startsWith("[")) v = JSON.parse(t);
  }
  return v;
}

function remoteFailed(json) {
  if (!json || typeof json !== "object") return false;
  const msg = String(json.msg || json.message || json.error || "");
  const code = json.code != null ? json.code : json.status;
  if (/成功/.test(msg)) return false;
  if (/失败|次数|过期|未授权|无效|禁止/.test(msg)) return true;
  if (code == null || code === "") return false;
  const s = String(code).toLowerCase();
  if (["0001", "0000", "0", "1", "200", "ok", "success", "true"].includes(s)) return false;
  if (["-1", "400", "401", "403", "404", "500", "fail", "error", "false"].includes(s)) return true;
  return false;
}

function kindOf(data, video, pics, clips) {
  const t = Number(data && data.type);
  if (t === 3 || (clips && clips.length)) return "live";
  if (t === 2 || ((pics || []).length && !video)) return "images";
  if (t === 1 || video) return "video";
  return "";
}

function cleanPlay(u) {
  return String(u || "").replace("playwm", "play");
}

function normalizeMedia(data, platform) {
  const video = cleanPlay(
    firstHttp(
      data.playAddr,
      data.play_addr,
      data.nwm_video_url,
      data.videoUrl,
      data.video,
      data.url,
      getPath(data, "video.play_addr.url_list"),
      getPath(data, "video.playAddr")
    )
  );
  const pics = asList(data.pics || data.images || data.image_list || data.img || data.imageUrl);
  const clips = asList(data.liveAddr || data.live_addr || data.clips || data.lives);
  const music = firstHttp(
    data.music && typeof data.music === "object" ? data.music.url : data.music,
    data.musicUrl,
    data.audio,
    getPath(data, "music.play_url.url_list"),
    getPath(data, "music.url")
  );
  const cover = firstHttp(data.cover, data.coverUrl, data.origin_cover, getPath(data, "video.cover.url_list"));
  const title = String(data.title || data.desc || data.content || data.text || "").slice(0, 200);
  const author = personName(data.author || data.nickname || getPath(data, "author.nickname")).slice(0, 40);
  const fallbackVideo = cleanPlay(firstHttp(data.video_backup, Array.isArray(data.video_backup) ? data.video_backup[0] : ""));
  const play = video || fallbackVideo;
  const kind = kindOf(data, play, pics, clips);
  return {
    ok: !!(play || pics.length || clips.length),
    platform: mapPlatform(platform || data.platform || "unknown"),
    kind,
    title,
    author,
    avatar: personAvatar(data.author) || firstHttp(data.avatar, data.authorAvatar, data.head),
    cover,
    video: play,
    pics,
    clips,
    music,
    videoBackup: fallbackVideo && play && fallbackVideo !== play ? fallbackVideo : ""
  };
}

function walkFind(obj, pred, depth = 0) {
  if (!obj || depth > 12) return null;
  if (pred(obj)) return obj;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const f = walkFind(x, pred, depth + 1);
      if (f) return f;
    }
  } else if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const f = walkFind(obj[k], pred, depth + 1);
      if (f) return f;
    }
  }
  return null;
}

function fromAweme(aweme, platform) {
  const play = cleanPlay(
    firstHttp(
      getPath(aweme, "video.play_addr.url_list"),
      getPath(aweme, "video.play_addr_h264.url_list"),
      getPath(aweme, "video.download_addr.url_list")
    )
  );
  const cover = firstHttp(getPath(aweme, "video.origin_cover.url_list"), getPath(aweme, "video.cover.url_list"));
  const images = (aweme.images || []).flatMap((im) => asList(im.url_list || im.download_url_list));
  const music = firstHttp(getPath(aweme, "music.play_url.url_list"));
  return {
    ok: !!(play || images.length),
    platform,
    kind: images.length && !play ? "images" : play ? "video" : "",
    title: String(aweme.desc || aweme.title || "").slice(0, 200),
    author: String(getPath(aweme, "author.nickname") || "").slice(0, 40),
    avatar: firstHttp(getPath(aweme, "author.avatar_thumb.url_list"), getPath(aweme, "author.avatar_larger.url_list")),
    cover,
    video: play,
    pics: images,
    clips: [],
    music,
    videoBackup: ""
  };
}

function buildRequestUrl(apiUrl, shareUrl, parseType) {
  const raw = String(apiUrl || "");
  let href = raw.includes("{url}") ? raw.replace(/\{url\}/g, encodeURIComponent(shareUrl)) : raw;
  try {
    const u = new URL(href);
    if (!raw.includes("{url}")) u.searchParams.set("url", shareUrl);
    if (u.searchParams.has("type") || /chuangye\.site|syapi/i.test(u.host)) {
      const platform = detectPlatform(shareUrl);
      const want = String(parseType || "auto");
      if (want === "video" || want === "images") u.searchParams.set("type", "dsp");
      else u.searchParams.set("type", platform === "xiaohongshu" ? "xiaohongshu" : "dsp");
    }
    return u.href;
  } catch {
    if (raw.includes("{url}")) return href;
    const u = new URL(raw);
    u.searchParams.set("url", shareUrl);
    return u.href;
  }
}

async function parseRemote(apiRow, text, parseType) {
  const share = pickUrl(text) || String(text || "").trim();
  const reqUrl = buildRequestUrl(apiRow.api_url, share, parseType);
  const { res } = await safeFetch(reqUrl, { timeout: 20000, accept: "application/json,text/plain,*/*" });
  const body = await res.text();
  let json;
  try {
    json = unwrapJson(body);
  } catch {
    throw new Error("远程接口返回不是 JSON");
  }
  if (remoteFailed(json)) {
    throw new Error(String((json && (json.msg || json.message || json.error)) || "远程解析失败"));
  }
  const platform = apiRow.slug === "*" ? detectPlatform(text) : apiRow.slug;
  if (apiRow.resp_data || apiRow.resp_video || apiRow.resp_title || apiRow.resp_img) {
    const data = apiRow.resp_data ? getPath(json, apiRow.resp_data) || json : json.data || json.result || json;
    const mapped = {
      ...(data && typeof data === "object" ? data : {}),
      playAddr: apiRow.resp_video ? getPath(data, apiRow.resp_video) || getPath(json, apiRow.resp_video) : undefined,
      title: apiRow.resp_title ? getPath(data, apiRow.resp_title) || getPath(json, apiRow.resp_title) : undefined,
      pics: apiRow.resp_img ? getPath(data, apiRow.resp_img) || getPath(json, apiRow.resp_img) : undefined
    };
    const n = normalizeMedia(mapped, platform);
    if (!n.ok) throw new Error("远程接口未返回媒体");
    return n;
  }
  const nested = json && typeof json.data === "object" && json.data && (json.data.playAddr || json.data.pics || json.data.video)
    ? json.data
    : json.result && typeof json.result === "object"
      ? json.result
      : json;
  const n = normalizeMedia(nested, platform || (nested && nested.platform));
  if (!n.ok) throw new Error("远程接口未返回媒体");
  return n;
}

async function parseDouyin(text) {
  const start = pickUrl(text);
  if (!start) throw new Error("未找到链接");
  const { res } = await safeFetch(start, { timeout: 16000, accept: "text/html,*/*", headers: { Accept: "text/html" } });
  const html = await res.text();
  const router = html.match(/_ROUTER_DATA\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
  if (router) {
    try {
      const j = JSON.parse(router[1]);
      const aweme = walkFind(j, (o) => o && (o.aweme_id || o.awemeId) && (o.video || o.images));
      if (aweme) {
        const n = fromAweme(aweme, "douyin");
        if (n.ok) return n;
      }
    } catch {
      /* fall through */
    }
  }
  const render = html.match(/_RENDER_DATA\s*=\s*"([^"]+)"/);
  if (render) {
    try {
      const j = JSON.parse(decodeURIComponent(render[1]));
      const aweme = walkFind(j, (o) => o && o.aweme_id && (o.video || o.images));
      if (aweme) {
        const n = fromAweme(aweme, "douyin");
        if (n.ok) return n;
      }
    } catch {
      /* fall through */
    }
  }
  const idm = html.match(/video\/(\d{15,})/) || start.match(/video\/(\d{15,})/);
  if (idm) {
    const api = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${idm[1]}`;
    const r2 = await safeFetch(api, { timeout: 12000, accept: "application/json" });
    const j = await r2.res.json();
    const item = getPath(j, "item_list.0");
    if (item) {
      const n = fromAweme(item, "douyin");
      if (n.ok) return n;
    }
  }
  throw new Error("抖音解析失败");
}

async function parseKuaishou(text) {
  const start = pickUrl(text);
  if (!start) throw new Error("未找到链接");
  const { res } = await safeFetch(start, {
    timeout: 16000,
    accept: "text/html,*/*",
    headers: { Accept: "text/html", Cookie: "did=web_qinghu" }
  });
  const html = await res.text();
  const blobs = [
    html.match(/window\.INIT_STATE\s*=\s*(\{[\s\S]*?\});/),
    html.match(/__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});/),
    html.match(/window\.pageData\s*=\s*(\{[\s\S]*?\});/)
  ];
  for (const m of blobs) {
    if (!m) continue;
    try {
      const j = JSON.parse(m[1]);
      const photo = walkFind(
        j,
        (o) => o && typeof o === "object" && (o.photoUrl || o.mp4Url || (o.photo && (o.photo.photoUrl || o.photo.mp4Url)))
      );
      if (photo) {
        const node = photo.photo || photo;
        const n = normalizeMedia(
          {
            playAddr: node.photoUrl || node.mp4Url || node.mainMvUrl,
            cover: node.coverUrl || node.cover,
            title: node.caption || node.title,
            author: getPath(node, "user.name") || node.userName,
            pics: node.atlas || node.images
          },
          "kuaishou"
        );
        if (n.ok) return n;
      }
    } catch {
      /* try next blob */
    }
  }
  const ogVideo =
    html.match(/property="og:video(?::url)?"[^>]*content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"[^>]*property="og:video/i);
  const ogTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/i);
  const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/i);
  const mp4 = html.match(/https?:[^"'\\\s]+\.mp4[^"'\\\s]*/);
  const video = (ogVideo && ogVideo[1]) || (mp4 && mp4[0]) || "";
  const n = normalizeMedia(
    {
      playAddr: video,
      cover: ogImage && ogImage[1],
      title: ogTitle && ogTitle[1]
    },
    "kuaishou"
  );
  if (n.ok) return n;
  throw new Error("快手解析失败");
}

function pickApis(apis, platform) {
  const enabled = (apis || []).filter((a) => Number(a.enabled) === 1);
  const bySort = (a, b) => (a.sort || 0) - (b.sort || 0) || (a.id || 0) - (b.id || 0);
  const spec = enabled.filter((a) => a.slug === platform).sort(bySort);
  const wild = enabled.filter((a) => a.slug === "*").sort(bySort);
  return spec.concat(wild);
}

async function parseShare(text, apis, parseType) {
  const platform = detectPlatform(text);
  const queue = pickApis(apis, platform);
  let lastErr = null;
  for (const row of queue) {
    try {
      const result = await parseRemote(row, text, parseType);
      return { ...result, apiId: row.id };
    } catch (e) {
      lastErr = e;
    }
  }
  if (platform === "douyin") {
    const result = await parseDouyin(text);
    return { ...result, apiId: 0 };
  }
  if (platform === "kuaishou") {
    const result = await parseKuaishou(text);
    return { ...result, apiId: 0 };
  }
  if (lastErr) throw lastErr;
  throw new Error("暂不支持该平台");
}

module.exports = {
  pickUrl,
  detectPlatform,
  parseShare,
  assertPublicUrl,
  safeFetch,
  isPrivateIp
};
