function abortMs(ms) {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function getJson(url, extraHeaders) {
  const r = await fetch(url, {
    headers: extraHeaders
      ? { "User-Agent": "QinghuRadio/1.2", Accept: "application/json", ...extraHeaders }
      : { "User-Agent": "QinghuRadio/1.2", Accept: "application/json" },
    signal: abortMs(8000)
  });
  if (!r.ok) throw new Error("search-fail");
  return r.json();
}

function keyOf(title, artist) {
  return `${String(title || "").trim().toLowerCase()}|${String(artist || "").trim().toLowerCase()}`;
}

async function searchItunes(q) {
  const mapOne = (s) => ({
    source: "itunes",
    sourceId: String(s.trackId || ""),
    title: s.trackName || "",
    artist: s.artistName || "",
    album: s.collectionName || "",
    cover: String(s.artworkUrl100 || "").replace("100x100", "300x300"),
    url: s.previewUrl || "",
    preview: true,
    duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0,
    lyrics: ""
  });
  const run = async (country) => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10&country=${country}`;
    const d = await getJson(url);
    return (d.results || []).map(mapOne).filter((x) => x.title && x.url);
  };
  const [cn, us] = await Promise.all([run("cn").catch(() => []), run("us").catch(() => [])]);
  const seen = new Set();
  const out = [];
  [...cn, ...us].forEach((s) => {
    const k = keyOf(s.title, s.artist);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  });
  return out.slice(0, 12);
}

async function searchLyrics(q) {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
  const d = await getJson(url);
  const list = Array.isArray(d) ? d : [];
  return list.slice(0, 12).map((s) => ({
    source: "lrclib",
    sourceId: String(s.id || ""),
    title: s.trackName || s.name || "",
    artist: s.artistName || "",
    album: s.albumName || "",
    cover: "",
    url: "",
    duration: s.duration || 0,
    lyrics: s.syncedLyrics || s.plainLyrics || ""
  })).filter((x) => x.title);
}

async function lyricsFor(title, artist) {
  const q = `${title} ${artist || ""}`.trim();
  if (!q) return "";
  try {
    const hits = await searchLyrics(q);
    const exact = hits.find((h) => keyOf(h.title, h.artist) === keyOf(title, artist) && h.lyrics);
    return (exact && exact.lyrics) || (hits[0] && hits[0].lyrics) || "";
  } catch {
    return "";
  }
}

async function searchYy(q, base, cookie) {
  const root = String(base || "").replace(/\/$/, "");
  if (!root) return [];
  const ck = String(cookie || "").trim();
  const ckHead = ck ? { Cookie: ck } : null;
  const ckq = ck ? `&cookie=${encodeURIComponent(ck)}` : "";
  const d = await getJson(`${root}/search?keywords=${encodeURIComponent(q)}&type=1&limit=12`);
  const songs = (d && d.result && d.result.songs) || (d && d.songs) || [];
  const out = [];
  const list = songs.slice(0, 10);
  const filled = await Promise.all(list.map(async (s) => {
    const id = s.id || s.songId;
    if (!id) return null;
    let url = "";
    let lyrics = "";
    let trial = false;
    let reason = "";
    try {
      const u = await getJson(`${root}/song/url/v1?id=${id}&level=exhigh${ckq}`, ckHead);
      const hit = ((u && u.data) || [])[0] || {};
      url = hit.url || "";
      trial = !!hit.freeTrialInfo;
      if (!url) {
        try {
          const u2 = await getJson(`${root}/song/url/v1?id=${id}&level=standard${ckq}`, ckHead);
          const hit2 = ((u2 && u2.data) || [])[0] || {};
          if (hit2.url) {
            url = hit2.url;
            trial = !!hit2.freeTrialInfo;
          }
        } catch { /* keep empty url */ }
      }
      if (!url) reason = (hit.freeTrialPrivilege && hit.freeTrialPrivilege.cannotListenReason) ? "版权限制或无登录" : "无播放地址";
    } catch { /* keep empty url */ }
    try {
      const l = await getJson(`${root}/lyric?id=${id}${ckq}`, ckHead);
      lyrics = (l && l.lrc && l.lrc.lyric) || "";
    } catch { /* no lyric */ }
    const artist = Array.isArray(s.artists) ? s.artists.map((a) => a.name).filter(Boolean).join(" / ") : (s.ar ? s.ar.map((a) => a.name).join(" / ") : (s.artist || ""));
    const album = (s.album && s.album.name) || (s.al && s.al.name) || "";
    const cover = (s.album && (s.album.picUrl || s.album.blurPicUrl)) || (s.al && s.al.picUrl) || "";
    return {
      source: "yy",
      sourceId: String(id),
      title: s.name || s.title || "",
      artist: artist || "未知歌手",
      album,
      cover,
      url,
      trial,
      reason,
      duration: s.duration ? Math.round(s.duration / 1000) : (s.dt ? Math.round(s.dt / 1000) : 0),
      lyrics
    };
  }));
  filled.forEach((x) => { if (x) out.push(x); });
  return out.filter((x) => x.title);
}

async function searchSongs(q, yyBase, yyCookie) {
  const key = String(q || "").trim().slice(0, 40);
  if (!key) return [];
  const [itunes, lrc, yy] = await Promise.all([
    searchItunes(key).catch(() => []),
    searchLyrics(key).catch(() => []),
    searchYy(key, yyBase, yyCookie).catch(() => [])
  ]);
  const map = new Map();
  yy.forEach((s) => map.set(keyOf(s.title, s.artist), s));
  itunes.forEach((s) => {
    const k = keyOf(s.title, s.artist);
    const hit = map.get(k);
    if (hit) {
      // 网易云没给地址时，用预览源兜底，至少能听一段
      if (!hit.url && s.url) {
        hit.url = s.url;
        hit.preview = true;
        hit.reason = hit.reason || "仅预览，配置登录 Cookie 可听整首";
      }
      return;
    }
    map.set(k, s);
  });
  lrc.forEach((s) => {
    const k = keyOf(s.title, s.artist);
    const hit = map.get(k);
    if (hit) {
      if (!hit.lyrics) hit.lyrics = s.lyrics;
    } else if (s.lyrics) {
      map.set(k, s);
    }
  });
  return [...map.values()].slice(0, 16);
}

module.exports = { searchSongs, lyricsFor };
