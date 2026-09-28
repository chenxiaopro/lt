function abortMs(ms) {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function getJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "QinghuRadio/1.2", Accept: "application/json" },
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

async function searchSongs(q) {
  const key = String(q || "").trim().slice(0, 40);
  if (!key) return [];
  const [itunes, lrc] = await Promise.all([
    searchItunes(key).catch(() => []),
    searchLyrics(key).catch(() => [])
  ]);
  const map = new Map();
  itunes.forEach((s) => map.set(keyOf(s.title, s.artist), s));
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
