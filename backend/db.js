const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "forum.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  bio TEXT DEFAULT '',
  gender TEXT DEFAULT '保密',
  city TEXT DEFAULT '未知',
  exp INTEGER DEFAULT 0,
  gourd INTEGER DEFAULT 0,
  title TEXT DEFAULT '葫芦籽',
  created_at TEXT NOT NULL,
  last_checkin TEXT,
  checkin_streak INTEGER DEFAULT 0,
  ip_region TEXT DEFAULT '广东'
);
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  cover TEXT,
  desc TEXT DEFAULT '',
  color TEXT DEFAULT '#FF6A00',
  post_count INTEGER DEFAULT 0,
  follow_count INTEGER DEFAULT 0,
  today_posts INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  board_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,
  is_essence INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  ip_region TEXT DEFAULT '广东',
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(board_id) REFERENCES boards(id)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  floor INTEGER DEFAULT 1,
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  ip_region TEXT DEFAULT '广东',
  FOREIGN KEY(post_id) REFERENCES posts(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);
CREATE TABLE IF NOT EXISTS collects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, post_id)
);
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  from_user_id INTEGER,
  type TEXT NOT NULL,
  post_id INTEGER,
  content TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  gourd INTEGER DEFAULT 0,
  exp INTEGER DEFAULT 0,
  UNIQUE(user_id, day)
);
CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  cover TEXT,
  stock INTEGER DEFAULT 99,
  desc TEXT DEFAULT ''
);
`);

function now() {
  return new Date().toISOString();
}

const LEVELS = [
  { level: 1, exp: 0, title: "葫芦籽", color: "#9ca3af" },
  { level: 2, exp: 20, title: "葫芦芽", color: "#a8a29e" },
  { level: 3, exp: 50, title: "小葫芦", color: "#65a30d" },
  { level: 4, exp: 110, title: "小葫芦", color: "#4d7c0f" },
  { level: 5, exp: 200, title: "青葫芦", color: "#16a34a" },
  { level: 6, exp: 300, title: "青葫芦", color: "#15803d" },
  { level: 7, exp: 430, title: "熟葫芦", color: "#0d9488" },
  { level: 8, exp: 590, title: "金葫芦", color: "#d97706" },
  { level: 9, exp: 770, title: "金葫芦", color: "#b45309" },
  { level: 10, exp: 980, title: "葫芦精", color: "#ea580c" },
  { level: 11, exp: 1200, title: "葫芦侠", color: "#f97316" },
  { level: 12, exp: 1450, title: "葫芦侠", color: "#c2410c" },
  { level: 13, exp: 1730, title: "飞檐侠", color: "#e11d48" },
  { level: 14, exp: 2040, title: "飞檐侠", color: "#be123c" },
  { level: 15, exp: 2360, title: "三楼侠", color: "#ff2442" },
  { level: 16, exp: 2700, title: "三楼侠", color: "#e11d48" },
  { level: 17, exp: 3080, title: "楼主侠", color: "#7c3aed" },
  { level: 18, exp: 3480, title: "楼主侠", color: "#6d28d9" },
  { level: 19, exp: 3900, title: "青葫仙", color: "#5b21b6" },
  { level: 20, exp: 4340, title: "三楼传说", color: "#111827" }
];

const DEFAULT_EXP_RULES = [
  { id: "login", group: "日常任务", name: "每日登录", exp: 50, note: "" },
  { id: "checkin", group: "日常任务", name: "板块签到", exp: 5, note: "连签天数越多，经验越多" },
  { id: "post", group: "日常任务", name: "分享帖子、资讯", exp: 5, note: "" },
  { id: "comment", group: "日常任务", name: "评论", exp: 10, note: "" },
  { id: "like", group: "日常任务", name: "点赞", exp: 5, note: "" },
  { id: "profile", group: "新手任务", name: "完善个人资料", exp: 100, note: "" },
  { id: "photo", group: "新手任务", name: "上传照片到相册", exp: 100, note: "" }
];

function getSetting(key, fallback) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key);
    if (!row) return fallback;
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function setSetting(key, value) {
  ensureSettings();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(key, JSON.stringify(value));
}

function ensureSettings() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function isInstalled() {
  try {
    return db.prepare("SELECT COUNT(*) AS c FROM users").get().c > 0;
  } catch {
    return false;
  }
}

function getSite() {
  return {
    installed: isInstalled(),
    name: getSetting("site_name", "青葫三楼"),
    tagline: getSetting("site_tagline", "幸运、趣事尽在青葫社区")
  };
}

function ensureAdminLogs() {
  db.exec(`CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    target_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );`);
}

function logAdmin(adminId, action, targetId, detail) {
  ensureAdminLogs();
  db.prepare("INSERT INTO admin_logs (admin_id, target_id, action, detail, created_at) VALUES (?,?,?,?,?)")
    .run(adminId, targetId || null, action, String(detail || "").slice(0, 200), now());
}

function adminLogs(limit = 50) {
  ensureAdminLogs();
  return db
    .prepare(
      `SELECT l.*, a.nickname AS admin_nickname, u.nickname AS target_nickname
       FROM admin_logs l
       LEFT JOIN users a ON a.id = l.admin_id
       LEFT JOIN users u ON u.id = l.target_id
       ORDER BY l.id DESC LIMIT ?`
    )
    .all(limit);
}

function wipeCommunity() {
  const tables = [
    "notifications",
    "likes",
    "collects",
    "follows",
    "checkins",
    "comments",
    "dms",
    "user_items",
    "user_medals",
    "user_honors",
    "board_mods",
    "board_mutes",
    "posts",
    "softwares",
    "tracks",
    "admin_logs",
    "users",
    "boards"
  ];
  db.pragma("foreign_keys = OFF");
  for (const name of tables) {
    try {
      db.prepare(`DELETE FROM ${name}`).run();
    } catch {
      /* table may not exist yet */
    }
  }
  try {
    db.exec(
      "DELETE FROM sqlite_sequence WHERE name IN ('users','posts','comments','likes','collects','follows','notifications','checkins','user_items','dms','softwares','tracks','boards')"
    );
  } catch {
    /* sqlite_sequence is optional */
  }
  db.pragma("foreign_keys = ON");
}

function installFresh(input) {
  const siteName = String((input && input.siteName) || "").trim().slice(0, 20);
  const tagline = String((input && input.tagline) || "幸运、趣事尽在社区").trim().slice(0, 40);
  const username = String((input && input.username) || "").trim();
  const password = String((input && input.password) || "");
  const nickname = String((input && input.nickname) || username).trim().slice(0, 16);
  if (!siteName) throw new Error("请填写社区名称");
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) throw new Error("站长账号需为 3-16 位字母数字或下划线");
  if (password.length < 6) throw new Error("站长密码至少 6 位");
  if (!nickname) throw new Error("请填写站长昵称");
  wipeCommunity();
  ensureSettings();
  db.prepare(
    `INSERT INTO users (username, password_hash, nickname, avatar, bio, gender, city, exp, gourd, title, created_at, ip_region, role, birthday)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    username,
    bcrypt.hashSync(password, 8),
    nickname,
    avatarOf(username),
    "这座楼的站长。",
    "保密",
    "未知",
    0,
    0,
    titleOf(1),
    now(),
    "未知",
    "admin",
    ""
  );
  setSetting("installed", true);
  setSetting("seed_demo", false);
  setSetting("site_name", siteName);
  setSetting("site_tagline", tagline);
  setSetting("site_owner", username);
  setSetting("custom_medals", []);
  setSetting("medal_defs", {});
  try {
    refreshBoardStats();
  } catch {
    /* stats optional on empty boards */
  }
  return db.prepare("SELECT * FROM users WHERE username=?").get(username);
}

function getLevels() {
  const rows = getSetting("levels", LEVELS);
  return Array.isArray(rows) && rows.length ? rows : LEVELS;
}

function getExpRules() {
  const rows = getSetting("exp_rules", DEFAULT_EXP_RULES);
  return Array.isArray(rows) && rows.length ? rows : DEFAULT_EXP_RULES;
}

function expOf(id) {
  const row = getExpRules().find((x) => x.id === id);
  const n = Number(row && row.exp);
  return Number.isFinite(n) ? n : 0;
}

function rankOf(exp) {
  const n = Number(exp) || 0;
  const table = getLevels();
  let current = table[0] || LEVELS[0];
  for (const row of table) {
    if (n >= row.exp) current = row;
    else break;
  }
  const next = table.find((x) => x.level === current.level + 1) || null;
  const span = next ? Math.max(1, next.exp - current.exp) : 1;
  const gained = n - current.exp;
  return {
    level: current.level,
    title: current.title,
    color: current.color,
    levelExp: current.exp,
    nextExp: next ? next.exp : current.exp,
    nextTitle: next ? next.title : current.title,
    progress: next ? Math.min(100, Math.round((gained / span) * 100)) : 100,
    max: !next
  };
}

function levelOf(exp) {
  return rankOf(exp).level;
}

function titleOf(level) {
  const row = getLevels().find((x) => x.level === Number(level)) || LEVELS[0];
  return row.title;
}

function avatarOf(seed) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=fff6ec,c4e8d0,ffe0c2`;
}

function ageOf(birthday) {
  if (!birthday) return 0;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return 0;
  const nowD = new Date();
  let age = nowD.getFullYear() - b.getFullYear();
  const m = nowD.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && nowD.getDate() < b.getDate())) age -= 1;
  return Math.max(0, age);
}

function staffBoards(userId) {
  try {
    return db.prepare("SELECT board_id FROM board_mods WHERE user_id=?").all(userId).map((r) => r.board_id);
  } catch {
    return [];
  }
}

const BOARD_HONORS = {
  general: ["楼里常客", "#64748b"],
  mc: ["方块建筑师", "#3D8B5F"],
  genshin: ["提瓦特向导", "#4C8DDA"],
  kog: ["峡谷指挥官", "#D4A017"],
  pubg: ["海岛刚枪王", "#6B8F71"],
  stardew: ["农场主", "#E08A3A"],
  mobile: ["攻略之星", "#FF6A00"],
  android: ["玩机达人", "#2F6F5E"],
  theme: ["美化之星", "#E06C75"],
  qa: ["热心楼友", "#7A5C45"],
  share: ["资源搬运工", "#16a34a"],
  newbie: ["新人接待", "#5B8C5A"],
  media: ["演绎弟", "#22c55e"],
  hot: ["热议推手", "#E24B4A"],
  patriot: ["红心侠", "#E23C2F"],
  original: ["原创之星", "#FF8A1A"],
  techshare: ["技术分享官", "#3B82F6"],
  locke: ["洛克导师", "#5B9CF6"],
  aiplanet: ["AI星球人", "#6366f1"],
  delta: ["三角洲指挥官", "#111111"],
  summer: ["夏日观察员", "#FF4D8D"],
  model: ["模玩达人", "#F472B6"],
  draw: ["制图工", "#F59E0B"],
  pool: ["泳池救生员", "#2DD4BF"],
  miaoyi: ["妙易先生", "#B91C1C"],
  chess: ["金铲铲教练", "#0EA5E9"],
  notice: ["三楼公告官", "#F59E0B"],
  feedback: ["反馈受理", "#38BDF8"]
};

const MEDALS = [
  { slug: "staff", name: "站务印", icon: "务", color: "#111827", desc: "三楼站务成员" },
  { slug: "mod", name: "版主印", icon: "版", color: "#2563eb", desc: "担任至少一个版块版主" },
  { slug: "lv15", name: "三楼侠", icon: "15", color: "#ff2442", desc: "达到 15 级" },
  { slug: "lv10", name: "十级侠", icon: "10", color: "#f59e0b", desc: "达到 10 级" },
  { slug: "check30", name: "月签王", icon: "月", color: "#0ea5e9", desc: "连续签到 30 天" },
  { slug: "check7", name: "七日签", icon: "7", color: "#22c55e", desc: "连续签到 7 天" },
  { slug: "essence", name: "精华作者", icon: "精", color: "#f97316", desc: "有加精帖" },
  { slug: "like50", name: "人气王", icon: "赞", color: "#ef4444", desc: "帖子累计获赞 50" },
  { slug: "post5", name: "笔耕", icon: "帖", color: "#8b5cf6", desc: "发帖满 5" },
  { slug: "cmt10", name: "楼中楼", icon: "评", color: "#06b6d4", desc: "回帖满 10" },
  { slug: "gourd200", name: "金葫芦", icon: "葫", color: "#eab308", desc: "葫芦达到 200" },
  { slug: "og", name: "元老", icon: "老", color: "#a16207", desc: "三楼元老号" }
];

function medalView(m) {
  return { slug: m.slug, name: m.name, icon: m.icon, color: m.color, desc: m.desc };
}

function honorsOf(userId) {
  try {
    return db
      .prepare(
        `SELECT h.board_id, h.title AS honor, h.color AS honor_color, b.name AS board_name
         FROM user_honors h JOIN boards b ON b.id = h.board_id WHERE h.user_id=?`
      )
      .all(userId)
      .filter((r) => r.honor)
      .map((r) => ({
        boardId: r.board_id,
        title: r.honor,
        color: r.honor_color || "#38bdf8",
        boardName: r.board_name || ""
      }));
  } catch {
    return [];
  }
}

function customMedals() {
  const list = getSetting("custom_medals", []);
  return Array.isArray(list) ? list : [];
}

function medalCatalog() {
  const overlay = getSetting("medal_defs", {}) || {};
  const built = MEDALS.map((m) => {
    const extra = overlay[m.slug] || {};
    return {
      slug: m.slug,
      name: extra.name || m.name,
      icon: extra.icon || m.icon,
      color: extra.color || m.color,
      desc: extra.desc || m.desc,
      enabled: extra.enabled !== false,
      builtin: true
    };
  });
  const custom = customMedals().map((m) => ({
    slug: m.slug,
    name: m.name,
    icon: m.icon,
    color: m.color,
    desc: m.desc,
    enabled: m.enabled !== false,
    builtin: false
  }));
  return [...built, ...custom];
}

function addMedal(input) {
  const name = String((input && input.name) || "").trim().slice(0, 12);
  const icon = String((input && input.icon) || "").trim().slice(0, 2) || "章";
  const color = String((input && input.color) || "#ff2442").trim().slice(0, 16);
  const desc = String((input && input.desc) || "").trim().slice(0, 40);
  let slug = String((input && input.slug) || "").trim().toLowerCase().slice(0, 24);
  if (!name) throw new Error("请填写勋章名称");
  if (!slug) slug = "custom-" + Math.random().toString(36).slice(2, 8);
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("勋章标识仅限小写字母数字和连字符");
  if (MEDALS.some((m) => m.slug === slug)) throw new Error("与内置勋章标识冲突");
  const list = customMedals();
  if (list.some((m) => m.slug === slug)) throw new Error("勋章标识已存在");
  list.push({ slug, name, icon, color, desc, enabled: true });
  setSetting("custom_medals", list);
  return { slug, name, icon, color, desc, enabled: true };
}

function removeMedal(slug) {
  const base = MEDALS.find((m) => m.slug === slug);
  if (base) {
    const overlay = getSetting("medal_defs", {}) || {};
    overlay[slug] = { ...(overlay[slug] || {}), enabled: false };
    setSetting("medal_defs", overlay);
    return { slug, disabled: true };
  }
  setSetting("custom_medals", customMedals().filter((m) => m.slug !== slug));
  return { slug, deleted: true };
}

function earnedSlugs(row, extra) {
  const rank = rankOf(row.exp);
  const out = [];
  const take = (slug) => {
    if (!out.includes(slug)) out.push(slug);
  };
  if ((row.role || "user") === "admin") take("staff");
  if (extra.mod) take("mod");
  if (rank.level >= 15) take("lv15");
  if (rank.level >= 10) take("lv10");
  if ((row.checkin_streak || 0) >= 30) take("check30");
  if ((row.checkin_streak || 0) >= 7) take("check7");
  if (extra.essence) take("essence");
  if (extra.likes >= 50) take("like50");
  if (extra.posts >= 5) take("post5");
  if (extra.comments >= 10) take("cmt10");
  if ((row.gourd || 0) >= 200) take("gourd200");
  if (row.id <= 12 || row.username === "qinghu" || row.username === "admin") take("og");
  return out;
}

function syncUserMedals(row, extra) {
  try {
  const catalog = medalCatalog();
  const enabled = new Set(catalog.filter((m) => m.enabled).map((m) => m.slug));
  const earned = earnedSlugs(row, extra).filter((s) => enabled.has(s));
  const hadAny = !!db.prepare("SELECT 1 FROM user_medals WHERE user_id=?").get(row.id);
  const ins = db.prepare(
    "INSERT OR IGNORE INTO user_medals (user_id, slug, equipped, granted_at) VALUES (?,?,0,?)"
  );
  earned.forEach((slug) => ins.run(row.id, slug, now()));
  const ownedRows = db.prepare("SELECT slug, equipped FROM user_medals WHERE user_id=?").all(row.id);
  const ownedSet = new Set(ownedRows.map((r) => r.slug));
  let worn = ownedRows.filter((r) => r.equipped && enabled.has(r.slug)).map((r) => r.slug);
  if (!worn.length && !hadAny) {
    worn = earned.slice(0, 5);
    const mark = db.prepare("UPDATE user_medals SET equipped=1 WHERE user_id=? AND slug=?");
    worn.forEach((slug) => mark.run(row.id, slug));
  }
  const bySlug = Object.fromEntries(catalog.map((m) => [m.slug, m]));
  const view = (slug, equipped) => {
    const m = bySlug[slug];
    if (!m) return null;
    return { ...medalView(m), owned: true, equipped: !!equipped };
  };
  return {
    worn: worn.map((s) => view(s, true)).filter(Boolean),
    owned: [...ownedSet].map((s) => view(s, worn.includes(s))).filter(Boolean)
  };
  } catch {
    return { worn: [], owned: [] };
  }
}

function pickMedals(row, extra) {
  return syncUserMedals(row, extra).worn;
}

function setWornMedals(userId, slugs) {
  const want = [...new Set((slugs || []).map(String))].slice(0, 5);
  const owned = new Set(db.prepare("SELECT slug FROM user_medals WHERE user_id=?").all(userId).map((r) => r.slug));
  const ok = want.filter((s) => owned.has(s));
  if (ok.length !== want.length) {
    const err = new Error("只能佩戴自己拥有的勋章");
    err.status = 400;
    throw err;
  }
  db.prepare("UPDATE user_medals SET equipped=0 WHERE user_id=?").run(userId);
  const mark = db.prepare("UPDATE user_medals SET equipped=1 WHERE user_id=? AND slug=?");
  ok.forEach((s) => mark.run(userId, s));
  return ok;
}

function grantMedal(userId, slug) {
  const hit = medalCatalog().find((m) => m.slug === slug);
  if (!hit || hit.enabled === false) {
    const err = new Error("勋章不存在");
    err.status = 404;
    throw err;
  }
  db.prepare("INSERT OR IGNORE INTO user_medals (user_id, slug, equipped, granted_at) VALUES (?,?,0,?)")
    .run(userId, slug, now());
}

function upsertHonor(userId, boardId, title, color) {
  const name = String(title || "").trim().slice(0, 8);
  if (!name) {
    db.prepare("DELETE FROM user_honors WHERE user_id=? AND board_id=?").run(userId, boardId);
    return null;
  }
  const tint = String(color || "").trim() || "#38bdf8";
  db.prepare(
    `INSERT INTO user_honors (user_id, board_id, title, color) VALUES (?,?,?,?)
     ON CONFLICT(user_id, board_id) DO UPDATE SET title=excluded.title, color=excluded.color`
  ).run(userId, boardId, name, tint);
  return { boardId, title: name, color: tint };
}

function honorPreset(slug, fallback) {
  return BOARD_HONORS[slug] || ["版主", fallback || "#38bdf8"];
}

function isAdmin(user) {
  return !!(user && (user.role || "user") === "admin");
}

function isSuper(user) {
  if (!isAdmin(user)) return false;
  const owner = getSetting("site_owner", "");
  if (owner) return user.username === owner;
  const name = user && user.username;
  return name === "qinghu" || name === "admin";
}

function canModerate(user, boardId) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!boardId) return false;
  try {
    return !!db.prepare("SELECT 1 FROM board_mods WHERE user_id=? AND board_id=?").get(user.id, boardId);
  } catch {
    return false;
  }
}

function publicUser(row, meId) {
  if (!row) return null;
  const rank = rankOf(row.exp);
  const modIds = staffBoards(row.id);
  const followed = meId
    ? !!db.prepare("SELECT 1 FROM follows WHERE user_id=? AND target_type='user' AND target_id=?").get(meId, row.id)
    : false;
  const fans = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE target_type='user' AND target_id=?").get(row.id).c;
  const following = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE user_id=? AND target_type='user'").get(row.id).c;
  const posts = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE user_id=?").get(row.id).c;
  const comments = db.prepare("SELECT COUNT(*) AS c FROM comments WHERE user_id=?").get(row.id).c;
  const likes = db.prepare("SELECT COALESCE(SUM(like_count),0) AS c FROM posts WHERE user_id=?").get(row.id).c;
  const essence = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE user_id=? AND COALESCE(is_essence,0)=1").get(row.id).c;
  const bag = syncUserMedals(row, { posts, comments, likes, essence, mod: modIds.length > 0 });
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    bio: row.bio,
    gender: row.gender,
    city: row.city,
    birthday: row.birthday || "",
    age: ageOf(row.birthday),
    role: row.role || "user",
    isAdmin: (row.role || "user") === "admin",
    isModerator: modIds.length > 0,
    isSuper: isSuper(row),
    modBoardIds: modIds,
    bannedUntil: row.banned_until || "",
    mutedUntil: row.muted_until || "",
    exp: row.exp,
    gourd: row.gourd,
    level: rank.level,
    title: rank.title,
    titleColor: rank.color,
    levelExp: rank.levelExp,
    nextExp: rank.nextExp,
    nextTitle: rank.nextTitle,
    progress: rank.progress,
    maxLevel: rank.max,
    createdAt: row.created_at,
    lastCheckin: row.last_checkin,
    checkinStreak: row.checkin_streak,
    ipRegion: row.ip_region,
    followed,
    fans,
    following,
    posts,
    dress: userDress(row.id),
    honors: honorsOf(row.id),
    medals: bag.worn,
    medalBag: bag.owned
  };
}

function bumpExp(userId, delta, gourdDelta = 0) {
  db.prepare("UPDATE users SET exp = exp + ?, gourd = gourd + ? WHERE id=?").run(delta, gourdDelta, userId);
}

function notify(userId, fromUserId, type, postId, content) {
  if (userId && fromUserId && userId === fromUserId) return;
  db.prepare(
    "INSERT INTO notifications (user_id, from_user_id, type, post_id, content, created_at) VALUES (?,?,?,?,?,?)"
  ).run(userId, fromUserId || null, type, postId || null, content || "", now());
}

function commentsBySlug(slug) {
  const packs = {
    mc: [
      "这图纸我跟做了，仓库那一层真好用。",
      "求更新后续，尤其是村民厅怎么接。",
      "红石电梯我卡过区块，提醒很关键。",
      "交易厅垂直方案适合我的山地档。",
      "中式庭院屋顶再翘一点会更有味道。",
      "同款地形，山脊那侧我改成了麦田。"
    ],
    genshin: [
      "深渊这期风系确实舒服。",
      "路线按你标的走，神瞳少漏很多。",
      "生存位先站稳再谈满星，同意。",
      "火把点位那张图我对着抄了。"
    ],
    kog: [
      "这英雄我 ban 了一整个赛季。",
      "打野来一次就走，别连蹲把经济差打穿。",
      "对线被压时别贪河蟹，先保发育。",
      "克制思路求补一版中单的。"
    ],
    pubg: [
      "同意，空投真的容易引第三队。",
      "刚枪位比空投香，港口仓库我常去。",
      "雷达楼顶盯圈这招今晚就试。",
      "跳伞四点路线收藏了。"
    ],
    stardew: [
      "温室优先金表，这条我吃过亏。",
      "矿井电梯按 40 层一组，背包管理真重要。",
      "春季防风草打底，草莓留给节日。",
      "社交线礼物表求一份精简版。"
    ],
    mobile: [
      "新游第二条我入了，一局时长刚刚好。",
      "开放世界每日委托太满，上班族慎重。",
      "经营模拟中期解锁树确实劝退。",
      "肝度预警写前面这点好。"
    ],
    android: [
      "省电那条我设完，待机明显好了。",
      "有线副屏同意，无线扔文档还行。",
      "游戏时开性能、出来回均衡，这条我记下了。",
      "定位改成使用时允许，马上改。"
    ],
    theme: [
      "桌面好干净，求图标包名字。",
      "OLED 深色图标我直接照抄了。",
      "壁纸第二张太适合秋天了。",
      "浅色壁纸把图标边缘衬得很锐，确实。"
    ],
    qa: [
      "闪退先看 GPU 驱动和后台内存，别急着重装。",
      "加载到 70% 闪退我遇到过，先关覆盖安装的插件。",
      "8G 内存先查后台唤醒，再谈刷机。",
      "求一个靠谱排查顺序，顶。"
    ],
    share: [
      "壁纸按季节分文件夹太贴心了。",
      "失效了楼里喊一声就行，先谢。",
      "暗色机甲风下一包蹲一个。",
      "平板也能用，体积是大了点。"
    ],
    newbie: [
      "欢迎新人，先看置顶公约。",
      "标题写清楚这条，伸手党该看看。",
      "萌新求带，生存系列帖求推荐。",
      "公约三条我抄手上了。"
    ],
    general: [
      "我是找攻略进来的，后来就住下了。",
      "欢迎新人，先看置顶公约。",
      "报个到，这栋楼还热闹。",
      "吹水也先看置顶，顶公约。"
    ],
    media: [
      "慢热气氛向的片子求安利。",
      "玩累了看正好，太吵的战斗番先放下。",
      "晚上不打游戏就补剧，同好。",
      "有没有一周能看完的短剧？"
    ],
    hot: [
      "一辈子游戏我也投生存建造。",
      "对抗竞技会腻，给自己定目标才长。",
      "星露谷和我的世界确实能玩很久。",
      "经营模拟肝穿过，后来就不敢入了。"
    ],
    pool: [
      "路过吹吹水，今晚泳池见。",
      "太真实了，先顶再看。",
      "这种闲聊帖最适合睡前刷。",
      "拍砖轻点，我只是路过。"
    ]
  };
  return packs[slug] || packs.general;
}

function replyBySlug(slug, i) {
  const packs = {
    mc: ["回楼上：我这版本也能用，材料按图攒就行。", "同感，先对照平面图。", "作者路过，材料表我晚点补。"],
    genshin: ["回楼上：这期风系我过了，生存位先堆。", "路线按图走了一遍，少跑回头路。", "作者路过，深渊轴晚点补。"],
    kog: ["回楼上：这套路对线能用。", "同感，先别连蹲。", "作者路过，克制表晚点补。"],
    pubg: ["回楼上：空投我现在也少碰。", "同感，先看圈再打。", "作者路过，跳伞点晚点补一张。"],
    stardew: ["回楼上：温室这条血泪教训。", "同感，先管背包。", "作者路过，礼物表晚点补。"],
    android: ["回楼上：省电清单我对照着关了。", "同感，副屏还是有线稳。", "作者路过，机型差异我晚点补。"],
    theme: ["回楼上：图标包名求私信一份。", "同感，浅色壁纸确实锐。", "作者路过，组件推荐晚点补。"]
  };
  const list = packs[slug] || ["同感，先码住。", "这个我试过，能跑。", "路过顶一下。"];
  return list[i % list.length];
}

const MISMATCHED_SEED_COMMENTS = new Set([
  "这图纸我跟做了，仓库那一层真好用。",
  "马克，晚上对照着摆。",
  "楼主出手就是不同，配图太清楚了。",
  "求更新后续，尤其是村民厅怎么接。",
  "同款地形，山脊那侧我改成了麦田。",
  "这个思路我试过，比我原来那套省事。",
  "新人看懂了，谢楼主。",
  "收藏了，回头慢慢看。",
  "评论区有人提到延迟，我这版本没遇到。",
  "同意，空投真的容易引第三队。",
  "省电那条我设完，待机明显好了。",
  "桌面好干净，求图标包名字。",
  "闪退先看GPU驱动和后台内存，别急着重装。",
  "壁纸第二张太适合秋天了。",
  "深渊这期风系确实舒服。",
  "红石电梯我卡过区块，提醒很关键。",
  "新游第二条我入了，一局时长刚刚好。",
  "我是找攻略进来的，后来就住下了。",
  "欢迎新人，先看置顶公约。",
  "一辈子游戏我也投生存建造。",
  "中式庭院屋顶再翘一点会更有味道。",
  "这英雄我 ban 了一整个赛季。",
  "有线副屏同意，无线扔文档还行。",
  "交易厅垂直方案适合我的山地档。",
  "OLED 深色图标我直接照抄了。",
  "回楼上：我这版本也能用，材料按图攒就行。",
  "同感，先码住回头看。",
  "作者路过，材料表我晚点补。",
  "哈哈确实。",
  "同感，先码住。",
  "求后续。",
  "这个我试过，能跑。",
  "马克，晚上对照。",
  "路过顶一下。",
  "作者路过点个头，晚点把清单补齐。",
  "这条也马克。"
]);

function migrateCommentFit() {
  const upd = db.prepare("UPDATE comments SET content=? WHERE id=?");
  const posts = db.prepare(
    `SELECT p.id, b.slug FROM posts p JOIN boards b ON b.id=p.board_id`
  ).all();
  const tx = db.transaction(() => {
    for (const p of posts) {
      const pool = commentsBySlug(p.slug);
      const rows = db.prepare("SELECT id, content, parent_id FROM comments WHERE post_id=? ORDER BY id").all(p.id);
      let rootI = 0;
      let kidI = 0;
      rows.forEach((c) => {
        if (!MISMATCHED_SEED_COMMENTS.has(c.content)) return;
        if (c.parent_id) {
          upd.run(replyBySlug(p.slug, kidI), c.id);
          kidI += 1;
        } else {
          upd.run(pool[rootI % pool.length], c.id);
          rootI += 1;
        }
      });
    }
  });
  tx();
}

function refreshBoardStats() {
  const boards = db.prepare("SELECT id FROM boards").all();
  const qPosts = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE board_id=? AND COALESCE(is_hidden,0)=0");
  const qFollow = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE target_type='board' AND target_id=?");
  const qViews = db.prepare("SELECT COALESCE(SUM(view_count),0) AS c FROM posts WHERE board_id=?");
  const upd = db.prepare("UPDATE boards SET post_count=?, follow_count=?, heat=?, topics=? WHERE id=?");
  const tx = db.transaction(() => {
    for (const b of boards) {
      const pc = qPosts.get(b.id).c;
      const fc = qFollow.get(b.id).c;
      const views = qViews.get(b.id).c;
      upd.run(pc, fc, views + fc * 12 + pc * 40, pc, b.id);
    }
  });
  tx();
}

function scrubTestPosts() {
  const rows = db.prepare("SELECT id, title, board_id FROM posts").all();
  const drop = db.transaction((id, boardId) => {
    db.prepare("DELETE FROM likes WHERE target_type='post' AND target_id=?").run(id);
    db.prepare("DELETE FROM collects WHERE post_id=?").run(id);
    db.prepare("DELETE FROM comments WHERE post_id=?").run(id);
    db.prepare("DELETE FROM notifications WHERE post_id=?").run(id);
    db.prepare("DELETE FROM posts WHERE id=?").run(id);
    db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?").run(boardId);
  });
  rows.forEach((r) => {
    if (/测试|自测|太无聊了/.test(r.title || "")) drop(r.id, r.board_id);
  });
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;
  return;

  const hash = bcrypt.hashSync("123456", 8);
  const created = new Date(Date.now() - 120 * 86400000).toISOString();

  const users = [
    ["qinghu", "青葫君", "三楼官方小号，公约、活动、福利都在这儿。", "男", "广州", 2860, 1280, "广东"],
    ["akai", "楼主侠阿凯", "建筑党 / 生存党，基地图纸免费分享。", "男", "成都", 1940, 620, "四川"],
    ["endman", "末地拾荒者", "红石能跑就行，美观是附加题。", "男", "武汉", 1520, 410, "湖北"],
    ["liyue", "璃月旅行者", "探索、收集、深渊，一个都不能少。", "女", "杭州", 1680, 540, "浙江"],
    ["midlaner", "峡谷老中单", "这赛季中单太难了，求安慰。", "男", "上海", 1210, 280, "上海"],
    ["island", "海岛求生王", "刚枪位比空投香。", "男", "长沙", 980, 190, "湖南"],
    ["stardew", "星露谷农场主", "第一年冬天之前必须把温室拿下。", "女", "昆明", 1340, 360, "云南"],
    ["xiaoman", "美化达人小满", "图标、壁纸、小组件强迫症患者。", "女", "南京", 870, 220, "江苏"],
    ["lab", "玩机研究所", "能省电的设置我都试过。", "男", "深圳", 1110, 300, "广东"],
    ["newbie", "萌新求助君", "新人报道，求带，求别骂。", "男", "西安", 220, 48, "陕西"],
    ["porter", "资源搬运工", "好东西就该让大家看见。", "男", "郑州", 760, 150, "河南"],
    ["yeyu", "夜雨听风", "晚上刷帖，白天搬砖。", "女", "重庆", 640, 110, "重庆"]
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (username, password_hash, nickname, avatar, bio, gender, city, exp, gourd, title, created_at, last_checkin, checkin_streak, ip_region)
     VALUES (@username,@password_hash,@nickname,@avatar,@bio,@gender,@city,@exp,@gourd,@title,@created_at,@last_checkin,@checkin_streak,@ip_region)`
  );

  const insertMany = db.transaction(() => {
    for (const u of users) {
      const level = levelOf(u[5]);
      insertUser.run({
        username: u[0],
        password_hash: hash,
        nickname: u[1],
        avatar: avatarOf(u[0]),
        bio: u[2],
        gender: u[3],
        city: u[4],
        exp: u[5],
        gourd: u[6],
        title: titleOf(level),
        created_at: created,
        last_checkin: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        checkin_streak: 3 + (u[5] % 12),
        ip_region: u[7]
      });
    }

    const boards = [
      ["综合讨论", "general", "综", "大家来这儿聊天、灌水、吹水。", "#C45C26", 1],
      ["我的世界", "mc", "方", "生存、建筑、红石、地图，全在这栋楼。", "#3D8B5F", 2],
      ["原神", "genshin", "原", "探索路线、深渊满星、角色培养。", "#4C8DDA", 3],
      ["王者荣耀", "kog", "王", "对线、打野、阵容，峡谷树洞。", "#D4A017", 4],
      ["和平精英", "pubg", "和", "刷新点、刚枪位、海岛日记。", "#6B8F71", 5],
      ["星露谷物语", "stardew", "星", "种植表、社交线、温室冲刺。", "#E08A3A", 6],
      ["手游攻略", "mobile", "攻", "新游评测、肝度预警、值不值得入。", "#FF6A00", 7],
      ["玩机教程", "android", "机", "省电、清理、外接、平板当副屏。", "#2F6F5E", 8],
      ["手机美化", "theme", "美", "图标包、壁纸、桌面布局分享。", "#E06C75", 9],
      ["互助问答", "qa", "问", "卡关了就来问，大神在三楼。", "#7A5C45", 10],
      ["资源分享", "share", "源", "壁纸、地图、材质，互助分享。", "#B85C38", 11],
      ["新手村", "newbie", "新", "新人报到、发帖规范、少走弯路。", "#5B8C5A", 12],
      ["影视闲聊", "media", "影", "剧、动画、电影，玩累了来坐坐。", "#8E6BB0", 13],
      ["今日热议", "hot", "热", "当天最吵的那个话题。", "#E24B4A", 14]
    ];
    const insertBoard = db.prepare(
      `INSERT INTO boards (name, slug, icon, cover, desc, color, sort_order) VALUES (?,?,?,?,?,?,?)`
    );
    for (const b of boards) {
      insertBoard.run(b[0], b[1], b[2], "", b[3], b[4], b[5]);
    }

    const img = (id, w = 960, h = 540) =>
      `https://picsum.photos/seed/${id}/${w}/${h}`;

    const posts = [
      {
        user: 1, board: 12, pin: 1, essence: 1,
        title: "三楼公约：互助分享，拒绝伸手党",
        content: "欢迎来到青葫三楼。\n\n这儿是玩机人和游戏人的互助楼。发帖前先看三件事：\n1. 标题写清楚，别只丢一句「谁懂」。\n2. 攻略、教程尽量配图，后来人才能接着用。\n3. 资源分享写清来源和注意事项，外链失效了就在楼里更新。\n\n连续签到、发帖、回帖都能攒经验和葫芦。葫芦可以在发现页兑换楼内身份装扮。\n\n三楼，你懂的。",
        images: [img("rule1", 960, 420)],
        tags: ["公约", "新手"],
        hours: 200, views: 12880, likes: 860, collects: 420
      },
      {
        user: 2, board: 2, pin: 1, essence: 1,
        title: "生存 100 天基地全记录，附平面图和物资清单",
        content: "从出生点跑了 800 格，靠山靠河做了主基地。\n\n第一层是仓库和熔炉阵列，第二层卧室和附魔，地下室通向矿道。屋顶做了小麦、胡萝卜、土豆三田，河边自动钓鱼机已经跑了两周。\n\n平面图按「仓库-农场-矿道」三角布置，晚上怪物刷新被挡在山脊外面。\n\n物资优先级：床 > 桶 > 熔炉 > 附魔台 > 村民交易厅。有人要做类似布局可以直接抄。",
        images: [img("mcbase1"), img("mcbase2"), img("mcbase3")],
        tags: ["生存", "建筑", "图纸"],
        hours: 36, views: 5420, likes: 388, collects: 210
      },
      {
        user: 4, board: 3, pin: 0, essence: 1,
        title: "新图神瞳一次清完：路线按时辰走，少跑回头路",
        content: "这张图我按「南岸码头 - 山脊祭坛 - 河谷洞窟 - 北崖」走了两遍，神瞳和宝箱基本一次清完。\n\n关键点：\n- 早上来南岸，光线好，崖壁锚点不容易看漏\n- 中午上山脊，风场连跳省体力\n- 傍晚进河谷洞窟，火把点位我标在第二张图\n\n角色带一个探索和一队挂机，深渊的事明天另开帖。",
        images: [img("genshin1"), img("genshin2")],
        tags: ["探索", "神瞳", "路线"],
        hours: 18, views: 4210, likes: 296, collects: 188
      },
      {
        user: 5, board: 4, pin: 0, essence: 0,
        title: "这赛季打野节奏表，对线别再送了",
        content: "红开还是蓝开别迷信口诀，看对面打野英雄。\n\n能抓的点：\n- 一级入侵只打没有惩戒的对面\n- 四分半河蟹，别跟发育路抢刀\n- 六分钟龙坑视野先摆，再决定转线\n\n中单如果被压到塔下，打野来一次就走，别连蹲三次把经济差打穿。\n\n有人要具体英雄的刷野路径，我可以按英雄补楼。",
        images: [img("kog1")],
        tags: ["打野", "节奏"],
        hours: 10, views: 3102, likes: 174, collects: 66
      },
      {
        user: 6, board: 5, pin: 0, essence: 0,
        title: "海岛刷新点整理：刚枪位比空投香",
        content: "P城和学校永远热闹，我现在更愿意去港口仓库和山顶雷达。\n\n仓库的楼层夹角能卡第三人称，雷达楼顶适合盯圈。空投响了先看圈，再决定打不打。很多人倒在空投旁边，是因为枪声音把第三支队伍吸引过来了。\n\n附图是我常用的四点跳伞路线。",
        images: [img("pubg1"), img("pubg2")],
        tags: ["海岛", "跳伞"],
        hours: 8, views: 1988, likes: 121, collects: 54
      },
      {
        user: 7, board: 6, pin: 0, essence: 1,
        title: "第一年四季种植表，温室之前别乱花钱",
        content: "春季：防风草 + 土豆打底，草莓留给节日。\n夏季蓝莓是现金牛，西瓜留几格给任务。\n秋季蔓越莓和南瓜轮着来，玉米留给猪。\n\n温室优先级高于金表。金表可以第二年再买，温室一旦建好，古代水果就能把整个经济盘活。\n\n社交线：先把皮埃尔、威利、林恩的礼物记熟，矿井和渔获会轻松很多。",
        images: [img("farm1"), img("farm2"), img("farm3")],
        tags: ["种植", "温室"],
        hours: 26, views: 2870, likes: 240, collects: 176
      },
      {
        user: 9, board: 8, pin: 0, essence: 1,
        title: "安卓省电设置清单，后台唤醒能砍掉一半",
        content: "我在三台机上复测过，这套设置对续航最稳：\n\n1. 关闭未使用应用的自启动和关联启动\n2. 定位改成使用时允许\n3. 深色模式 + 自适应刷新，阅读时锁 60Hz\n4. 通知按应用分级，营销推送直接关\n5. 充电到 80% 停，过夜用旁路充电如果机型支持\n\n有人问游戏党怎么办：游戏时开性能，出游戏立刻回均衡。别全天候性能模式。",
        images: [img("phone1")],
        tags: ["省电", "安卓"],
        hours: 40, views: 6330, likes: 512, collects: 390
      },
      {
        user: 8, board: 9, pin: 0, essence: 0,
        title: "极简图标包 + 米白壁纸，桌面只留 8 个图标",
        content: "强迫症桌面分享。上半屏大时钟小组件，下半屏一排常用，dock 只放四个。\n\n图标用线性风格，壁纸选低对比米白，通知红点会非常明显。\n\n第二张是晚上深色壁纸的版本，同一套图标也能压住。求推荐更好看的天气组件。",
        images: [img("theme1"), img("theme2")],
        tags: ["桌面", "图标"],
        hours: 14, views: 1760, likes: 203, collects: 141
      },
      {
        user: 10, board: 10, pin: 0, essence: 0,
        title: "游戏闪退怎么排查？我已经清缓存三次了",
        content: "原神和两款独立游戏都会在加载到 70% 左右闪退。清缓存、重装、关权限都试过。机型是中端U，内存 8G，系统没 root。\n\n求一个靠谱的排查顺序，别一上来就让我刷机。",
        images: [],
        tags: ["闪退", "求助"],
        hours: 5, views: 890, likes: 36, collects: 12
      },
      {
        user: 11, board: 11, pin: 0, essence: 0,
        title: "4K 风景壁纸包更新，按季节分好文件夹了",
        content: "整理了一波桌面和平板都能用的风景壁纸，按春夏秋冬分文件夹。体积比较大，建议 Wi-Fi 下保存。\n\n来源都是可商用/可个人使用的图库，楼里有失效留言我补链。\n\n喜欢暗色机甲风的等下一包。",
        images: [img("wall1"), img("wall2"), img("wall3"), img("wall4")],
        tags: ["壁纸", "分享"],
        hours: 9, views: 2440, likes: 188, collects: 260
      },
      {
        user: 4, board: 3, pin: 0, essence: 0,
        title: "深渊满星阵容讨论：这一期风系太吃香了",
        content: "上半风系后台输出，下半火水蒸发。练度一般的可以先保证生存，再谈伤害。\n\n我把这一期的站位和轴写在图里了。有同配队的对个伤害。",
        images: [img("abyss1")],
        tags: ["深渊", "配队"],
        hours: 7, views: 2650, likes: 155, collects: 98
      },
      {
        user: 3, board: 2, pin: 0, essence: 1,
        title: "红石电梯最简做法，材料能在第一周凑齐",
        content: "2x2 井道，观察者 + 粘液块 + 活塞。材料少，延迟低，适合主世界主基地。\n\n注意：不要和区块边界贴太近，否则有的版本会卡活塞。\n\n视频步骤拆成四张图，照着摆就能用。想做水电梯的另开帖。",
        images: [img("redstone1"), img("redstone2")],
        tags: ["红石", "电梯"],
        hours: 22, views: 3888, likes: 274, collects: 201
      },
      {
        user: 12, board: 7, pin: 0, essence: 0,
        title: "这周新游值得入吗？肝度预警写在前面",
        content: "试了三个新上的，结论先放：\n\n1. 开放世界动作：画面好，但每日委托很满，上班族慎重\n2. 卡牌肉鸽：一局 25 分钟，最适合碎片时间\n3. 经营模拟：前期舒服，中期解锁树有点劝退\n\n我个人会留下第二个。你们入了哪个？",
        images: [img("newgame1")],
        tags: ["新游", "评测"],
        hours: 6, views: 1540, likes: 92, collects: 33
      },
      {
        user: 1, board: 1, pin: 0, essence: 0,
        title: "你们都是怎么认识三楼的？",
        content: "我是早年找玩机教程进来的，后来变成每天签到的习惯。\n\n有人是为了游戏攻略，有人是为了美化，有人纯粹来吹水。报个到，也让新人知道这栋楼还热闹。",
        images: [img("hello1", 960, 420)],
        tags: ["吹水", "回忆"],
        hours: 30, views: 4100, likes: 310, collects: 40
      },
      {
        user: 10, board: 12, pin: 0, essence: 0,
        title: "新人报到：萌新求带，先从我的世界生存学起",
        content: "刚注册，看了公约。我目前在学生存和建筑，红石还一窍不通。\n\n有没有适合萌新的系列帖推荐？先谢过各位楼主侠。",
        images: [],
        tags: ["报到"],
        hours: 4, views: 520, likes: 48, collects: 6
      },
      {
        user: 12, board: 13, pin: 0, essence: 0,
        title: "最近在追的剧和动画，求同类口味安利",
        content: "晚上不打游戏的时候在补剧。偏慢热、气氛好的更对胃口。\n\n有没有「玩累了看正好」的片子？太吵的战斗番暂时不看。",
        images: [img("media1")],
        tags: ["剧", "动画"],
        hours: 11, views: 980, likes: 67, collects: 22
      },
      {
        user: 2, board: 14, pin: 0, essence: 0,
        title: "什么游戏能玩一辈子？我投生存建造类",
        content: "我的世界、星露谷这类「自己给自己定目标」的游戏，我已经玩了好几年。\n\n对抗竞技会腻，经营模拟会肝穿，生存建造总能找到新点子。你们的一辈子游戏是哪一款？",
        images: [img("forever1")],
        tags: ["热议", "长青"],
        hours: 3, views: 2210, likes: 198, collects: 45
      },
      {
        user: 2, board: 2, pin: 0, essence: 0,
        title: "建筑接单？装饰风格求点评，偏中式庭院",
        content: "给朋友做的中式庭院，白墙黛瓦，走廊能看见湖面。还缺点缀，灯笼和竹林的位置拿不准。\n\n求拍砖，尤其是屋顶曲线和水面倒影。",
        images: [img("build1"), img("build2"), img("build3")],
        tags: ["建筑", "中式"],
        hours: 2, views: 1320, likes: 161, collects: 77
      },
      {
        user: 5, board: 4, pin: 0, essence: 0,
        title: "这赛季最难缠的英雄投票，我先投那个能清线还能支援的",
        content: "对线被压、支援还快、团战又能进能切的那种，打起来最难受。\n\n评论区投票，票多的我整理一版克制思路。",
        images: [img("vote1")],
        tags: ["投票", "克制"],
        hours: 1, views: 1766, likes: 84, collects: 19
      },
      {
        user: 9, board: 8, pin: 0, essence: 0,
        title: "平板当第二块屏，有线比无线稳",
        content: "用平板给笔记本当副屏看攻略，有线连接延迟明显更低。无线适合扔个聊天窗口，不适合看帧数敏感的内容。\n\n支架一定要能竖屏，看文档更舒服。",
        images: [img("tablet1"), img("tablet2")],
        tags: ["平板", "效率"],
        hours: 16, views: 1430, likes: 119, collects: 80
      },
      {
        user: 3, board: 2, pin: 0, essence: 0,
        title: "村民交易厅压缩版，适合山地地形",
        content: "山地不好摊大平面，就把交易厅做成垂直三层：一层工作站，二层床位，三层铁傀儡。\n\n噪声比平面大厅大一点，但占地小。适合靠山的生存档。",
        images: [img("villager1")],
        tags: ["村民", "生存"],
        hours: 20, views: 2011, likes: 147, collects: 109
      },
      {
        user: 8, board: 9, pin: 0, essence: 0,
        title: "深色图标在 OLED 上更干净，浅色壁纸党慎入",
        content: "OLED 手机用深色图标和纯黑壁纸，边框几乎消失。浅色壁纸会把图标边缘衬得很锐。\n\n我放了同一套图标在两种壁纸上的对比。",
        images: [img("oled1"), img("oled2")],
        tags: ["OLED", "图标"],
        hours: 12, views: 1104, likes: 96, collects: 70
      },
      {
        user: 6, board: 5, pin: 0, essence: 0,
        title: "单人排位吃鸡的三个习惯，比枪法更重要",
        content: "听声辨位、贪不贪空投、转点时看小地图。枪法是长期的事，这三件事今晚就能改。\n\n我自己从这三点改完之后，决赛圈存活明显稳了。",
        images: [img("chicken1")],
        tags: ["吃鸡", "思路"],
        hours: 15, views: 1677, likes: 132, collects: 58
      },
      {
        user: 7, board: 6, pin: 0, essence: 0,
        title: "矿井电梯怎么规划，才不会把周末搭进去",
        content: "矿井我按 40 层一组电梯，每组旁边放箱子和床。下去只带够用的食物和炸弹，上来再分拣。\n\n别一股脑挖到五层还不回家，背包管理比手速重要。",
        images: [img("mine1"), img("mine2")],
        tags: ["矿井"],
        hours: 19, views: 1220, likes: 101, collects: 64
      }
    ];

    const insertPost = db.prepare(
      `INSERT INTO posts (user_id, board_id, title, content, images, tags, view_count, like_count, comment_count, collect_count, is_essence, is_pinned, created_at, ip_region)
       VALUES (@user_id,@board_id,@title,@content,@images,@tags,@view_count,@like_count,@comment_count,@collect_count,@is_essence,@is_pinned,@created_at,@ip_region)`
    );

    const regions = ["广东", "四川", "浙江", "上海", "湖北", "江苏", "云南", "湖南"];
    const postIds = [];
    for (const p of posts) {
      const t = new Date(Date.now() - p.hours * 3600000).toISOString();
      const info = insertPost.run({
        user_id: p.user,
        board_id: p.board,
        title: p.title,
        content: p.content,
        images: JSON.stringify(p.images),
        tags: JSON.stringify(p.tags),
        view_count: p.views,
        like_count: p.likes,
        comment_count: 0,
        collect_count: p.collects,
        is_essence: p.essence,
        is_pinned: p.pin,
        created_at: t,
        ip_region: regions[p.user % regions.length]
      });
      postIds.push({ id: info.lastInsertRowid, user: p.user, likes: p.likes, collects: p.collects, board: p.board });
    }

    const insertComment = db.prepare(
      `INSERT INTO comments (post_id, user_id, parent_id, content, like_count, floor, is_pinned, created_at, ip_region)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const insertLike = db.prepare(
      `INSERT OR IGNORE INTO likes (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)`
    );
    const insertCollect = db.prepare(
      `INSERT OR IGNORE INTO collects (user_id, post_id, created_at) VALUES (?,?,?)`
    );
    const insertFollow = db.prepare(
      `INSERT OR IGNORE INTO follows (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)`
    );

    for (const p of postIds) {
      const slug = ({
        1: "general", 2: "mc", 3: "genshin", 4: "kog", 5: "pubg",
        6: "stardew", 7: "mobile", 8: "android", 9: "theme", 10: "qa",
        11: "share", 12: "newbie", 13: "media", 14: "hot"
      })[p.board] || "general";
      const pool = commentsBySlug(slug);
      const n = 3 + (Number(p.id) % 5);
      let rootId = null;
      for (let i = 0; i < n; i++) {
        const uid = 1 + ((Number(p.id) + i * 3) % 12);
        const ctime = new Date(Date.now() - (p.id * 2 + i) * 1800000).toISOString();
        const info = insertComment.run(
          p.id,
          uid,
          null,
          pool[i % pool.length],
          2 + ((i * Number(p.id)) % 18),
          i + 1,
          i === 0 && Number(p.id) % 4 === 0 ? 1 : 0,
          ctime,
          regions[uid % regions.length]
        );
        if (i === 0) rootId = info.lastInsertRowid;
        if (i === 1 && rootId) {
          insertComment.run(
            p.id,
            1 + ((uid + 2) % 12),
            rootId,
            replyBySlug(slug, 0),
            4,
            i + 2,
            0,
            new Date(Date.now() - (p.id * 2 + i) * 1700000).toISOString(),
            regions[(uid + 1) % regions.length]
          );
          insertComment.run(
            p.id,
            1 + ((uid + 4) % 12),
            rootId,
            replyBySlug(slug, 1),
            2,
            i + 3,
            0,
            new Date(Date.now() - (p.id * 2 + i) * 1600000).toISOString(),
            regions[(uid + 2) % regions.length]
          );
          if (Number(p.id) % 3 === 0) {
            insertComment.run(
              p.id,
              p.user,
              rootId,
              replyBySlug(slug, 2),
              6,
              i + 4,
              0,
              new Date(Date.now() - (p.id * 2 + i) * 1500000).toISOString(),
              regions[p.user % regions.length]
            );
          }
        }
      }
      const commentCount = db.prepare("SELECT COUNT(*) AS c FROM comments WHERE post_id=?").get(p.id).c;
      db.prepare("UPDATE posts SET comment_count=? WHERE id=?").run(commentCount, p.id);

      for (let u = 1; u <= 12; u++) {
        if ((u + Number(p.id)) % 3 === 0) insertLike.run(u, "post", p.id, now());
        if ((u + Number(p.id)) % 4 === 0) insertCollect.run(u, p.id, now());
      }
    }

    const followPairs = [
      [2, "user", 1], [3, "user", 1], [4, "user", 1], [5, "user", 1],
      [10, "user", 2], [3, "user", 2], [7, "user", 2], [12, "user", 4],
      [10, "user", 9], [8, "user", 9], [11, "user", 2], [6, "user", 5],
      [1, "user", 2], [1, "user", 4], [1, "user", 9]
    ];
    for (const f of followPairs) insertFollow.run(f[0], f[1], f[2], now());
    for (let b = 1; b <= 14; b++) {
      for (let u = 1; u <= 12; u++) {
        if ((u + b) % 2 === 0) insertFollow.run(u, "board", b, now());
      }
      const fc = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE target_type='board' AND target_id=?").get(b).c;
      const pc = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE board_id=?").get(b).c;
      db.prepare("UPDATE boards SET follow_count=?, post_count=?, today_posts=? WHERE id=?").run(fc, pc, Math.max(1, pc - 1), b);
    }

    const insertNotif = db.prepare(
      `INSERT INTO notifications (user_id, from_user_id, type, post_id, content, is_read, created_at) VALUES (?,?,?,?,?,?,?)`
    );
    insertNotif.run(1, 10, "follow", null, "关注了你", 0, now());
    insertNotif.run(1, 2, "like", 1, "赞了你的帖子", 0, now());
    insertNotif.run(1, 4, "comment", 14, "回复了你的帖子", 0, now());
    insertNotif.run(2, 10, "comment", 2, "回复了你的帖子", 1, now());
    insertNotif.run(2, 3, "collect", 2, "收藏了你的帖子", 0, now());

    const insertGift = db.prepare(
      `INSERT INTO gifts (name, cost, cover, stock, desc) VALUES (?,?,?,?,?)`
    );
    insertGift.run("青葫灯笼头像框", 80, img("gift1", 400, 400), 42, "发帖时点亮一盏小灯笼");
    insertGift.run("金葫芦铭牌", 160, img("gift2", 400, 400), 18, "昵称旁带金色葫芦印");
    insertGift.run("三楼侠称号卡", 320, img("gift3", 400, 400), 9, "限时佩戴「三楼侠」称号");
    insertGift.run("宣纸桌面主题", 120, img("gift4", 400, 400), 30, "空间页换成宣纸纹理");
    insertGift.run("签到加成符·三日", 60, img("gift5", 400, 400), 80, "连续三天签到葫芦 +50%");
  });

  insertMany();
}

function decoratePost(row, meId) {
  const author = publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(row.user_id), meId);
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(row.board_id);
  const liked = meId
    ? !!db.prepare("SELECT 1 FROM likes WHERE user_id=? AND target_type='post' AND target_id=?").get(meId, row.id)
    : false;
  const collected = meId
    ? !!db.prepare("SELECT 1 FROM collects WHERE user_id=? AND post_id=?").get(meId, row.id)
    : false;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    images: JSON.parse(row.images || "[]"),
    tags: JSON.parse(row.tags || "[]"),
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    collectCount: row.collect_count,
    essence: !!row.is_essence,
    pinned: !!row.is_pinned,
    official: !!row.is_official,
    locked: !!row.is_locked,
    hidden: !!row.is_hidden,
    canModerate: canModerate(meId ? db.prepare("SELECT * FROM users WHERE id=?").get(meId) : null, row.board_id),
    createdAt: row.created_at,
    ipRegion: row.ip_region,
    liked,
    collected,
    author,
    board: board
      ? {
          id: board.id,
          name: board.name,
          slug: board.slug,
          icon: board.icon,
          color: board.color,
          desc: board.desc,
          postCount: board.post_count,
          followCount: board.follow_count,
          todayPosts: board.today_posts,
          moderators: JSON.parse(board.moderators || "[]")
        }
      : null
      ,
    software: row.soft_id ? mapSoft(db.prepare("SELECT * FROM softwares WHERE id=?").get(row.soft_id)) : null,
    track: row.track_id ? mapTrack(db.prepare("SELECT * FROM tracks WHERE id=?").get(row.track_id)) : null
  };
}

function mapBoard(b, meId) {
  if (!b) return null;
  const modRows = db.prepare(
    "SELECT u.id, u.nickname, u.avatar FROM board_mods m JOIN users u ON u.id=m.user_id WHERE m.board_id=? ORDER BY u.id"
  ).all(b.id);
  const names = modRows.map((r) => r.nickname);
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    icon: b.icon,
    color: b.color,
    desc: b.desc,
    postCount: b.post_count,
    followCount: b.follow_count,
    todayPosts: db.prepare(
      "SELECT COUNT(*) AS c FROM posts WHERE board_id=? AND created_at>=?"
    ).get(b.id, new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).c,
    category: b.category || "生活综合",
    heat: b.heat || 0,
    topics: b.topics || b.post_count || 0,
    moderators: names,
    rules: b.rules || "",
    modUsers: modRows,
    system: !!b.system_flag,
    followed: meId
      ? !!db.prepare("SELECT 1 FROM follows WHERE user_id=? AND target_type='board' AND target_id=?").get(meId, b.id)
      : false
  };
}

function ensureCol(table, name, sql) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(name)) db.exec(sql);
}

function parseGiftPayload(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function userDress(userId) {
  const dress = { frame: null, badge: null, title: null, bubble: null };
  if (!userId) return dress;
  let rows = [];
  try {
    rows = db
      .prepare(
        `SELECT g.id, g.name, g.slug, g.kind, g.payload FROM user_items i
         JOIN gifts g ON g.id = i.gift_id
         WHERE i.user_id=? AND i.equipped=1`
      )
      .all(userId);
  } catch {
    return dress;
  }
  for (const g of rows) {
    if (dress[g.kind] === null && ["frame", "badge", "title", "bubble"].includes(g.kind)) {
      dress[g.kind] = { id: g.id, name: g.name, slug: g.slug, ...parseGiftPayload(g.payload) };
    }
  }
  return dress;
}

function mapGift(g, meId) {
  const item = meId
    ? db.prepare("SELECT equipped FROM user_items WHERE user_id=? AND gift_id=?").get(meId, g.id)
    : null;
  return {
    id: g.id,
    name: g.name,
    cost: g.cost,
    stock: g.stock,
    desc: g.desc,
    kind: g.kind || "frame",
    slug: g.slug || "",
    payload: parseGiftPayload(g.payload),
    owned: !!item,
    equipped: !!(item && item.equipped)
  };
}

function migrateGifts() {
  ensureCol("gifts", "kind", "ALTER TABLE gifts ADD COLUMN kind TEXT DEFAULT 'frame'");
  ensureCol("gifts", "slug", "ALTER TABLE gifts ADD COLUMN slug TEXT");
  ensureCol("gifts", "payload", "ALTER TABLE gifts ADD COLUMN payload TEXT DEFAULT '{}'");
  db.exec(`CREATE TABLE IF NOT EXISTS user_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gift_id INTEGER NOT NULL,
    equipped INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, gift_id)
  )`);

  const catalog = [
    { slug: "lantern", kind: "frame", name: "青葫灯笼框", cost: 80, stock: 999, desc: "红绿灯笼绕一圈，发帖更显眼。", payload: { mark: "灯" } },
    { slug: "goldring", kind: "frame", name: "金边葫芦框", cost: 160, stock: 999, desc: "金边描一圈，像刚摘的葫芦。", payload: { mark: "金" } },
    { slug: "sakura", kind: "frame", name: "粉樱花框", cost: 100, stock: 999, desc: "浅粉花环，适合空间页。", payload: { mark: "樱" } },
    { slug: "pixel", kind: "frame", name: "像素侠框", cost: 90, stock: 999, desc: "方块描边，玩机人本命。", payload: { mark: "侠" } },
    { slug: "seal", kind: "frame", name: "三楼红章框", cost: 140, stock: 999, desc: "头像角上一枚小红章。", payload: { mark: "楼" } },
    { slug: "goldtag", kind: "badge", name: "金葫芦铭牌", cost: 120, stock: 999, desc: "昵称旁带金色葫芦印。", payload: { mark: "金葫" } },
    { slug: "floor", kind: "badge", name: "楼主印", cost: 200, stock: 999, desc: "回帖时亮一枚楼主印。", payload: { mark: "楼" } },
    { slug: "sanlouxia", kind: "title", name: "三楼侠称号", cost: 280, stock: 999, desc: "佩戴「三楼侠」，和等级称号一起亮。", payload: { mark: "三楼侠" } },
    { slug: "nightkeep", kind: "title", name: "夜楼守称号", cost: 180, stock: 999, desc: "夜里刷帖的人专属。", payload: { mark: "夜楼守" } },
    { slug: "pinkbub", kind: "bubble", name: "粉泡气泡", cost: 70, stock: 999, desc: "回帖气泡换成浅粉圆角。", payload: { mark: "泡" } },
    { slug: "paperbub", kind: "bubble", name: "宣纸气泡", cost: 90, stock: 999, desc: "回帖气泡换成宣纸描边。", payload: { mark: "纸" } }
  ];

  const upd = db.prepare("UPDATE gifts SET name=?, cost=?, stock=?, desc=?, kind=?, payload=?, cover=? WHERE slug=?");
  const ins = db.prepare(
    "INSERT INTO gifts (name, cost, cover, stock, desc, kind, slug, payload) VALUES (?,?,?,?,?,?,?,?)"
  );
  for (const g of catalog) {
    const payload = JSON.stringify(g.payload);
    const existed = db.prepare("SELECT id FROM gifts WHERE slug=?").get(g.slug);
    if (existed) upd.run(g.name, g.cost, g.stock, g.desc, g.kind, payload, "", g.slug);
    else ins.run(g.name, g.cost, "", g.stock, g.desc, g.kind, g.slug, payload);
  }
  db.prepare("DELETE FROM gifts WHERE slug IS NULL OR slug=''").run();

  const grant = db.prepare("INSERT OR IGNORE INTO user_items (user_id, gift_id, equipped, created_at) VALUES (?,?,?,?)");
  const lantern = db.prepare("SELECT id FROM gifts WHERE slug='lantern'").get();
  const goldtag = db.prepare("SELECT id FROM gifts WHERE slug='goldtag'").get();
  const qh = db.prepare("SELECT id FROM users WHERE username='qinghu'").get();
  if (qh && lantern) grant.run(qh.id, lantern.id, 1, now());
  if (qh && goldtag) grant.run(qh.id, goldtag.id, 1, now());
  const akai = db.prepare("SELECT id FROM users WHERE username='akai'").get();
  const goldring = db.prepare("SELECT id FROM gifts WHERE slug='goldring'").get();
  if (akai && goldring) grant.run(akai.id, goldring.id, 1, now());
}

function migrateCommentThreads() {
  const replies = ["哈哈确实。", "同感，先码住。", "求后续。", "这个我试过，能跑。", "马克，晚上对照。", "路过顶一下。"];
  const insertComment = db.prepare(
    `INSERT INTO comments (post_id, user_id, parent_id, content, like_count, floor, is_pinned, created_at, ip_region)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  const tx = db.transaction(() => {
    const posts = db.prepare("SELECT id, user_id FROM posts").all();
    for (const p of posts) {
      const childCount = db.prepare("SELECT COUNT(*) AS c FROM comments WHERE post_id=? AND parent_id IS NOT NULL").get(p.id).c;
      if (childCount > 0) continue;
      const roots = db
        .prepare("SELECT id FROM comments WHERE post_id=? AND parent_id IS NULL ORDER BY is_pinned DESC, id ASC")
        .all(p.id);
      if (!roots.length) continue;
      const n = 1 + (Number(p.id) % 3);
      let floor = db.prepare("SELECT MAX(floor) AS m FROM comments WHERE post_id=?").get(p.id).m || 0;
      for (let i = 0; i < n; i++) {
        floor += 1;
        const uid = 1 + ((Number(p.id) + i * 5) % 12);
        insertComment.run(
          p.id,
          uid,
          roots[0].id,
          replies[(Number(p.id) + i) % replies.length],
          1 + ((i * Number(p.id)) % 9),
          floor,
          0,
          now(),
          "广东"
        );
      }
      if (Number(p.id) % 2 === 0) {
        floor += 1;
        insertComment.run(p.id, p.user_id, roots[0].id, "作者路过点个头，晚点把清单补齐。", 3, floor, 0, now(), "广东");
      }
      if (roots[1] && Number(p.id) % 4 === 0) {
        floor += 1;
        insertComment.run(p.id, 1 + (Number(p.id) % 12), roots[1].id, "这条也马克。", 2, floor, 0, now(), "广东");
      }
      const c = db.prepare("SELECT COUNT(*) AS c FROM comments WHERE post_id=?").get(p.id).c;
      db.prepare("UPDATE posts SET comment_count=? WHERE id=?").run(c, p.id);
    }
  });
  tx();
}

function migrateDms() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(from_id) REFERENCES users(id),
      FOREIGN KEY(to_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_dms_to ON dms(to_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_dms_pair ON dms(from_id, to_id);
  `);
  const count = db.prepare("SELECT COUNT(*) AS c FROM dms").get().c;
  if (count > 0) return;
  const users = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 6").all();
  if (users.length < 3) return;
  const me = users[0].id;
  const a = users[1].id;
  const b = users[2].id;
  const c = users[3] ? users[3].id : users[2].id;
  const ins = db.prepare("INSERT INTO dms (from_id, to_id, body, is_read, created_at) VALUES (?,?,?,?,?)");
  const t0 = new Date(Date.now() - 3600 * 1000 * 26).toISOString();
  const t1 = new Date(Date.now() - 3600 * 1000 * 25).toISOString();
  const t2 = new Date(Date.now() - 3600 * 1000 * 3).toISOString();
  const t3 = new Date(Date.now() - 3600 * 1000 * 2).toISOString();
  const t4 = new Date(Date.now() - 60 * 1000 * 18).toISOString();
  ins.run(a, me, "今晚三楼见，我把基地图纸发你。", 0, t0);
  ins.run(me, a, "好，泳池见。我带一份生存开局清单。", 1, t1);
  ins.run(b, me, "求一份红石电梯材料表，越简越好。", 0, t2);
  ins.run(c, me, "壁纸包我下好了，失效了喊我。", 1, t3);
  ins.run(a, me, "图纸第一张是一层仓库，你先看。", 0, t4);
}

function migrateBoards() {
  ensureCol("boards", "category", "ALTER TABLE boards ADD COLUMN category TEXT DEFAULT '生活综合'");
  ensureCol("boards", "heat", "ALTER TABLE boards ADD COLUMN heat INTEGER DEFAULT 0");
  ensureCol("boards", "topics", "ALTER TABLE boards ADD COLUMN topics INTEGER DEFAULT 0");
  ensureCol("boards", "moderators", "ALTER TABLE boards ADD COLUMN moderators TEXT DEFAULT '[]'");
  ensureCol("boards", "system_flag", "ALTER TABLE boards ADD COLUMN system_flag INTEGER DEFAULT 0");
  ensureCol("posts", "is_official", "ALTER TABLE posts ADD COLUMN is_official INTEGER DEFAULT 0");

  ensureCol("boards", "rules", "ALTER TABLE boards ADD COLUMN rules TEXT DEFAULT ''");
  const defaultRules =
    "发帖先看置顶，文明交流，轻松灌水。\n\n一、以下内容将被处理\n1. 违法违规、人身攻击、骚扰\n2. 广告引流、欺诈外链\n3. 恶意刷屏、引战\n\n二、灌水可以，别把水搅浑。投诉建议请走意见反馈版。";
  const poolRules =
    "三楼泳池坚持轻松表达。吃饭睡觉打豆豆、聊天扯淡都可以。玩得开心，别把这里当成肆意乱水、引战的地方。\n\n投诉建议请走意见反馈版。\n\n一、以下内容将严肃处理\n1. 违法违规信息\n2. 人身攻击、骚扰\n3. 广告、欺诈链接\n4. 恶意刷屏";
  db.prepare("UPDATE boards SET rules=? WHERE slug='pool'").run(poolRules);
  db.prepare("UPDATE boards SET desc=? WHERE slug='pool'").run("三楼游泳池，尽情来灌水吧！");
  db.prepare("UPDATE boards SET rules=? WHERE (rules IS NULL OR rules='') AND slug!='pool'").run(defaultRules);

  const pool = db.prepare("SELECT id FROM boards WHERE slug='pool'").get();
  if (pool) {
    const n = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE board_id=?").get(pool.id).c;
    const owner = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get();
    if (n === 0 && owner && getSetting("seed_demo", true) !== false) {
      const img = (id) => `https://picsum.photos/seed/${id}/640/400`;
      const addPost = db.prepare(
        `INSERT INTO posts (user_id, board_id, title, content, images, tags, view_count, like_count, comment_count, collect_count, is_essence, is_pinned, is_official, created_at, ip_region)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      );
      const t = now();
      addPost.run(1, pool.id, "【全职招聘】邀请新的小伙伴加入葫芦侠团队", "社区运营、内容审核、活动策划都在招。有兴趣直接回帖投递。", "[]", '["招聘"]', 1200, 80, 0, 20, 0, 0, 1, t, "广东");
      addPost.run(1, pool.id, "【招募】葫芦侠社区 · 游戏视频创作者招募令", "会剪辑、会录游戏的来报名，优质稿件有葫芦奖励。", "[]", '["招募"]', 860, 40, 0, 12, 0, 1, 0, t, "广东");
      addPost.run(1, pool.id, "【声音征集】你的声音", "录一句「三楼，你懂的」，有机会做成版块彩蛋。", "[]", '["征集"]', 420, 18, 0, 6, 0, 1, 0, t, "广东");
      addPost.run(1, pool.id, "【社区勋章补发申请贴】", "漏发勋章的在这层楼留下用户名和截图。", "[]", '["勋章"]', 310, 11, 0, 4, 0, 1, 0, t, "广东");
      addPost.run(1, pool.id, "【公告】最新规定 / 征集 / 反馈 / 投诉 / 举报", "版规更新：广告、外链失效、引战会折叠。先看再发。", "[]", '["公告"]', 2100, 90, 0, 30, 1, 1, 1, t, "广东");
      addPost.run(8, pool.id, "出去逛街咯", "今天去哪里玩大家，出去逛逛街。你还没睡觉啊？", JSON.stringify([img("streetfood")]), '["逛街"]', 8, 5, 2, 0, 0, 0, 0, t, "江苏");
      addPost.run(12, pool.id, "【悟静】中秋节快乐，小伙伴们[花心]", "月满中秋，团圆有福！", JSON.stringify([img("mooncake")]), '["中秋"]', 170, 22, 22, 8, 0, 0, 0, t, "重庆");
      const c = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE board_id=?").get(pool.id).c;
      db.prepare("UPDATE boards SET post_count=?, today_posts=? WHERE id=?").run(c, c, pool.id);
    }
  }
}

function migrateStaff() {
  ensureCol("users", "role", "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  ensureCol("users", "birthday", "ALTER TABLE users ADD COLUMN birthday TEXT DEFAULT ''");
  ensureCol("users", "banned_until", "ALTER TABLE users ADD COLUMN banned_until TEXT");
  ensureCol("users", "muted_until", "ALTER TABLE users ADD COLUMN muted_until TEXT");
  ensureCol("posts", "is_locked", "ALTER TABLE posts ADD COLUMN is_locked INTEGER DEFAULT 0");
  ensureCol("posts", "is_hidden", "ALTER TABLE posts ADD COLUMN is_hidden INTEGER DEFAULT 0");
  ensureCol("dms", "images", "ALTER TABLE dms ADD COLUMN images TEXT DEFAULT '[]'");
  ensureCol("dms", "deleted", "ALTER TABLE dms ADD COLUMN deleted INTEGER DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS board_mods (
      board_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (board_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS board_mutes (
      board_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      until_at TEXT NOT NULL,
      reason TEXT DEFAULT '',
      PRIMARY KEY (board_id, user_id)
    );
  `);
  db.prepare("UPDATE users SET role='admin' WHERE username IN ('qinghu','admin')").run();
  const admin = db.prepare("SELECT id FROM users WHERE username='admin'").get();
  const hasAdmin = db.prepare("SELECT id FROM users WHERE COALESCE(role,'user')='admin' LIMIT 1").get();
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (!admin && !hasAdmin && userCount > 0 && getSetting("seed_demo", true) !== false) {
    db.prepare(
      `INSERT INTO users (username, password_hash, nickname, avatar, bio, gender, city, exp, gourd, title, created_at, ip_region, role, birthday)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      "admin",
      bcrypt.hashSync("123456", 8),
      "站务",
      avatarOf("admin"),
      "三楼站务号，处理举报与版务。",
      "保密",
      "广州",
      3200,
      0,
      "三楼侠",
      now(),
      "广东",
      "admin",
      "1998-06-01"
    );
  }
  const birthdays = {
    qinghu: "1996-08-18",
    akai: "1999-03-12",
    endman: "1997-11-02",
    liyue: "2001-05-20",
    midlaner: "2000-07-08",
    island: "1998-01-30",
    stardew: "2002-04-16",
    xiaoman: "2003-09-09",
    lab: "1995-12-01",
    newbie: "2005-02-14",
    porter: "1994-06-22",
    yeyu: "2000-10-28"
  };
  const setBirth = db.prepare("UPDATE users SET birthday=? WHERE username=? AND (birthday IS NULL OR birthday='')");
  Object.entries(birthdays).forEach(([name, day]) => setBirth.run(day, name));
  db.prepare("DELETE FROM board_mods WHERE user_id NOT IN (SELECT id FROM users)").run();
  db.prepare("DELETE FROM board_mods WHERE board_id NOT IN (SELECT id FROM boards)").run();
  const boards = db.prepare("SELECT id FROM boards").all();
  const namesOf = db.prepare("SELECT u.nickname FROM board_mods m JOIN users u ON u.id=m.user_id WHERE m.board_id=?");
  const updMods = db.prepare("UPDATE boards SET moderators=? WHERE id=?");
  boards.forEach((b) => {
    updMods.run(JSON.stringify(namesOf.all(b.id).map((r) => r.nickname)), b.id);
  });
}

function mapSoft(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    version: row.version,
    size: row.size,
    category: row.category,
    summary: row.summary,
    content: row.content,
    images: JSON.parse(row.images || "[]"),
    link: row.link,
    downloads: row.downloads || 0,
    postId: row.post_id || 0,
    createdAt: row.created_at
  };
}

function mapTrack(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    cover: row.cover,
    url: row.url,
    userId: row.user_id || 0,
    lyrics: row.lyrics || "",
    source: row.source || "",
    sourceId: row.source_id || ""
  };
}

function migrateMedia() {
  ensureCol("posts", "soft_id", "ALTER TABLE posts ADD COLUMN soft_id INTEGER DEFAULT 0");
  ensureCol("posts", "track_id", "ALTER TABLE posts ADD COLUMN track_id INTEGER DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS softwares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      version TEXT DEFAULT '',
      size TEXT DEFAULT '',
      category TEXT DEFAULT '工具',
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      link TEXT DEFAULT '',
      downloads INTEGER DEFAULT 0,
      post_id INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT DEFAULT '三楼电台',
      cover TEXT,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user_id INTEGER DEFAULT 0
    );
  `);
  ensureCol("tracks", "user_id", "ALTER TABLE tracks ADD COLUMN user_id INTEGER DEFAULT 0");
  const demoSeed = getSetting("seed_demo", true) !== false && db.prepare("SELECT id FROM users LIMIT 1").get();
  if (demoSeed && db.prepare("SELECT COUNT(*) AS c FROM tracks").get().c === 0) {
    const addT = db.prepare("INSERT INTO tracks (title, artist, cover, url, created_at) VALUES (?,?,?,?,?)");
    const t = now();
    [
      ["晚风路过三楼", "青葫夜谈", "https://picsum.photos/seed/qh-m1/240/240", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"],
      ["泳池边", "楼里有光", "https://picsum.photos/seed/qh-m2/240/240", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"],
      ["签到进行曲", "葫芦丝", "https://picsum.photos/seed/qh-m3/240/240", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"],
      ["夜读", "三楼电台", "https://picsum.photos/seed/qh-m4/240/240", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"],
      ["回帖以后", "青葫", "https://picsum.photos/seed/qh-m5/240/240", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"]
    ].forEach((row) => addT.run(...row, t));
  }
  if (demoSeed && db.prepare("SELECT COUNT(*) AS c FROM softwares").get().c === 0) {
    const owner = db.prepare("SELECT id FROM users WHERE username='qinghu'").get() || db.prepare("SELECT id FROM users LIMIT 1").get();
    const android = db.prepare("SELECT id FROM boards WHERE slug='android'").get();
    const addS = db.prepare(
      `INSERT INTO softwares (user_id, name, icon, version, size, category, summary, content, images, link, downloads, post_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const addP = db.prepare(
      `INSERT INTO posts (user_id, board_id, title, content, images, tags, view_count, like_count, comment_count, collect_count, created_at, ip_region, soft_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const t = now();
    const catalog = [
      ["青葫便签", "note", "1.4.2", "8.6 MB", "工具", "速记、待办、贴到锁屏。", "离线也能写。支持置顶和标签颜色。", "https://example.com/qinghu-note"],
      ["三楼图库", "album", "2.1.0", "12 MB", "美化", "壁纸、头像框素材合集。", "按版块分类收藏图片，发帖可一键引用。", "https://example.com/qinghu-album"],
      ["楼记输入法", "kbd", "0.9.8", "21 MB", "系统", "词库跟着三楼热词走。", "常用葫芦梗、版块名都能打出来。", "https://example.com/qinghu-ime"],
      ["清风天气", "weather", "3.0.1", "6.2 MB", "工具", "极简天气，通知栏一行。", "不弹广告。支持小组件。", "https://example.com/qinghu-weather"],
      ["夜读", "read", "1.2.5", "9.4 MB", "娱乐", "护眼阅读，电台可同时开。", "本地 TXT / EPUB，夜间热度自动降亮。", "https://example.com/qinghu-reader"]
    ];
    catalog.forEach((row, i) => {
      const shots = JSON.stringify([
        `https://picsum.photos/seed/soft${i}a/360/640`,
        `https://picsum.photos/seed/soft${i}b/360/640`
      ]);
      const icon = `https://api.dicebear.com/7.x/shapes/svg?seed=${row[1]}&backgroundColor=ffd1dc`;
      const sid = addS.run(owner.id, row[0], icon, row[2], row[3], row[4], row[5], row[6], shots, row[7], 120 + i * 37, 0, t).lastInsertRowid;
      if (android) {
        const pid = addP.run(
          owner.id,
          android.id,
          `【软件】${row[0]} ${row[2]}`,
          `${row[5]}\n\n${row[6]}\n\n在软件库查看：/soft/${sid}`,
          shots,
          JSON.stringify(["软件", row[4]]),
          200 + i * 40,
          12 + i,
          0,
          4,
          t,
          "广东",
          sid
        ).lastInsertRowid;
        db.prepare("UPDATE softwares SET post_id=? WHERE id=?").run(pid, sid);
        db.prepare("UPDATE boards SET post_count = post_count+1 WHERE id=?").run(android.id);
      }
    });
  }
  const tagged = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE COALESCE(soft_id,0)>0 AND COALESCE(track_id,0)>0").get().c;
  if (tagged === 0) {
    db.prepare("UPDATE posts SET track_id=1 WHERE COALESCE(soft_id,0)>0").run();
  }
}

function migrateMedals() {
  ensureCol("board_mods", "honor", "ALTER TABLE board_mods ADD COLUMN honor TEXT DEFAULT ''");
  ensureCol("board_mods", "honor_color", "ALTER TABLE board_mods ADD COLUMN honor_color TEXT DEFAULT '#38bdf8'");
  const boards = db.prepare("SELECT id, slug, color FROM boards").all();
  const byId = {};
  boards.forEach((b) => { byId[b.id] = b; });
  const rows = db.prepare("SELECT board_id, user_id, honor FROM board_mods").all();
  const upd = db.prepare("UPDATE board_mods SET honor=?, honor_color=? WHERE board_id=? AND user_id=?");
  rows.forEach((r) => {
    if (r.honor) return;
    const b = byId[r.board_id];
    const pair = honorPreset(b && b.slug, b && b.color);
    upd.run(pair[0], pair[1], r.board_id, r.user_id);
  });
}

function migrateWear() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_medals (
      user_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      equipped INTEGER DEFAULT 0,
      granted_at TEXT NOT NULL,
      UNIQUE(user_id, slug)
    );
    CREATE TABLE IF NOT EXISTS user_honors (
      user_id INTEGER NOT NULL,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      color TEXT DEFAULT '#38bdf8',
      UNIQUE(user_id, board_id)
    );
  `);
  ensureCol("tracks", "lyrics", "ALTER TABLE tracks ADD COLUMN lyrics TEXT DEFAULT ''");
  ensureCol("tracks", "source", "ALTER TABLE tracks ADD COLUMN source TEXT DEFAULT ''");
  ensureCol("tracks", "source_id", "ALTER TABLE tracks ADD COLUMN source_id TEXT DEFAULT ''");
  ensureCol("users", "last_login_day", "ALTER TABLE users ADD COLUMN last_login_day TEXT DEFAULT ''");
  ensureCol("users", "profile_bonus", "ALTER TABLE users ADD COLUMN profile_bonus INTEGER DEFAULT 0");
  ensureCol("users", "photo_bonus", "ALTER TABLE users ADD COLUMN photo_bonus INTEGER DEFAULT 0");
  const n = db.prepare("SELECT COUNT(*) AS c FROM user_honors").get().c;
  if (!n) {
    const rows = db.prepare(
      "SELECT user_id, board_id, honor, honor_color FROM board_mods WHERE honor IS NOT NULL AND honor != ''"
    ).all();
    const ins = db.prepare("INSERT OR IGNORE INTO user_honors (user_id, board_id, title, color) VALUES (?,?,?,?)");
    rows.forEach((r) => ins.run(r.user_id, r.board_id, r.honor, r.honor_color || "#38bdf8"));
  }
}

module.exports = {
  db,
  now,
  levelOf,
  titleOf,
  publicUser,
  bumpExp,
  notify,
  seedIfEmpty,
  decoratePost,
  avatarOf,
  mapBoard,
  migrateBoards,
  migrateGifts,
  mapGift,
  LEVELS,
  rankOf,
  migrateCommentThreads,
  migrateDms,
  migrateStaff,
  migrateCommentFit,
  refreshBoardStats,
  scrubTestPosts,
  isAdmin,
  isSuper,
  canModerate,
  ageOf,
  mapSoft,
  mapTrack,
  migrateMedia,
  migrateMedals,
  MEDALS,
  honorPreset,
  migrateWear,
  getLevels,
  getExpRules,
  setSetting,
  expOf,
  medalCatalog,
  addMedal,
  removeMedal,
  setWornMedals,
  grantMedal,
  upsertHonor,
  logAdmin,
  adminLogs,
  isInstalled,
  getSite,
  installFresh
};
