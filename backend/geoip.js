const http = require("http");
const https = require("https");
const net = require("net");

const TTL_OK = 7 * 24 * 3600 * 1000;
const TTL_FAIL = 10 * 60 * 1000;
const mem = new Map();
const inflight = new Map();
let dbRef = null;

function attachGeoDb(db) {
  dbRef = db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_geo_cache (
      ip TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function normalizeIp(raw) {
  let ip = String(raw || "").trim().replace(/^\[|\]$/g, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  const cut = ip.indexOf("%");
  if (cut >= 0) ip = ip.slice(0, cut);
  return ip;
}

function isPrivateIp(ip) {
  const ver = net.isIP(ip);
  if (ver === 0) return true;
  if (ver === 6) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80");
  }
  const p = ip.split(".").map(Number);
  if (p[0] === 10 || p[0] === 127) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
  return false;
}

function getClientIp(req) {
  const headers = req.headers || {};
  const picks = [
    headers["cf-connecting-ip"],
    headers["x-real-ip"],
    String(headers["x-forwarded-for"] || "").split(",")[0],
    headers["x-client-ip"],
    req.socket && req.socket.remoteAddress
  ];
  for (const raw of picks) {
    const ip = normalizeIp(raw);
    if (net.isIP(ip)) return ip;
  }
  return "127.0.0.1";
}

function blank(ip, extra) {
  return {
    ip,
    country: "",
    province: "",
    city: "",
    county: "",
    isp: "",
    text: "未知",
    label: "未知",
    source: "none",
    ...extra
  };
}

function tidy(s) {
  const t = String(s || "").trim();
  if (!t || t === "0" || t === "XX" || t === "未知" || /^null$/i.test(t)) return "";
  return t;
}

function shortName(s) {
  return tidy(s)
    .replace(/维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|省$/g, "")
    .replace(/市$/, "");
}

function parseChinaAddr(raw) {
  let s = String(raw || "").replace(/[\s\u3000]+/g, "");
  s = s.replace(/(?:电信|联通|移动|铁通|教育网|广电|阿里云|腾讯云|华为云|BGP).*$/, "");
  const out = { country: "", province: "", city: "", county: "" };
  if (s.startsWith("中国")) {
    out.country = "中国";
    s = s.slice(2);
  }
  const pm = s.match(/^(北京市|天津市|上海市|重庆市|内蒙古自治区|广西壮族自治区|西藏自治区|宁夏回族自治区|新疆维吾尔自治区|香港特别行政区|澳门特别行政区|.+?省)/);
  if (pm) {
    out.province = pm[1];
    s = s.slice(out.province.length);
  } else {
    const names = ["河北","山西","辽宁","吉林","黑龙江","江苏","浙江","安徽","福建","江西","山东","河南","湖北","湖南","广东","海南","四川","贵州","云南","陕西","甘肃","青海","台湾","内蒙古","广西","西藏","宁夏","新疆","香港","澳门","北京","天津","上海","重庆"];
    const hit = names.find((n) => s.startsWith(n));
    if (hit) {
      out.province = asProvince(hit);
      s = s.slice(hit.length);
    }
  }
  const cm = s.match(/^(.+?市)/);
  if (cm) {
    out.city = cm[1];
    s = s.slice(out.city.length);
  } else if (/^(北京|天津|上海|重庆)/.test(out.province)) {
    out.city = out.province;
  }
  const km = s.match(/^(.+?(?:区|县|旗|镇))/);
  if (km) out.county = km[1];
  if (out.province && !out.country) out.country = "中国";
  return out;
}

function asProvince(s) {
  const t = tidy(s);
  if (!t) return "";
  if (/省|自治区|特别行政区$/.test(t) || /(?:北京|天津|上海|重庆)市$/.test(t)) return t;
  if (["北京", "天津", "上海", "重庆"].includes(t)) return `${t}市`;
  if (["内蒙古", "广西", "西藏", "宁夏", "新疆"].includes(t)) return `${t}自治区`;
  if (["香港", "澳门"].includes(t)) return `${t}特别行政区`;
  return `${t}省`;
}

function asCity(s) {
  const t = tidy(s);
  if (!t) return "";
  if (/市$|州$|盟$/.test(t)) return t;
  return `${t}市`;
}

function finish(geo) {
  const country = tidy(geo.country);
  const province = tidy(geo.province);
  const city = tidy(geo.city);
  const county = tidy(geo.county);
  const isp = tidy(geo.isp);
  const parts = [];
  if (country) parts.push(country);
  if (province && shortName(province) !== country) parts.push(province);
  if (city && shortName(city) !== shortName(province)) parts.push(city);
  if (county && shortName(county) !== shortName(city)) parts.push(county);
  const text = parts.join(" ") || (geo.label || "未知");
  let label = "未知";
  if (county && city) label = `${shortName(city)}·${shortName(county)}`;
  else if (city && province && shortName(city) !== shortName(province)) label = `${shortName(province)}·${shortName(city)}`;
  else if (city) label = shortName(city);
  else if (province) label = shortName(province);
  else if (country) label = country;
  else if (geo.label) label = geo.label;
  return {
    ip: geo.ip,
    country,
    province,
    city,
    county,
    isp,
    text,
    label,
    source: geo.source || "none"
  };
}

function cacheGet(ip) {
  const hit = mem.get(ip);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.geo;
  if (!dbRef) return null;
  const row = dbRef.prepare("SELECT payload, updated_at FROM ip_geo_cache WHERE ip=?").get(ip);
  if (!row) return null;
  try {
    const geo = JSON.parse(row.payload);
    const ttl = geo.source === "none" ? TTL_FAIL : TTL_OK;
    if (Date.now() - row.updated_at > ttl) return null;
    mem.set(ip, { geo, at: row.updated_at, ttl });
    return geo;
  } catch {
    return null;
  }
}

function cacheSet(ip, geo) {
  const ttl = geo.source === "none" ? TTL_FAIL : TTL_OK;
  mem.set(ip, { geo, at: Date.now(), ttl });
  if (!dbRef) return;
  dbRef.prepare(
    "INSERT INTO ip_geo_cache (ip, payload, updated_at) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at"
  ).run(ip, JSON.stringify(geo), Date.now());
}

function fetchText(url, timeout = 2800) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, {
      headers: { "User-Agent": "QinghuSanlou/1.2", Accept: "application/json" },
      timeout
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        res.resume();
        reject(new Error("redirect"));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error("http " + res.statusCode));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

async function fromIpApi(ip) {
  const raw = await fetchText(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,countryCode,regionName,city,isp,query`);
  const d = JSON.parse(raw);
  if (!d || d.status !== "success") return null;
  const parsed = parseChinaAddr(`${d.country || ""}${d.regionName || ""}${d.city || ""}`);
  const cn = d.country === "中国" || d.countryCode === "CN";
  return finish({
    ip,
    country: d.country || parsed.country,
    province: parsed.province || (cn ? asProvince(d.regionName) : d.regionName),
    city: parsed.city || (cn ? asCity(d.city) : d.city),
    county: parsed.county,
    isp: d.isp,
    source: "ip-api"
  });
}

async function fromBaidu(ip) {
  const raw = await fetchText(`http://opendata.baidu.com/api.php?query=${encodeURIComponent(ip)}&co=&resource_id=6006&oe=utf8`);
  const d = JSON.parse(raw);
  const loc = d && d.data && d.data[0] && d.data[0].location;
  if (!loc) return null;
  const parsed = parseChinaAddr(loc);
  const ispHit = String(loc).match(/(电信|联通|移动|铁通|教育网|广电|阿里云|腾讯云|华为云)/);
  return finish({
    ip,
    country: parsed.country || "中国",
    province: parsed.province,
    city: parsed.city,
    county: parsed.county,
    isp: ispHit ? ispHit[1] : "",
    source: "baidu"
  });
}

async function fromTaobao(ip) {
  const raw = await fetchText(`http://ip.taobao.com/outGetIpInfo?ip=${encodeURIComponent(ip)}&accessKey=alibaba-inc`);
  const d = JSON.parse(raw);
  if (!d || Number(d.code) !== 0 || !d.data) return null;
  const x = d.data;
  const cn = x.country === "中国" || x.country_id === "CN";
  const county = tidy(x.county);
  return finish({
    ip,
    country: x.country,
    province: cn ? asProvince(x.region) : x.region,
    city: cn ? asCity(x.city) : x.city,
    county: county && county !== "XX" ? county : "",
    isp: x.isp,
    source: "taobao"
  });
}

function mergeGeo(ip, parts) {
  const base = blank(ip);
  for (const g of parts) {
    if (!g) continue;
    if (!base.country && g.country) base.country = g.country;
    if (!base.province && g.province) base.province = g.province;
    if (!base.city && g.city) base.city = g.city;
    if (!base.county && g.county) base.county = g.county;
    if (!base.isp && g.isp) base.isp = g.isp;
    if (g.source) base.source = base.source === "none" ? g.source : `${base.source}+${g.source}`;
  }
  if (base.country || base.province || base.city) return finish({ ...base, ip });
  return blank(ip);
}

async function fetchGeo(ip) {
  const settled = await Promise.allSettled([fromIpApi(ip), fromBaidu(ip), fromTaobao(ip)]);
  const parts = settled.map((x) => (x.status === "fulfilled" ? x.value : null));
  return mergeGeo(ip, parts);
}

function lookupIp(ip) {
  const addr = normalizeIp(ip);
  if (!net.isIP(addr)) return Promise.resolve(blank(addr, { text: "未知", label: "未知" }));
  if (isPrivateIp(addr)) {
    return Promise.resolve(finish({
      ip: addr,
      country: "",
      province: "",
      city: "",
      county: "",
      isp: "内网",
      label: "本机",
      source: "local"
    }));
  }
  const cached = cacheGet(addr);
  if (cached) return Promise.resolve(cached);
  if (inflight.has(addr)) return inflight.get(addr);
  const job = fetchGeo(addr)
    .then((geo) => {
      cacheSet(addr, geo);
      return geo;
    })
    .catch(() => blank(addr))
    .finally(() => inflight.delete(addr));
  inflight.set(addr, job);
  return job;
}

async function regionOf(req) {
  const geo = await lookupIp(getClientIp(req));
  return geo.label || "未知";
}

module.exports = {
  attachGeoDb,
  getClientIp,
  lookupIp,
  regionOf,
  normalizeIp,
  isPrivateIp
};
