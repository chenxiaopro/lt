const DRESS_KINDS = ["frame", "bubble", "card"];

const STYLES = {
  frame: ["shiba", "bird", "hamster", "duck", "puppy", "wave", "ice", "bunny", "blaze", "hat"],
  bubble: ["shiba", "bird", "hamster", "duck", "puppy", "corgi", "cloud", "cat", "black", "lantern"],
  card: ["wash", "seal", "neon", "paper"]
};

function hash32(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const lit = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lit, 1 - lit);
  const f = (n) => lit - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function hexOf(v, fb) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? String(v) : fb;
}

function slugOf(kind, style, prompt, i) {
  const base = `${kind}-${style}-${prompt}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const n = hash32(base).toString(36);
  return `${String(style || "shiba").slice(0, 6)}${n}`.slice(0, 12);
}

function pickPalette(prompt) {
  const s = String(prompt || "");
  if (/金|黄金|gold|灯笼|元宝/.test(s)) {
    return { a: "#f59e0b", b: "#fde68a", bg: "#fff7ed", card: "#fffbeb", ink: "#78350f", frames: ["shiba", "hat", "blaze"], bubbles: ["shiba", "corgi", "lantern"] };
  }
  if (/樱|粉|花|sakura|玫瑰/.test(s)) {
    return { a: "#fb7185", b: "#fecdd3", bg: "#fff1f2", card: "#fff7f8", ink: "#9f1239", frames: ["bunny", "hamster", "duck"], bubbles: ["cloud", "cat", "hamster"] };
  }
  if (/霓虹|neon|电|赛博|炫/.test(s)) {
    return { a: "#22d3ee", b: "#a78bfa", bg: "#0f172a", card: "#1e293b", ink: "#e0f2fe", frames: ["blaze", "wave", "ice"], bubbles: ["black", "lantern", "cloud"] };
  }
  if (/像素|pixel|方块|游戏/.test(s)) {
    return { a: "#111827", b: "#22c55e", bg: "#ecfdf5", card: "#ffffff", ink: "#064e3b", frames: ["bunny", "hat", "puppy"], bubbles: ["black", "puppy", "corgi"] };
  }
  if (/冰|蓝|海|霜|雪/.test(s)) {
    return { a: "#38bdf8", b: "#e0f2fe", bg: "#f0f9ff", card: "#ffffff", ink: "#0c4a6e", frames: ["wave", "ice", "bird"], bubbles: ["bird", "cloud", "lantern"] };
  }
  if (/墨|黑|夜|暗/.test(s)) {
    return { a: "#111827", b: "#f59e0b", bg: "#111827", card: "#1f2937", ink: "#fde68a", frames: ["hat", "blaze", "shiba"], bubbles: ["black", "cat", "shiba"] };
  }
  if (/纸|信|手账|气泡/.test(s)) {
    return { a: "#fff7ed", b: "#fb7185", bg: "#fff7ed", card: "#fffbeb", ink: "#9f1239", frames: ["duck", "hamster", "bunny"], bubbles: ["cloud", "hamster", "cat"] };
  }
  if (/狐|耳|挂/.test(s)) {
    return { a: "#ea580c", b: "#fed7aa", bg: "#fff7ed", card: "#ffffff", ink: "#7c2d12", frames: ["shiba", "duck", "hat"], bubbles: ["shiba", "corgi", "cat"] };
  }
  if (/龙|红|章|楼/.test(s)) {
    return { a: "#ff2442", b: "#fbbf24", bg: "#fff1f2", card: "#ffffff", ink: "#881337", frames: ["blaze", "shiba", "bunny"], bubbles: ["lantern", "shiba", "corgi"] };
  }
  const h = hash32(s) % 360;
  return {
    a: hslToHex(h, 78, 52),
    b: hslToHex((h + 34) % 360, 70, 68),
    bg: hslToHex(h, 40, 96),
    card: "#ffffff",
    ink: hslToHex(h, 40, 18),
    frames: ["shiba", "bird", "puppy"],
    bubbles: ["shiba", "bird", "corgi"]
  };
}

function nameVariants(kind, prompt) {
  const raw = String(prompt || "新装扮").replace(/\s+/g, "").slice(0, 6) || "新装扮";
  if (kind === "bubble") return [`${raw}泡`, `${raw}框`, `${raw}笺`].map((x) => x.slice(0, 8));
  if (kind === "card") return [`${raw}卡`, `${raw}笺`, `${raw}页`].map((x) => x.slice(0, 8));
  return [`${raw}框`, `${raw}环`, `${raw}冕`].map((x) => x.slice(0, 8));
}

function markOf(kind, prompt, i) {
  const s = String(prompt || "");
  if (/金/.test(s)) return "金";
  if (/樱|花/.test(s)) return "樱";
  if (/灯/.test(s)) return "灯";
  if (/狐/.test(s)) return "狐";
  if (kind === "bubble") return ["泡", "框", "笺"][i] || "泡";
  if (kind === "card") return ["卡", "页", "笺"][i] || "卡";
  return ["框", "环", "冕"][i] || "框";
}

function descOf(kind, style, prompt) {
  const label = {
    shiba: "柴犬绳环",
    bird: "青鸟绳环",
    hamster: "仓鼠绳环",
    duck: "冲鸭绳环",
    puppy: "小狗绳环",
    wave: "海浪环",
    ice: "冰晶环",
    bunny: "萌耳耳机",
    blaze: "焰光环",
    hat: "牛仔帽檐",
    corgi: "柯基边框",
    cloud: "云朵边框",
    cat: "橘猫边框",
    black: "小黑边框",
    lantern: "灯笼边框",
    wash: "水彩铺底",
    seal: "红章点缀",
    neon: "霓虹描边",
    paper: "信纸折角"
  }[style] || "定制样式";
  const kindName = { frame: "头像框", bubble: "聊天框", card: "主页装扮" }[kind] || "装扮";
  return `${String(prompt || kindName).slice(0, 8)} · ${label}`.slice(0, 30);
}

function normalizeKind(kind) {
  if (kind === "pendant") return "frame";
  if (kind === "theme") return "card";
  return DRESS_KINDS.includes(kind) ? kind : "frame";
}

function designDress(kind, prompt) {
  const k = normalizeKind(kind);
  const pal = pickPalette(prompt);
  const pool = k === "bubble" ? pal.bubbles : k === "frame" ? pal.frames : STYLES[k];
  const names = nameVariants(k, prompt);
  return pool.slice(0, 3).map((style, i) => {
    const flip = i === 1;
    const color = flip ? pal.b : pal.a;
    const color2 = flip ? pal.a : pal.b;
    return {
      kind: k,
      name: names[i],
      mark: markOf(k, prompt, i),
      color,
      color2,
      style,
      desc: descOf(k, style, prompt),
      slug: slugOf(k, style, prompt, i),
      bg: pal.bg,
      card: pal.card,
      ink: pal.ink
    };
  });
}

function extractJson(text) {
  const s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : s;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

function mergeDraft(base, d) {
  if (!d) return base;
  const next = { ...base };
  if (d.name) next.name = String(d.name).replace(/\s+/g, "").slice(0, 8) || base.name;
  if (d.mark) next.mark = String(d.mark).slice(0, 2);
  next.color = hexOf(d.color, base.color);
  next.color2 = hexOf(d.color2, base.color2);
  next.bg = hexOf(d.bg, base.bg);
  next.card = hexOf(d.card, base.card);
  next.ink = hexOf(d.ink, base.ink);
  if (d.desc) next.desc = String(d.desc).slice(0, 30);
  if (d.slug) next.slug = String(d.slug).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || base.slug;
  const allowed = STYLES[base.kind] || [];
  if (d.style) {
    const st = String(d.style).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16);
    if (allowed.includes(st)) next.style = st;
  }
  return next;
}

async function designDressAsync(kind, prompt) {
  const drafts = designDress(kind, prompt);
  const key = process.env.USER_LLM_API_KEY || "";
  if (!key) return { drafts, source: "local" };
  const k = normalizeKind(kind);
  const styles = (STYLES[k] || []).join("/");
  try {
    const base = String(process.env.USER_LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
    const model = process.env.USER_LLM_MODEL || "deepseek-v4-pro";
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: `你是 QQ 个性装扮设计师。只输出 JSON：{"drafts":[{name,mark,color,color2,bg,card,ink,desc,slug,style,kind}]} 共3套可视化方案。kind 只能是 frame/bubble/card。style 只能是 ${styles}。color/color2/bg/card/ink 必须是 #RRGGBB。name 不超过8字。frame=头像框(绳环上坐角色)，bubble=聊天框(圆角框+角落贴纸)，card=空间主页装扮。`
          },
          { role: "user", content: `类型:${k}。需求:${prompt}` }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) return { drafts, source: "local" };
    const data = await r.json();
    const text = (((data || {}).choices || [])[0] || {}).message ? data.choices[0].message.content : "";
    const json = extractJson(text);
    const extra = Array.isArray(json.drafts) ? json.drafts : (json.name ? [json] : []);
    extra.slice(0, 3).forEach((d, i) => {
      if (drafts[i]) drafts[i] = mergeDraft(drafts[i], d);
    });
    return { drafts, source: "ai" };
  } catch {
    return { drafts, source: "local" };
  }
}

module.exports = { DRESS_KINDS, STYLES, designDress, designDressAsync, hexOf, normalizeKind };
