const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const {
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
  migrateCommentThreads,
  migrateDms,
  migrateStaff,
  migrateCommentFit,
  refreshBoardStats,
  scrubTestPosts,
  isAdmin,
  canModerate,
  isSuper,
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
} = require("./db");
const { attachGeoDb, getClientIp, lookupIp, regionOf } = require("./geoip");
const { searchSongs, lyricsFor } = require("./music");
const net = require("net");

seedIfEmpty();
migrateBoards();
migrateGifts();
migrateCommentThreads();
migrateCommentFit();
scrubTestPosts();
migrateDms();
migrateStaff();
migrateMedia();
migrateMedals();
migrateWear();
refreshBoardStats();
attachGeoDb(db);

function loadDotEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i <= 0) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  });
}
loadDotEnv();

const SECRET = process.env.JWT_SECRET || "qinghu-sanlou-dev-secret";
const PORT = Number(process.env.PORT || 3001);
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype || "";
    const name = file.originalname || "";
    if (/^image\//.test(mime) || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(name)) {
      return cb(null, true);
    }
    cb(new Error("请上传图片文件"));
  }
});
const mediaUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname || "";
    if (file.fieldname === "cover") {
      if (/^image\//.test(file.mimetype)) return cb(null, true);
      return cb(new Error("封面需要是图片"));
    }
    if (file.fieldname === "audio") {
      if (/^audio\//.test(file.mimetype) || /\.(mp3|m4a|wav|ogg|aac|flac|mpeg)$/i.test(name)) return cb(null, true);
      return cb(new Error("请上传 mp3、m4a、wav 或 ogg"));
    }
    cb(null, false);
  }
});

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(uploadDir, { index: false, fallthrough: false }));

function sign(user) {
  return jwt.sign({ uid: user.id, username: user.username }, SECRET, { expiresIn: "14d" });
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      req.user = db.prepare("SELECT * FROM users WHERE id=?").get(payload.uid);
    } catch {
      req.user = null;
    }
  }
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: "请先登录" });
    next();
  });
}

function stillActive(iso) {
  return !!(iso && new Date(iso).getTime() > Date.now());
}

function untilFromHours(hours) {
  const n = Number(hours);
  const h = Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 365) : 24 * 365 * 10;
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

function assertNotBanned(user) {
  if (stillActive(user && user.banned_until)) {
    const until = String(user.banned_until).slice(0, 16).replace("T", " ");
    const err = new Error(`账号已封禁至 ${until}`);
    err.status = 403;
    throw err;
  }
}

function assertCanSpeak(user, boardId) {
  assertNotBanned(user);
  if (isAdmin(user)) return;
  if (stillActive(user && user.muted_until)) {
    const until = String(user.muted_until).slice(0, 16).replace("T", " ");
    const err = new Error(`全站禁言至 ${until}`);
    err.status = 403;
    throw err;
  }
  if (boardId) {
    const mute = db.prepare("SELECT until_at, reason FROM board_mutes WHERE board_id=? AND user_id=?").get(boardId, user.id);
    if (mute && stillActive(mute.until_at)) {
      const until = String(mute.until_at).slice(0, 16).replace("T", " ");
      const err = new Error(mute.reason ? `本版禁言至 ${until}：${mute.reason}` : `本版禁言至 ${until}`);
      err.status = 403;
      throw err;
    }
  }
}

function authAdmin(req, res, next) {
  authRequired(req, res, () => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "需要管理员权限" });
    next();
  });
}

function asyncH(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(() => {
      if (!res.headersSent) res.status(500).json({ error: "服务开小差了" });
    });
  };
}

const geoHits = new Map();
function geoRate(key, max = 40) {
  const nowMs = Date.now();
  const arr = (geoHits.get(key) || []).filter((t) => nowMs - t < 60000);
  if (arr.length >= max) return false;
  arr.push(nowMs);
  geoHits.set(key, arr);
  return true;
}

function parseImages(raw) {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
    return arr.filter((u) => typeof u === "string" && u.startsWith("/uploads/")).slice(0, 9);
  } catch {
    return [];
  }
}

function safeMediaUrl(raw) {
  const s = String(raw || "").trim();
  if (s.startsWith("/uploads/")) return s.slice(0, 240);
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return s.slice(0, 500);
  } catch {
    return "";
  }
  return "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dbStats() {
  try {
    return {
      ok: true,
      users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
      boards: db.prepare("SELECT COUNT(*) AS c FROM boards").get().c,
      posts: db.prepare("SELECT COUNT(*) AS c FROM posts").get().c,
      comments: db.prepare("SELECT COUNT(*) AS c FROM comments").get().c
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function uploadsCheck() {
  try {
    fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
    return { ok: true, writable: true };
  } catch (err) {
    return { ok: false, writable: false, error: String(err.message || err) };
  }
}

function sampleIds() {
  const board = db.prepare("SELECT id FROM boards ORDER BY sort_order ASC LIMIT 1").get();
  const post = db.prepare("SELECT id FROM posts ORDER BY id ASC LIMIT 1").get();
  const user = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get();
  const peer = user
    ? db.prepare("SELECT id FROM users WHERE id<>? ORDER BY id ASC LIMIT 1").get(user.id)
    : db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1 OFFSET 1").get();
  return {
    boardId: board ? board.id : 1,
    postId: post ? post.id : 1,
    userId: user ? user.id : 1,
    peerId: peer ? peer.id : 2
  };
}

function featureCatalog() {
  const s = sampleIds();
  return [
    { id: "health", name: "服务健康", method: "GET", path: "/api/health", sample: "/api/health", params: [], returns: ["ok", "name", "checks"], auth: false },
    { id: "config", name: "功能契约", method: "GET", path: "/api/config", sample: "/api/config", params: [], returns: ["name", "features", "samples"], auth: false },
    { id: "home", name: "首页聚合", method: "GET", path: "/api/home", sample: "/api/home", params: [], returns: ["banners", "hotBoards", "hots"], auth: false },
    { id: "postsRecommend", name: "推荐帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=recommend", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsFollow", name: "关注流", method: "GET", path: "/api/posts", sample: "/api/posts?tab=follow", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsHot", name: "热门帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=hot", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsEssence", name: "精华帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=essence", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsLatest", name: "此刻/最新", method: "GET", path: "/api/posts", sample: "/api/posts?tab=latest", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsReply", name: "版块按回复", method: "GET", path: "/api/posts", sample: `/api/posts?boardId=${s.boardId}&tab=reply`, params: ["boardId", "tab"], returns: ["posts"], auth: false },
    { id: "boards", name: "版块列表", method: "GET", path: "/api/boards", sample: "/api/boards", params: ["category", "followed"], returns: ["boards"], auth: false },
    { id: "boardDetail", name: "版块详情", method: "GET", path: "/api/boards/:id", sample: `/api/boards/${s.boardId}`, params: ["id"], returns: ["board"], auth: false },
    { id: "postDetail", name: "帖子详情", method: "GET", path: "/api/posts/:id", sample: `/api/posts/${s.postId}`, params: ["id"], returns: ["post"], auth: false },
    { id: "comments", name: "评论列表", method: "GET", path: "/api/posts/:id/comments", sample: `/api/posts/${s.postId}/comments`, params: ["id"], returns: ["comments"], auth: false },
    { id: "levels", name: "等级称号", method: "GET", path: "/api/levels", sample: "/api/levels", params: [], returns: ["levels"], auth: false },
    { id: "search", name: "搜索", method: "GET", path: "/api/search", sample: "/api/search?q=%E8%91%AB%E8%8A%A6", params: ["q"], returns: ["posts", "users", "boards"], auth: false },
    { id: "rankings", name: "排行榜", method: "GET", path: "/api/rankings", sample: "/api/rankings", params: [], returns: ["masters", "harvest", "checkin", "hotPosts"], auth: false },
    { id: "gifts", name: "装扮兑换", method: "GET", path: "/api/gifts", sample: "/api/gifts", params: [], returns: ["gifts"], auth: false },
    { id: "user", name: "用户资料", method: "GET", path: "/api/users/:id", sample: `/api/users/${s.userId}`, params: ["id"], returns: ["user"], auth: false },
    { id: "userPosts", name: "用户帖子", method: "GET", path: "/api/users/:id/posts", sample: `/api/users/${s.userId}/posts`, params: ["id"], returns: ["posts"], auth: false },
    { id: "userReplies", name: "用户回复", method: "GET", path: "/api/users/:id/replies", sample: `/api/users/${s.userId}/replies`, params: ["id"], returns: ["replies"], auth: false },
    { id: "userCollects", name: "用户收藏", method: "GET", path: "/api/users/:id/collects", sample: `/api/users/${s.userId}/collects`, params: ["id"], returns: ["posts"], auth: false },
    { id: "userFollowing", name: "关注列表", method: "GET", path: "/api/users/:id/following", sample: `/api/users/${s.userId}/following`, params: ["id"], returns: ["users", "boards"], auth: false },
    { id: "userFollowers", name: "粉丝列表", method: "GET", path: "/api/users/:id/followers", sample: `/api/users/${s.userId}/followers`, params: ["id"], returns: ["users"], auth: false },
    { id: "authMe", name: "当前登录", method: "GET", path: "/api/auth/me", sample: "/api/auth/me", params: [], returns: ["user"], auth: true },
    { id: "checkin", name: "签到状态", method: "GET", path: "/api/checkin", sample: "/api/checkin", params: [], returns: ["done", "streak", "gourd", "reward"], auth: true },
    { id: "notifications", name: "消息通知", method: "GET", path: "/api/notifications", sample: "/api/notifications", params: [], returns: ["notifications", "unread"], auth: true },
    { id: "login", name: "登录", method: "POST", path: "/api/auth/login", params: ["username", "password"], returns: ["token", "user"], auth: false, write: true },
    { id: "register", name: "注册", method: "POST", path: "/api/auth/register", params: ["username", "password", "nickname"], returns: ["token", "user"], auth: false, write: true },
    { id: "publish", name: "发帖", method: "POST", path: "/api/posts", params: ["boardId", "title", "content", "images", "tags"], returns: ["post"], auth: true, write: true },
    { id: "comment", name: "回帖", method: "POST", path: "/api/posts/:id/comments", params: ["id", "content", "parentId"], returns: ["comment"], auth: true, write: true },
    { id: "likePost", name: "点赞帖子", method: "POST", path: "/api/posts/:id/like", params: ["id"], returns: ["liked", "likeCount"], auth: true, write: true },
    { id: "collectPost", name: "收藏帖子", method: "POST", path: "/api/posts/:id/collect", params: ["id"], returns: ["collected", "collectCount"], auth: true, write: true },
    { id: "likeComment", name: "点赞评论", method: "POST", path: "/api/comments/:id/like", params: ["id"], returns: ["liked", "likeCount"], auth: true, write: true },
    { id: "followUser", name: "关注用户", method: "POST", path: "/api/users/:id/follow", params: ["id"], returns: ["followed"], auth: true, write: true },
    { id: "followBoard", name: "关注版块", method: "POST", path: "/api/boards/:id/follow", params: ["id"], returns: ["followed"], auth: true, write: true },
    { id: "doCheckin", name: "签到", method: "POST", path: "/api/checkin", params: [], returns: ["streak", "gourd", "exp", "user"], auth: true, write: true },
    { id: "redeem", name: "兑换装扮", method: "POST", path: "/api/gifts/:id/redeem", params: ["id"], returns: ["ok", "user", "gift"], auth: true, write: true },
    { id: "equip", name: "佩戴装扮", method: "POST", path: "/api/gifts/:id/equip", params: ["id"], returns: ["ok", "user", "gift"], auth: true, write: true },
    { id: "upload", name: "上传图片", method: "POST", path: "/api/upload", params: ["files"], returns: ["urls"], auth: true, write: true },
    { id: "updateMe", name: "更新资料", method: "PUT", path: "/api/users/me", params: ["nickname", "bio", "gender", "city", "avatar"], returns: ["user"], auth: true, write: true },
    { id: "readNotif", name: "已读消息", method: "POST", path: "/api/notifications/read", params: [], returns: ["ok"], auth: true, write: true },
    { id: "password", name: "修改密码", method: "PUT", path: "/api/users/me/password", params: ["oldPassword", "newPassword"], returns: ["ok"], auth: true, write: true },
    { id: "dmList", name: "私信会话", method: "GET", path: "/api/dms", sample: "/api/dms", params: [], returns: ["conversations", "unread"], auth: true },
    { id: "dmThread", name: "私信记录", method: "GET", path: "/api/dms/:id", sample: `/api/dms/${s.peerId}`, params: ["id"], returns: ["messages", "user"], auth: true },
    { id: "dmSend", name: "发私信", method: "POST", path: "/api/dms/:id", params: ["id", "body"], returns: ["message"], auth: true, write: true }
    ,
    { id: "softwares", name: "软件库", method: "GET", path: "/api/softwares", sample: "/api/softwares", params: ["category"], returns: ["softwares"], auth: false },
    { id: "softwareDetail", name: "软件详情", method: "GET", path: "/api/softwares/:id", sample: "/api/softwares/1", params: ["id"], returns: ["software", "posts"], auth: false },
    { id: "tracks", name: "电台曲库", method: "GET", path: "/api/tracks", sample: "/api/tracks", params: [], returns: ["tracks"], auth: false },
    { id: "addTrack", name: "上传歌曲", method: "POST", path: "/api/tracks", params: ["title", "artist", "audio", "cover", "url"], returns: ["track"], auth: true, write: true },
    { id: "delTrack", name: "删除歌曲", method: "DELETE", path: "/api/tracks/:id", params: ["id"], returns: ["ok"], auth: true, write: true },
    { id: "ipGeo", name: "IP属地", method: "GET", path: "/api/ip", sample: "/api/ip", params: ["ip"], returns: ["ip", "country", "province", "city", "county", "label", "text"], auth: false }
  ];
}

app.get("/api/health", (_req, res) => {
  const database = dbStats();
  const uploads = uploadsCheck();
  res.json({
    ok: !!(database.ok && uploads.ok),
    name: getSite().name,
    time: new Date().toISOString(),
    checks: {
      database: { ok: database.ok },
      uploads: { ok: uploads.ok }
    }
  });
});

app.get("/api/config", (_req, res) => {
  const site = getSite();
  res.json({
    name: site.name,
    tagline: site.tagline,
    installed: site.installed,
    version: "1.3.0",
    tabs: {
      home: ["recommend", "follow", "hot", "essence"],
      moment: ["latest"],
      board: ["reply", "latest", "hot"],
      compose: [
        { type: "moment", label: "动态", boardSlug: "pool", path: "/publish?type=moment" },
        { type: "post", label: "发帖", boardSlug: null, path: "/publish" },
        { type: "goods", label: "发商品", boardSlug: "share", path: "/publish?type=goods" },
        { type: "software", label: "发软件", boardSlug: "android", path: "/publish?type=software" }
      ]
    },
    levels: getLevels(),
    features: []
  });
});

app.get("/api/setup", (_req, res) => {
  res.json(getSite());
});

app.post("/api/setup", (req, res) => {
  if (isInstalled()) return res.status(409).json({ error: "社区已经安装过了" });
  try {
    const row = installFresh(req.body || {});
    res.json({ token: sign(row), user: publicUser(row, row.id), site: getSite() });
  } catch (e) {
    res.status(400).json({ error: e.message || "安装失败" });
  }
});

app.get("/api/admin/health", authRequired, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "仅站务可见" });
  const database = dbStats();
  const uploads = uploadsCheck();
  res.json({
    ok: !!(database.ok && uploads.ok),
    name: getSite().name,
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    node: process.version,
    checks: {
      database,
      uploads,
      jwt: { ok: true, configured: true }
    },
    samples: sampleIds(),
    features: featureCatalog()
  });
});

app.get("/api/levels", (_req, res) => {
  const table = getLevels();
  res.json({
    levels: table,
    rules: getExpRules(),
    maxLevel: table.length ? table[table.length - 1].level : 20
  });
});

app.post("/api/auth/register", asyncH(async (req, res) => {
  const { username, password, nickname } = req.body || {};
  if (!isInstalled()) return res.status(403).json({ error: "请先完成安装向导" });
  if (!username || !password) return res.status(400).json({ error: "请填写账号和密码" });
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    return res.status(400).json({ error: "账号需为 3-16 位字母数字或下划线" });
  }
  if (String(password).length < 4) return res.status(400).json({ error: "密码至少 4 位" });
  const exists = db.prepare("SELECT id FROM users WHERE username=?").get(username);
  if (exists) return res.status(400).json({ error: "账号已被占用" });
  const name = (nickname || username).slice(0, 16);
  const region = await regionOf(req);
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, nickname, avatar, bio, created_at, ip_region)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(username, bcrypt.hashSync(password, 8), name, avatarOf(username), "这家伙刚搬进三楼。", now(), region);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
  bumpExp(user.id, 10, 8);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  res.json({ token: sign(fresh), user: publicUser(fresh, fresh.id) });
}));

app.post("/api/auth/login", asyncH(async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(400).json({ error: "账号或密码不对" });
  }
  const region = await regionOf(req);
  db.prepare("UPDATE users SET ip_region=? WHERE id=?").run(region, user.id);
  const day = today();
  if (user.last_login_day !== day) {
    bumpExp(user.id, expOf("login"), 0);
    db.prepare("UPDATE users SET last_login_day=? WHERE id=?").run(day, user.id);
  }
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  res.json({ token: sign(fresh), user: publicUser(fresh, fresh.id) });
}));

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user, req.user.id) });
});

app.put("/api/users/me", authRequired, (req, res) => {
  const { nickname, bio, gender, city, avatar, birthday } = req.body || {};
  const nextAvatar = typeof avatar === "string" && avatar.startsWith("/uploads/") ? avatar : req.user.avatar;
  const nextBirthday = birthday === undefined ? (req.user.birthday || "") : String(birthday || "").slice(0, 10);
  db.prepare("UPDATE users SET nickname=?, bio=?, gender=?, city=?, avatar=?, birthday=? WHERE id=?").run(
    String(nickname || req.user.nickname || "").slice(0, 16),
    String(bio || "").slice(0, 80),
    gender || req.user.gender || "保密",
    String(city ?? req.user.city ?? "未知").slice(0, 16),
    nextAvatar,
    nextBirthday,
    req.user.id
  );
  if (!req.user.profile_bonus) {
    const filled = String(bio || req.user.bio || "").trim()
      && (gender || req.user.gender) && (gender || req.user.gender) !== "保密"
      && String(city ?? req.user.city ?? "").trim()
      && nextBirthday;
    if (filled) {
      bumpExp(req.user.id, expOf("profile"), 0);
      db.prepare("UPDATE users SET profile_bonus=1 WHERE id=?").run(req.user.id);
    }
  }
  if (!req.user.photo_bonus && nextAvatar && nextAvatar.startsWith("/uploads/")) {
    bumpExp(req.user.id, expOf("photo"), 0);
    db.prepare("UPDATE users SET photo_bonus=1 WHERE id=?").run(req.user.id);
  }
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ user: publicUser(user, user.id) });
});

app.put("/api/users/me/password", authRequired, (req, res) => {
  const oldPassword = String((req.body || {}).oldPassword || "");
  const newPassword = String((req.body || {}).newPassword || "");
  if (newPassword.length < 6) return res.status(400).json({ error: "新密码至少 6 位" });
  if (!bcrypt.compareSync(oldPassword, req.user.password_hash)) {
    return res.status(400).json({ error: "原密码不正确" });
  }
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(newPassword, 8), req.user.id);
  res.json({ ok: true });
});

app.get("/api/users/:id", authOptional, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({ user: publicUser(user, req.user && req.user.id) });
});

app.get("/api/users/:id/posts", authOptional, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM posts WHERE user_id=? AND (COALESCE(is_hidden,0)=0 OR ?=1)
       ORDER BY datetime(created_at) DESC LIMIT 50`
    )
    .all(req.params.id, req.user && (req.user.id === Number(req.params.id) || isAdmin(req.user)) ? 1 : 0);
  res.json({ posts: rows.map((r) => decoratePost(r, req.user && req.user.id)) });
});

app.get("/api/users/:id/replies", authOptional, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, p.title AS post_title FROM comments c
       JOIN posts p ON p.id = c.post_id
       WHERE c.user_id=? ORDER BY datetime(c.created_at) DESC LIMIT 50`
    )
    .all(req.params.id);
  res.json({
    replies: rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      floor: r.floor,
      postId: r.post_id,
      postTitle: r.post_title
    }))
  });
});

app.get("/api/users/:id/collects", authOptional, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM collects c JOIN posts p ON p.id=c.post_id
       WHERE c.user_id=? ORDER BY datetime(c.created_at) DESC LIMIT 50`
    )
    .all(req.params.id);
  res.json({ posts: rows.map((r) => decoratePost(r, req.user && req.user.id)) });
});

app.get("/api/users/:id/following", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const users = db
    .prepare(
      `SELECT u.* FROM follows f JOIN users u ON u.id=f.target_id
       WHERE f.user_id=? AND f.target_type='user' ORDER BY f.id DESC`
    )
    .all(req.params.id)
    .map((u) => publicUser(u, me));
  const boards = db
    .prepare(
      `SELECT b.* FROM follows f JOIN boards b ON b.id=f.target_id
       WHERE f.user_id=? AND f.target_type='board' ORDER BY f.id DESC`
    )
    .all(req.params.id)
    .map((b) => mapBoard(b, me));
  res.json({ users, boards });
});

app.get("/api/users/:id/followers", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const users = db
    .prepare(
      `SELECT u.* FROM follows f JOIN users u ON u.id=f.user_id
       WHERE f.target_type='user' AND f.target_id=? ORDER BY f.id DESC`
    )
    .all(req.params.id)
    .map((u) => publicUser(u, me));
  res.json({ users });
});

app.post("/api/users/:id/follow", authRequired, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "不能关注自己" });
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  const existed = db
    .prepare("SELECT id FROM follows WHERE user_id=? AND target_type='user' AND target_id=?")
    .get(req.user.id, id);
  if (existed) {
    db.prepare("DELETE FROM follows WHERE id=?").run(existed.id);
    return res.json({ followed: false });
  }
  db.prepare("INSERT INTO follows (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)").run(
    req.user.id,
    "user",
    id,
    now()
  );
  notify(id, req.user.id, "follow", null, "关注了你");
  res.json({ followed: true });
});

app.get("/api/boards", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const rows = db.prepare("SELECT * FROM boards ORDER BY sort_order ASC").all();
  let boards = rows.map((b) => mapBoard(b, me));
  const category = String(req.query.category || "").trim();
  if (category) boards = boards.filter((b) => b.category === category);
  if (req.query.followed === "1" || req.query.followed === "true") {
    boards = boards.filter((b) => b.followed);
  }
  res.json({ boards });
});

app.get("/api/boards/:id", authOptional, (req, res) => {
  const b = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!b) return res.status(404).json({ error: "版块不存在" });
  const me = req.user && req.user.id;
  res.json({ board: mapBoard(b, me) });
});

app.post("/api/boards/:id/follow", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const existed = db
    .prepare("SELECT id FROM follows WHERE user_id=? AND target_type='board' AND target_id=?")
    .get(req.user.id, id);
  if (existed) {
    db.prepare("DELETE FROM follows WHERE id=?").run(existed.id);
    db.prepare("UPDATE boards SET follow_count = MAX(follow_count-1,0) WHERE id=?").run(id);
    return res.json({ followed: false });
  }
  db.prepare("INSERT INTO follows (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)").run(
    req.user.id,
    "board",
    id,
    now()
  );
  db.prepare("UPDATE boards SET follow_count = follow_count+1 WHERE id=?").run(id);
  res.json({ followed: true });
});

app.get("/api/posts", authOptional, (req, res) => {
  const { tab = "recommend", boardId, userId, q, limit = 30 } = req.query;
  const me = req.user && req.user.id;
  let sql = "SELECT * FROM posts WHERE COALESCE(is_hidden,0)=0";
  const params = [];
  if (boardId) {
    sql += " AND board_id=?";
    params.push(boardId);
  }
  if (userId) {
    sql += " AND user_id=?";
    params.push(userId);
  }
  if (q) {
    sql += " AND (title LIKE ? OR content LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (tab === "follow") {
    if (!me) return res.json({ posts: [] });
    sql += ` AND (user_id IN (SELECT target_id FROM follows WHERE user_id=? AND target_type='user')
              OR board_id IN (SELECT target_id FROM follows WHERE user_id=? AND target_type='board'))`;
    params.push(me, me);
  }
  if (tab === "essence") sql += " AND is_essence=1";
  if (tab === "hot") sql += " ORDER BY (like_count*2 + comment_count*3 + view_count/20) DESC, datetime(created_at) DESC";
  else if (tab === "latest") sql += " ORDER BY datetime(created_at) DESC";
  else if (tab === "reply") sql += " ORDER BY COALESCE((SELECT MAX(datetime(created_at)) FROM comments WHERE post_id=posts.id), datetime(posts.created_at)) DESC";
  else sql += " ORDER BY is_pinned DESC, (like_count + comment_count*2) DESC, datetime(created_at) DESC";
  sql += " LIMIT ?";
  params.push(Math.min(50, Number(limit) || 30));
  const rows = db.prepare(sql).all(...params);
  res.json({ posts: rows.map((r) => decoratePost(r, me)) });
});

app.get("/api/posts/:id", authOptional, (req, res) => {
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "帖子不存在" });
  if (row.is_hidden && !(req.user && (req.user.id === row.user_id || canModerate(req.user, row.board_id)))) {
    return res.status(404).json({ error: "帖子不存在" });
  }
  db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id=?").run(row.id);
  const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(row.id);
  res.json({ post: decoratePost(fresh, req.user && req.user.id) });
});

app.post("/api/posts", authRequired, asyncH(async (req, res) => {
  const { boardId, title, content, images, tags, link, version, category, size, softId, trackId } = req.body || {};
  let body = String(content || "").trim();
  if (link) {
    const extra = [`版本 ${String(version || "").trim() || "未填写"}`, `下载 ${String(link).trim()}`].join("\n");
    body = body ? `${body}\n\n${extra}` : extra;
  }
  const headline = String(title || body || "").trim().slice(0, 48);
  if (!boardId || !headline || !body) return res.status(400).json({ error: "请完整填写版块、标题和正文" });
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(boardId);
  if (!board) return res.status(400).json({ error: "版块不存在" });
  try { assertCanSpeak(req.user, boardId); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  let soft = Number(softId) || 0;
  const track = Number(trackId) || 0;
  if (link && !soft) {
    const shots = JSON.stringify(Array.isArray(images) ? images.slice(0, 9) : []);
    const created = db.prepare(
      `INSERT INTO softwares (user_id, name, icon, version, size, category, summary, content, images, link, downloads, post_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      req.user.id,
      headline,
      (Array.isArray(images) && images[0]) || req.user.avatar,
      String(version || "1.0").slice(0, 20),
      String(size || "").slice(0, 20),
      String(category || "工具").slice(0, 12),
      body.slice(0, 80),
      body.slice(0, 2000),
      shots,
      String(link).trim().slice(0, 400),
      0,
      0,
      now()
    );
    soft = created.lastInsertRowid;
    body = `${body}\n\n软件库：/soft/${soft}`;
  }
  const info = db
    .prepare(
      `INSERT INTO posts (user_id, board_id, title, content, images, tags, created_at, ip_region, soft_id, track_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      req.user.id,
      boardId,
      headline,
      body.slice(0, 8000),
      JSON.stringify(Array.isArray(images) ? images.slice(0, 9) : []),
      JSON.stringify(Array.isArray(tags) ? tags.slice(0, 5) : []),
      now(),
      await regionOf(req),
      soft,
      track
    );
  db.prepare("UPDATE boards SET post_count = post_count+1, today_posts = today_posts+1 WHERE id=?").run(boardId);
  refreshBoardStats();
  if (soft) db.prepare("UPDATE softwares SET post_id=? WHERE id=? AND (post_id IS NULL OR post_id=0)").run(info.lastInsertRowid, soft);
  bumpExp(req.user.id, expOf("post") || 5, 5);
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(info.lastInsertRowid);
  res.json({ post: decoratePost(row, req.user.id) });
}));

app.post("/api/posts/:id/like", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  const existed = db
    .prepare("SELECT id FROM likes WHERE user_id=? AND target_type='post' AND target_id=?")
    .get(req.user.id, id);
  if (existed) {
    db.prepare("DELETE FROM likes WHERE id=?").run(existed.id);
    db.prepare("UPDATE posts SET like_count = MAX(like_count-1,0) WHERE id=?").run(id);
    return res.json({ liked: false, likeCount: post.like_count - 1 });
  }
  db.prepare("INSERT INTO likes (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)").run(
    req.user.id,
    "post",
    id,
    now()
  );
  db.prepare("UPDATE posts SET like_count = like_count+1 WHERE id=?").run(id);
  bumpExp(req.user.id, expOf("like") || 5, 0);
  notify(post.user_id, req.user.id, "like", id, "赞了你的帖子");
  res.json({ liked: true, likeCount: post.like_count + 1 });
});

app.post("/api/posts/:id/collect", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  const existed = db.prepare("SELECT id FROM collects WHERE user_id=? AND post_id=?").get(req.user.id, id);
  if (existed) {
    db.prepare("DELETE FROM collects WHERE id=?").run(existed.id);
    db.prepare("UPDATE posts SET collect_count = MAX(collect_count-1,0) WHERE id=?").run(id);
    return res.json({ collected: false, collectCount: post.collect_count - 1 });
  }
  db.prepare("INSERT INTO collects (user_id, post_id, created_at) VALUES (?,?,?)").run(req.user.id, id, now());
  db.prepare("UPDATE posts SET collect_count = collect_count+1 WHERE id=?").run(id);
  notify(post.user_id, req.user.id, "collect", id, "收藏了你的帖子");
  res.json({ collected: true, collectCount: post.collect_count + 1 });
});

app.get("/api/posts/:id/comments", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const rows = db
    .prepare("SELECT * FROM comments WHERE post_id=? ORDER BY is_pinned DESC, floor ASC, id ASC")
    .all(req.params.id);
  const comments = rows.map((c) => {
    const author = publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(c.user_id), me);
    const liked = me
      ? !!db.prepare("SELECT 1 FROM likes WHERE user_id=? AND target_type='comment' AND target_id=?").get(me, c.id)
      : false;
    return {
      id: c.id,
      content: c.content,
      likeCount: c.like_count,
      floor: c.floor,
      pinned: !!c.is_pinned,
      createdAt: c.created_at,
      ipRegion: c.ip_region,
      parentId: c.parent_id,
      liked,
      author
    };
  });
  res.json({ comments });
});

app.post("/api/posts/:id/comments", authRequired, asyncH(async (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (post.is_locked) return res.status(403).json({ error: "帖子已锁定，无法回复" });
  try { assertCanSpeak(req.user, post.board_id); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const content = String((req.body && req.body.content) || "").trim();
  if (!content) return res.status(400).json({ error: "评论不能为空" });
  const maxFloor = db.prepare("SELECT MAX(floor) AS m FROM comments WHERE post_id=?").get(post.id).m || 0;
  const info = db
    .prepare(
      `INSERT INTO comments (post_id, user_id, parent_id, content, floor, created_at, ip_region)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(
      post.id,
      req.user.id,
      req.body.parentId || null,
      content.slice(0, 1000),
      maxFloor + 1,
      now(),
      await regionOf(req)
    );
  db.prepare("UPDATE posts SET comment_count = comment_count+1 WHERE id=?").run(post.id);
  bumpExp(req.user.id, expOf("comment") || 10, 1);
  const parentId = req.body.parentId || null;
  if (parentId) {
    const parent = db.prepare("SELECT * FROM comments WHERE id=?").get(parentId);
    if (parent) notify(parent.user_id, req.user.id, "comment", post.id, "回复了你的评论");
  } else {
    notify(post.user_id, req.user.id, "comment", post.id, "回复了你的帖子");
  }
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(info.lastInsertRowid);
  res.json({
    comment: {
      id: c.id,
      content: c.content,
      likeCount: 0,
      floor: c.floor,
      pinned: false,
      createdAt: c.created_at,
      ipRegion: c.ip_region,
      parentId: c.parent_id,
      liked: false,
      author: publicUser(req.user, req.user.id)
    }
  });
}));

app.post("/api/comments/:id/like", authRequired, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const existed = db
    .prepare("SELECT id FROM likes WHERE user_id=? AND target_type='comment' AND target_id=?")
    .get(req.user.id, c.id);
  if (existed) {
    db.prepare("DELETE FROM likes WHERE id=?").run(existed.id);
    db.prepare("UPDATE comments SET like_count = MAX(like_count-1,0) WHERE id=?").run(c.id);
    return res.json({ liked: false, likeCount: Math.max(0, c.like_count - 1) });
  }
  db.prepare("INSERT INTO likes (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)").run(
    req.user.id,
    "comment",
    c.id,
    now()
  );
  db.prepare("UPDATE comments SET like_count = like_count+1 WHERE id=?").run(c.id);
  res.json({ liked: true, likeCount: c.like_count + 1 });
});

app.post("/api/upload", authRequired, (req, res) => {
  upload.array("files", 9)(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "图片太大，单张不超过 6MB" : (err.message || "上传失败");
      return res.status(400).json({ error: msg });
    }
    const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    if (!urls.length) return res.status(400).json({ error: "没有收到图片" });
    res.json({ urls });
  });
});

app.get("/api/search", authOptional, (req, res) => {
  const q = String(req.query.q || "").trim();
  const me = req.user && req.user.id;
  if (!q) return res.json({ posts: [], users: [], boards: [] });
  const posts = db
    .prepare(
      `SELECT * FROM posts WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
       ORDER BY like_count DESC LIMIT 20`
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`)
    .map((r) => decoratePost(r, me));
  const users = db
    .prepare("SELECT * FROM users WHERE nickname LIKE ? OR username LIKE ? LIMIT 10")
    .all(`%${q}%`, `%${q}%`)
    .map((u) => publicUser(u, me));
  const boards = db
    .prepare("SELECT * FROM boards WHERE name LIKE ? OR desc LIKE ? LIMIT 10")
    .all(`%${q}%`, `%${q}%`)
    .map((b) => mapBoard(b, me));
  res.json({ posts, users, boards });
});

app.get("/api/notifications", authRequired, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50")
    .all(req.user.id);
  const list = rows.map((n) => ({
    id: n.id,
    type: n.type,
    content: n.content,
    postId: n.post_id,
    isRead: !!n.is_read,
    createdAt: n.created_at,
    from: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(n.from_user_id), req.user.id),
    post: n.post_id ? (() => {
      const p = db.prepare("SELECT id, title, images FROM posts WHERE id=?").get(n.post_id);
      if (!p) return null;
      let imgs = [];
      try { imgs = JSON.parse(p.images || "[]"); } catch { imgs = []; }
      return { id: p.id, title: p.title, cover: imgs[0] || "" };
    })() : null
  }));
  const unread = db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0").get(req.user.id).c;
  res.json({ notifications: list, unread });
});

app.post("/api/notifications/read", authRequired, (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(req.user.id);
  res.json({ ok: true });
});

function mapDm(row, me) {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    body: row.body,
    images: parseImages(row.images),
    mine: row.from_id === me,
    isRead: !!row.is_read,
    deleted: !!row.deleted,
    createdAt: row.created_at
  };
}

app.get("/api/dms", authRequired, (req, res) => {
  const me = req.user.id;
  const rows = db
    .prepare("SELECT * FROM dms WHERE from_id=? OR to_id=? ORDER BY id DESC LIMIT 300")
    .all(me, me);
  const map = new Map();
  rows.forEach((r) => {
    const peerId = r.from_id === me ? r.to_id : r.from_id;
    if (map.has(peerId)) return;
    map.set(peerId, r);
  });
  const conversations = Array.from(map.entries()).map(([peerId, last]) => {
    const unread = db
      .prepare("SELECT COUNT(*) AS c FROM dms WHERE to_id=? AND from_id=? AND is_read=0")
      .get(me, peerId).c;
    const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
    if (!peer) return null;
    return {
      user: publicUser(peer, me),
      last: mapDm(last, me),
      unread
    };
  }).filter((c) => c && c.user);
  const unread = db.prepare("SELECT COUNT(*) AS c FROM dms WHERE to_id=? AND is_read=0").get(me).c;
  res.json({ conversations, unread });
});

app.get("/api/dms/:id", authRequired, (req, res) => {
  const me = req.user.id;
  const peerId = Number(req.params.id);
  if (!peerId || peerId === me) return res.status(400).json({ error: "不能和自己发私信" });
  const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
  if (!peer) return res.status(404).json({ error: "用户不存在" });
  db.prepare("UPDATE dms SET is_read=1 WHERE to_id=? AND from_id=?").run(me, peerId);
  const rows = db
    .prepare(
      `SELECT * FROM dms WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)
       ORDER BY id ASC LIMIT 200`
    )
    .all(me, peerId, peerId, me);
  res.json({ user: publicUser(peer, me), messages: rows.map((r) => mapDm(r, me)) });
});

app.post("/api/dms/:id", authRequired, (req, res) => {
  const me = req.user.id;
  const peerId = Number(req.params.id);
  const body = String((req.body || {}).body || "").trim().slice(0, 2000);
  if (!peerId || peerId === me) return res.status(400).json({ error: "不能和自己发私信" });
  const images = parseImages((req.body || {}).images);
  if (!body && !images.length) return res.status(400).json({ error: "请输入内容" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
  if (!peer) return res.status(404).json({ error: "用户不存在" });
  const info = db.prepare("INSERT INTO dms (from_id, to_id, body, images, is_read, created_at) VALUES (?,?,?,?,?,?)")
    .run(me, peerId, body, JSON.stringify(images), 0, now());
  const row = db.prepare("SELECT * FROM dms WHERE id=?").get(info.lastInsertRowid);
  res.json({ message: mapDm(row, me) });
});

app.post("/api/dms/:id/recall", authRequired, (req, res) => {
  const row = db.prepare("SELECT * FROM dms WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "消息不存在" });
  if (row.from_id !== req.user.id) return res.status(403).json({ error: "只能撤回自己发的消息" });
  db.prepare("UPDATE dms SET deleted=1, body='', images='[]' WHERE id=?").run(row.id);
  res.json({ ok: true });
});

app.get("/api/checkin", authRequired, (req, res) => {
  const day = today();
  const done = db.prepare("SELECT * FROM checkins WHERE user_id=? AND day=?").get(req.user.id, day);
  res.json({
    done: !!done,
    streak: req.user.checkin_streak || 0,
    gourd: req.user.gourd,
    reward: Math.min(16, 2 + (req.user.checkin_streak || 0))
  });
});

app.post("/api/checkin", authRequired, (req, res) => {
  const day = today();
  const existed = db.prepare("SELECT * FROM checkins WHERE user_id=? AND day=?").get(req.user.id, day);
  if (existed) return res.status(400).json({ error: "今天已经签过到了" });
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = req.user.last_checkin === yesterday ? (req.user.checkin_streak || 0) + 1 : 1;
  const gourd = Math.min(16, 1 + streak);
  const exp = (expOf("checkin") || 5) + Math.min(10, streak);
  db.prepare("INSERT INTO checkins (user_id, day, gourd, exp) VALUES (?,?,?,?)").run(req.user.id, day, gourd, exp);
  db.prepare("UPDATE users SET last_checkin=?, checkin_streak=?, gourd=gourd+?, exp=exp+? WHERE id=?").run(
    day,
    streak,
    gourd,
    exp,
    req.user.id
  );
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ streak, gourd, exp, user: publicUser(user, user.id) });
});

app.get("/api/rankings", authOptional, (_req, res) => {
  const masters = db.prepare("SELECT * FROM users ORDER BY exp DESC LIMIT 10").all().map((u) => publicUser(u));
  const harvest = db.prepare("SELECT * FROM users ORDER BY gourd DESC LIMIT 10").all().map((u) => publicUser(u));
  const checkin = db
    .prepare("SELECT * FROM users ORDER BY checkin_streak DESC, exp DESC LIMIT 10")
    .all()
    .map((u) => publicUser(u));
  const hotPosts = db
    .prepare("SELECT * FROM posts ORDER BY (like_count*2 + comment_count*3) DESC LIMIT 8")
    .all()
    .map((r) => decoratePost(r));
  res.json({ masters, harvest, checkin, hotPosts });
});

function equipOwnedGift(userId, gift) {
  db.prepare(
    `UPDATE user_items SET equipped=0 WHERE user_id=? AND gift_id IN (SELECT id FROM gifts WHERE kind=?)`
  ).run(userId, gift.kind);
  db.prepare("UPDATE user_items SET equipped=1 WHERE user_id=? AND gift_id=?").run(userId, gift.id);
}

app.get("/api/gifts", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const gifts = db.prepare("SELECT * FROM gifts ORDER BY kind, cost").all().map((g) => mapGift(g, me));
  res.json({ gifts });
});

app.post("/api/gifts/:id/redeem", authRequired, (req, res) => {
  const gift = db.prepare("SELECT * FROM gifts WHERE id=?").get(req.params.id);
  if (!gift) return res.status(404).json({ error: "装扮不存在" });
  const owned = db.prepare("SELECT id FROM user_items WHERE user_id=? AND gift_id=?").get(req.user.id, gift.id);
  if (!owned) {
    if (gift.stock <= 0) return res.status(400).json({ error: "已经兑完了" });
    if (req.user.gourd < gift.cost) return res.status(400).json({ error: "葫芦不够" });
    db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=?").run(gift.cost, req.user.id);
    db.prepare("UPDATE gifts SET stock = stock - 1 WHERE id=?").run(gift.id);
    db.prepare("INSERT INTO user_items (user_id, gift_id, equipped, created_at) VALUES (?,?,0,?)").run(
      req.user.id,
      gift.id,
      now()
    );
  }
  equipOwnedGift(req.user.id, gift);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ ok: true, user: publicUser(user, user.id), gift: mapGift(gift, user.id) });
});

app.post("/api/gifts/:id/equip", authRequired, (req, res) => {
  const gift = db.prepare("SELECT * FROM gifts WHERE id=?").get(req.params.id);
  if (!gift) return res.status(404).json({ error: "装扮不存在" });
  const owned = db.prepare("SELECT id FROM user_items WHERE user_id=? AND gift_id=?").get(req.user.id, gift.id);
  if (!owned) return res.status(400).json({ error: "先兑换再佩戴" });
  equipOwnedGift(req.user.id, gift);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ ok: true, user: publicUser(user, user.id), gift: mapGift(gift, user.id) });
});

app.get("/api/medals", authOptional, (req, res) => {
  const me = req.user ? publicUser(req.user, req.user.id) : null;
  const bag = new Map(((me && me.medalBag) || []).map((m) => [m.slug, m]));
  res.json({
    medals: medalCatalog().map((m) => ({
      ...m,
      owned: bag.has(m.slug),
      equipped: !!(bag.get(m.slug) && bag.get(m.slug).equipped)
    }))
  });
});

app.put("/api/users/me/medals", authRequired, (req, res) => {
  try {
    setWornMedals(req.user.id, (req.body || {}).slugs || []);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ user: publicUser(user, user.id) });
});

app.get("/api/home", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const bannerRows = db
    .prepare(
      `SELECT * FROM posts WHERE COALESCE(is_hidden,0)=0
       ORDER BY is_essence DESC, is_pinned DESC, like_count DESC LIMIT 20`
    )
    .all();
  const banners = [];
  const seenId = new Set();
  const seenCover = new Set();
  bannerRows.forEach((r) => {
    if (banners.length >= 3) return;
    if (seenId.has(r.id)) return;
    let imgs = [];
    try { imgs = JSON.parse(r.images || "[]"); } catch { imgs = []; }
    const cover = imgs[0] || "";
    if (cover && seenCover.has(cover)) return;
    seenId.add(r.id);
    if (cover) seenCover.add(cover);
    banners.push(decoratePost(r, me));
  });
  const hotBoards = db.prepare("SELECT * FROM boards ORDER BY today_posts DESC, follow_count DESC LIMIT 8").all();
  const hots = db.prepare("SELECT title, id FROM posts ORDER BY view_count DESC LIMIT 8").all();
  res.json({
    banners,
    hotBoards: hotBoards.map((b) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      todayPosts: b.today_posts,
      followCount: b.follow_count
    })),
    hots
  });
});

function syncBoardMods(boardId) {
  const names = db
    .prepare("SELECT u.nickname FROM board_mods m JOIN users u ON u.id=m.user_id WHERE m.board_id=?")
    .all(boardId)
    .map((r) => r.nickname);
  db.prepare("UPDATE boards SET moderators=? WHERE id=?").run(JSON.stringify(names), boardId);
  return names;
}

app.post("/api/posts/:id/moderate", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (!canModerate(req.user, post.board_id)) return res.status(403).json({ error: "没有版主权限" });
  const action = String((req.body || {}).action || "");
  if (action === "essence") {
    db.prepare("UPDATE posts SET is_essence=? WHERE id=?").run(post.is_essence ? 0 : 1, post.id);
  } else if (action === "pin") {
    db.prepare("UPDATE posts SET is_pinned=? WHERE id=?").run(post.is_pinned ? 0 : 1, post.id);
  } else if (action === "lock") {
    db.prepare("UPDATE posts SET is_locked=? WHERE id=?").run(post.is_locked ? 0 : 1, post.id);
  } else if (action === "hide") {
    db.prepare("UPDATE posts SET is_hidden=? WHERE id=?").run(post.is_hidden ? 0 : 1, post.id);
  } else if (action === "delete") {
    db.prepare("DELETE FROM likes WHERE target_type='post' AND target_id=?").run(post.id);
    db.prepare("DELETE FROM collects WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM comments WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM posts WHERE id=?").run(post.id);
    db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?").run(post.board_id);
    refreshBoardStats();
    return res.json({ ok: true, deleted: true });
  } else {
    return res.status(400).json({ error: "未知操作" });
  }
  const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
  res.json({ post: decoratePost(fresh, req.user.id) });
});

app.delete("/api/comments/:id", authRequired, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(c.post_id);
  const ok = c.user_id === req.user.id || (post && canModerate(req.user, post.board_id));
  if (!ok) return res.status(403).json({ error: "没有删除权限" });
  db.prepare("DELETE FROM comments WHERE id=?").run(c.id);
  if (post) db.prepare("UPDATE posts SET comment_count = MAX(comment_count-1,0) WHERE id=?").run(post.id);
  res.json({ ok: true });
});

app.post("/api/boards/:id/mute", authRequired, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  if (!canModerate(req.user, board.id)) return res.status(403).json({ error: "没有版主权限" });
  const userId = Number((req.body || {}).userId);
  const hours = Number((req.body || {}).hours);
  const reason = String((req.body || {}).reason || "").slice(0, 80);
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  if (isAdmin(target)) return res.status(400).json({ error: "不能禁言管理员" });
  if (!hours) {
    db.prepare("DELETE FROM board_mutes WHERE board_id=? AND user_id=?").run(board.id, userId);
    return res.json({ ok: true, muted: false });
  }
  const until = untilFromHours(hours);
  db.prepare(
    `INSERT INTO board_mutes (board_id, user_id, until_at, reason) VALUES (?,?,?,?)
     ON CONFLICT(board_id, user_id) DO UPDATE SET until_at=excluded.until_at, reason=excluded.reason`
  ).run(board.id, userId, until, reason);
  res.json({ ok: true, muted: true, until });
});

app.get("/api/admin/overview", authAdmin, (_req, res) => {
  res.json({
    users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    posts: db.prepare("SELECT COUNT(*) AS c FROM posts").get().c,
    comments: db.prepare("SELECT COUNT(*) AS c FROM comments").get().c,
    hidden: db.prepare("SELECT COUNT(*) AS c FROM posts WHERE COALESCE(is_hidden,0)=1").get().c,
    mods: db.prepare("SELECT COUNT(*) AS c FROM board_mods").get().c,
    banned: db.prepare("SELECT COUNT(*) AS c FROM users WHERE banned_until IS NOT NULL AND datetime(banned_until)>datetime('now')").get().c
  });
});

app.post("/api/admin/reinstall", authAdmin, (req, res) => {
  if (!isSuper(req.user)) return res.status(403).json({ error: "仅站长可重装社区" });
  const confirm = String((req.body && req.body.confirm) || "").trim();
  if (confirm !== "全新社区") return res.status(400).json({ error: "请输入确认词：全新社区" });
  try {
    const row = installFresh(req.body || {});
    res.json({ token: sign(row), user: publicUser(row, row.id), site: getSite() });
  } catch (e) {
    res.status(400).json({ error: e.message || "重装失败" });
  }
});

app.get("/api/admin/users", authAdmin, (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = String(req.query.filter || "all");
  const sort = String(req.query.sort || "new");
  const page = Math.max(0, Number(req.query.page) || 0);
  const size = 50;
  const nowIso = new Date().toISOString();
  const where = [];
  const params = [];
  if (q) {
    where.push("(nickname LIKE ? OR username LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (filter === "admin") where.push("COALESCE(role,'user')='admin'");
  else if (filter === "mod") where.push("id IN (SELECT user_id FROM board_mods)");
  else if (filter === "banned") { where.push("banned_until IS NOT NULL AND banned_until > ?"); params.push(nowIso); }
  else if (filter === "muted") { where.push("muted_until IS NOT NULL AND muted_until > ?"); params.push(nowIso); }
  const order = sort === "exp" ? "exp DESC" : sort === "gourd" ? "gourd DESC" : "id DESC";
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${whereSql}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM users ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, size, page * size);
  res.json({ users: rows.map((u) => publicUser(u, req.user.id)), total, page, size });
});

app.get("/api/admin/logs", authAdmin, (req, res) => {
  const limit = Math.max(10, Math.min(200, Number(req.query.limit) || 50));
  res.json({ logs: adminLogs(limit).map((l) => ({ id: l.id, action: l.action, detail: l.detail, createdAt: l.created_at, admin: l.admin_nickname, target: l.target_nickname })) });
});

app.put("/api/admin/users/:id", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  if (isAdmin(target) && target.id !== req.user.id && !isSuper(req.user)) {
    return res.status(403).json({ error: "只有站长可以编辑管理员" });
  }
  const body = req.body || {};
  const nickname = String(body.nickname ?? target.nickname).trim().slice(0, 16) || target.nickname;
  const bio = String(body.bio ?? target.bio).trim().slice(0, 120);
  const gender = ["保密", "男", "女"].includes(body.gender) ? body.gender : target.gender;
  const city = String(body.city ?? target.city).trim().slice(0, 12);
  const birthday = String(body.birthday ?? target.birthday).trim().slice(0, 10);
  db.prepare("UPDATE users SET nickname=?, bio=?, gender=?, city=?, birthday=? WHERE id=?")
    .run(nickname, bio, gender, city, birthday, target.id);
  logAdmin(req.user.id, "user_edit", target.id, `编辑用户 ${nickname}`);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  res.json({ user: publicUser(fresh, req.user.id) });
});

app.post("/api/admin/users/:id/password", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  if (!isSuper(req.user)) return res.status(403).json({ error: "只有站长可以重置密码" });
  const password = String((req.body || {}).password || "");
  if (password.length < 6) return res.status(400).json({ error: "新密码至少 6 位" });
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(password, 8), target.id);
  logAdmin(req.user.id, "user_password", target.id, `重置 ${target.nickname} 密码`);
  res.json({ ok: true });
});

app.post("/api/admin/users/:id/role", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  const role = String((req.body || {}).role || "user") === "admin" ? "admin" : "user";
  if (role === "admin" && !isSuper(req.user)) {
    return res.status(403).json({ error: "只有站长可以任命管理员" });
  }
  if (isAdmin(target) && role !== "admin" && !isSuper(req.user)) {
    return res.status(403).json({ error: "只有站长可以取消管理员" });
  }
  if (target.id === req.user.id && role !== "admin") {
    return res.status(400).json({ error: "不能取消自己的管理员" });
  }
  db.prepare("UPDATE users SET role=? WHERE id=?").run(role, target.id);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  logAdmin(req.user.id, role === "admin" ? "role_admin" : "role_user", target.id, `${fresh.nickname} → ${role === "admin" ? "管理员" : "用户"}`);
  res.json({ user: publicUser(fresh, req.user.id) });
});

app.post("/api/admin/users/:id/ban", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  if (isAdmin(target) && target.id !== req.user.id) return res.status(400).json({ error: "不能封禁管理员" });
  const hours = Number((req.body || {}).hours);
  if (!hours) {
    db.prepare("UPDATE users SET banned_until=NULL WHERE id=?").run(target.id);
    const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
    logAdmin(req.user.id, "unban", target.id, `解封 ${fresh.nickname}`);
    return res.json({ user: publicUser(fresh, req.user.id), banned: false });
  }
  const until = untilFromHours(hours);
  db.prepare("UPDATE users SET banned_until=? WHERE id=?").run(until, target.id);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  logAdmin(req.user.id, "ban", target.id, `封禁 ${fresh.nickname} ${hours} 小时`);
  res.json({ user: publicUser(fresh, req.user.id), banned: true });
});

app.post("/api/admin/users/:id/mute", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  if (isAdmin(target)) return res.status(400).json({ error: "不能禁言管理员" });
  const hours = Number((req.body || {}).hours);
  if (!hours) {
    db.prepare("UPDATE users SET muted_until=NULL WHERE id=?").run(target.id);
    const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
    logAdmin(req.user.id, "unmute", target.id, `解除禁言 ${fresh.nickname}`);
    return res.json({ user: publicUser(fresh, req.user.id), muted: false });
  }
  const until = untilFromHours(hours);
  db.prepare("UPDATE users SET muted_until=? WHERE id=?").run(until, target.id);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  logAdmin(req.user.id, "mute", target.id, `禁言 ${fresh.nickname} ${hours} 小时`);
  res.json({ user: publicUser(fresh, req.user.id), muted: true });
});

app.get("/api/admin/boards", authAdmin, (req, res) => {
  const boards = db.prepare("SELECT * FROM boards ORDER BY sort_order ASC").all().map((b) => {
    const mods = db
      .prepare("SELECT u.id, u.nickname, u.avatar, m.honor, m.honor_color FROM board_mods m JOIN users u ON u.id=m.user_id WHERE m.board_id=?")
      .all(b.id);
    const pair = honorPreset(b.slug, b.color);
    return {
      ...mapBoard(b, req.user.id),
      staff: mods,
      defaultHonor: pair[0],
      defaultHonorColor: pair[1]
    };
  });
  res.json({ boards });
});

app.post("/api/admin/boards/:id/mods", authAdmin, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  const body = req.body || {};
  const userId = Number(body.userId || 0);
  const key = String(body.user || body.username || body.nickname || "").trim();
  const user = userId
    ? db.prepare("SELECT * FROM users WHERE id=?").get(userId)
    : (key ? db.prepare("SELECT * FROM users WHERE username=? OR nickname=?").get(key, key) : null);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const custom = String(body.honor || "").trim().slice(0, 8);
  const pair = honorPreset(board.slug, board.color);
  const honor = custom || pair[0];
  const color = String(body.honorColor || "").trim() || pair[1];
  db.prepare("INSERT OR IGNORE INTO board_mods (board_id, user_id, honor, honor_color) VALUES (?,?,?,?)")
    .run(board.id, user.id, honor, color);
  db.prepare("UPDATE board_mods SET honor=?, honor_color=? WHERE board_id=? AND user_id=?")
    .run(honor, color, board.id, user.id);
  const names = syncBoardMods(board.id);
  res.json({ ok: true, moderators: names, user: publicUser(user, req.user.id), honor, honorColor: color });
});

app.patch("/api/admin/boards/:id/mods/:userId", authAdmin, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  const row = db.prepare("SELECT * FROM board_mods WHERE board_id=? AND user_id=?").get(board.id, req.params.userId);
  if (!row) return res.status(404).json({ error: "还不是该版版主" });
  const pair = honorPreset(board.slug, board.color);
  const honor = String((req.body || {}).honor || "").trim().slice(0, 8) || pair[0];
  const color = String((req.body || {}).honorColor || "").trim() || row.honor_color || pair[1];
  db.prepare("UPDATE board_mods SET honor=?, honor_color=? WHERE board_id=? AND user_id=?")
    .run(honor, color, board.id, req.params.userId);
  const names = syncBoardMods(board.id);
  res.json({ ok: true, moderators: names, honor, honorColor: color });
});

app.delete("/api/admin/boards/:id/mods/:userId", authAdmin, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  db.prepare("DELETE FROM board_mods WHERE board_id=? AND user_id=?").run(board.id, req.params.userId);
  const names = syncBoardMods(board.id);
  res.json({ ok: true, moderators: names });
});

app.post("/api/admin/boards", authAdmin, (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: "请填写版块名称" });
  let slug = String(body.slug || "").trim().toLowerCase().slice(0, 30);
  if (slug && !/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: "版块标识仅限小写字母数字和连字符" });
  if (!slug) slug = "board-" + Math.random().toString(36).slice(2, 8);
  if (db.prepare("SELECT id FROM boards WHERE slug=?").get(slug)) return res.status(400).json({ error: "版块标识已存在" });
  const icon = String(body.icon || name.slice(0, 1)).slice(0, 2);
  const color = String(body.color || "#FF6A00").slice(0, 16);
  const desc = String(body.desc || "").trim().slice(0, 80);
  const category = String(body.category || "生活综合").trim().slice(0, 12);
  const sort = Number(body.sort || 0);
  const info = db
    .prepare("INSERT INTO boards (name, slug, icon, cover, desc, color, sort_order, category) VALUES (?,?,?,?,?,?,?,?)")
    .run(name, slug, icon, "", desc, color, sort, category);
  logAdmin(req.user.id, "board_create", null, `新建版块 ${name}`);
  refreshBoardStats();
  res.json({ board: db.prepare("SELECT * FROM boards WHERE id=?").get(info.lastInsertRowid) });
});

app.put("/api/admin/boards/:id", authAdmin, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  const body = req.body || {};
  const name = String(body.name ?? board.name).trim().slice(0, 20) || board.name;
  const icon = String(body.icon ?? board.icon).slice(0, 2);
  const color = String(body.color ?? board.color).slice(0, 16);
  const desc = String(body.desc ?? board.desc).trim().slice(0, 80);
  const category = String(body.category ?? board.category).trim().slice(0, 12);
  const sort = Number(body.sort ?? board.sort_order);
  const rules = body.rules !== undefined ? String(body.rules).slice(0, 4000) : board.rules;
  db.prepare("UPDATE boards SET name=?, icon=?, color=?, desc=?, category=?, sort_order=?, rules=? WHERE id=?")
    .run(name, icon, color, desc, category, sort, rules, board.id);
  logAdmin(req.user.id, "board_edit", board.id, `编辑版块 ${name}`);
  res.json({ board: db.prepare("SELECT * FROM boards WHERE id=?").get(board.id) });
});

app.delete("/api/admin/boards/:id", authAdmin, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  db.pragma("foreign_keys = OFF");
  try {
    const postIds = db.prepare("SELECT id FROM posts WHERE board_id=?").all(board.id).map((r) => r.id);
    const delComments = db.prepare("DELETE FROM comments WHERE post_id=?");
    const delLikes = db.prepare("DELETE FROM likes WHERE target_type='post' AND target_id=?");
    const delCollects = db.prepare("DELETE FROM collects WHERE post_id=?");
    postIds.forEach((pid) => { delComments.run(pid); delLikes.run(pid); delCollects.run(pid); });
    db.prepare("DELETE FROM posts WHERE board_id=?").run(board.id);
    db.prepare("DELETE FROM board_mods WHERE board_id=?").run(board.id);
    db.prepare("DELETE FROM board_mutes WHERE board_id=?").run(board.id);
    db.prepare("DELETE FROM follows WHERE target_type='board' AND target_id=?").run(board.id);
    db.prepare("DELETE FROM user_honors WHERE board_id=?").run(board.id);
    db.prepare("DELETE FROM boards WHERE id=?").run(board.id);
  } finally {
    db.pragma("foreign_keys = ON");
  }
  logAdmin(req.user.id, "board_delete", null, `删除版块 ${board.name}`);
  refreshBoardStats();
  res.json({ ok: true });
});

app.put("/api/boards/:id/rules", authRequired, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  if (!canModerate(req.user, board.id)) return res.status(403).json({ error: "需要版主或管理员权限" });
  const rules = String((req.body || {}).rules || "").slice(0, 4000);
  db.prepare("UPDATE boards SET rules=? WHERE id=?").run(rules, board.id);
  logAdmin(req.user.id, "board_rules", board.id, `更新版规`);
  res.json({ ok: true, rules });
});

app.get("/api/admin/honors", authAdmin, (_req, res) => {
  const rows = db.prepare(
    `SELECT h.user_id, h.board_id, h.title, h.color, u.nickname, u.username, u.avatar, b.name AS board_name
     FROM user_honors h
     JOIN users u ON u.id = h.user_id
     JOIN boards b ON b.id = h.board_id
     ORDER BY b.sort_order ASC, h.user_id ASC`
  ).all();
  res.json({
    honors: rows.map((r) => ({
      userId: r.user_id,
      boardId: r.board_id,
      title: r.title,
      color: r.color,
      nickname: r.nickname,
      username: r.username,
      avatar: r.avatar,
      boardName: r.board_name
    }))
  });
});

app.post("/api/admin/honors", authAdmin, (req, res) => {
  const body = req.body || {};
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(body.boardId);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  const userId = Number(body.userId || 0);
  const key = String(body.user || body.username || body.nickname || "").trim();
  const user = userId
    ? db.prepare("SELECT * FROM users WHERE id=?").get(userId)
    : (key ? db.prepare("SELECT * FROM users WHERE username=? OR nickname=?").get(key, key) : null);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const pair = honorPreset(board.slug, board.color);
  const honor = upsertHonor(user.id, board.id, body.honor || pair[0], body.honorColor || pair[1]);
  res.json({ ok: true, honor, user: publicUser(user, req.user.id) });
});

app.delete("/api/admin/honors", authAdmin, (req, res) => {
  const src = { ...(req.body || {}), ...(req.query || {}) };
  const userId = Number(src.userId);
  const boardId = Number(src.boardId);
  if (!userId || !boardId) return res.status(400).json({ error: "缺少用户或版块" });
  db.prepare("DELETE FROM user_honors WHERE user_id=? AND board_id=?").run(userId, boardId);
  res.json({ ok: true });
});

app.get("/api/admin/medals", authAdmin, (_req, res) => {
  res.json({ medals: medalCatalog() });
});

app.put("/api/admin/medals/:slug", authAdmin, (req, res) => {
  const slug = req.params.slug;
  const base = MEDALS.find((m) => m.slug === slug);
  if (!base) return res.status(404).json({ error: "勋章不存在" });
  const overlay = getSetting("medal_defs", {}) || {};
  const prev = overlay[slug] || {};
  const body = req.body || {};
  overlay[slug] = {
    name: String(body.name || prev.name || base.name).slice(0, 12),
    icon: String(body.icon || prev.icon || base.icon).slice(0, 2),
    color: String(body.color || prev.color || base.color).slice(0, 16),
    desc: String(body.desc || prev.desc || base.desc).slice(0, 40),
    enabled: body.enabled === undefined ? (prev.enabled !== false) : !!body.enabled
  };
  setSetting("medal_defs", overlay);
  res.json({ medals: medalCatalog() });
});

app.post("/api/admin/medals", authAdmin, (req, res) => {
  try {
    const medal = addMedal(req.body || {});
    logAdmin(req.user.id, "medal_create", null, `新建勋章 ${medal.name}`);
    res.json({ medals: medalCatalog(), medal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/admin/medals/:slug", authAdmin, (req, res) => {
  const result = removeMedal(req.params.slug);
  logAdmin(req.user.id, "medal_delete", null, `删除勋章 ${req.params.slug}`);
  res.json({ medals: medalCatalog(), ...result });
});

app.post("/api/admin/users/:id/medals", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  try {
    grantMedal(target.id, String((req.body || {}).slug || ""));
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  res.json({ user: publicUser(target, req.user.id) });
});

app.put("/api/admin/levels", authAdmin, (req, res) => {
  const rows = Array.isArray((req.body || {}).levels) ? req.body.levels : [];
  const clean = rows
    .map((r) => ({
      level: Number(r.level),
      exp: Math.max(0, Number(r.exp) || 0),
      title: String(r.title || "").slice(0, 12) || "葫芦籽",
      color: String(r.color || "#16a34a").slice(0, 16)
    }))
    .filter((r) => r.level >= 1 && r.level <= 30)
    .sort((a, b) => a.level - b.level);
  if (clean.length < 2) return res.status(400).json({ error: "至少保留两级" });
  setSetting("levels", clean);
  res.json({ levels: getLevels() });
});

app.put("/api/admin/exp-rules", authAdmin, (req, res) => {
  const rows = Array.isArray((req.body || {}).rules) ? req.body.rules : [];
  const clean = rows.map((r) => ({
    id: String(r.id || "").slice(0, 16),
    group: String(r.group || "日常任务").slice(0, 12),
    name: String(r.name || "").slice(0, 20),
    exp: Math.max(0, Number(r.exp) || 0),
    note: String(r.note || "").slice(0, 40)
  })).filter((r) => r.id);
  if (!clean.length) return res.status(400).json({ error: "规则不能为空" });
  setSetting("exp_rules", clean);
  res.json({ rules: getExpRules() });
});

app.get("/api/admin/posts", authAdmin, (req, res) => {
  const hidden = String(req.query.hidden || "") === "1";
  const rows = hidden
    ? db.prepare("SELECT * FROM posts WHERE COALESCE(is_hidden,0)=1 ORDER BY id DESC LIMIT 40").all()
    : db.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 40").all();
  res.json({ posts: rows.map((r) => decoratePost(r, req.user.id)) });
});

app.get("/api/softwares", (_req, res) => {
  const cat = String(_req.query.category || "").trim();
  let sql = "SELECT * FROM softwares";
  const params = [];
  if (cat) {
    sql += " WHERE category=?";
    params.push(cat);
  }
  sql += " ORDER BY downloads DESC, id DESC";
  res.json({ softwares: db.prepare(sql).all(...params).map(mapSoft) });
});

app.get("/api/softwares/:id", authOptional, (req, res) => {
  const row = db.prepare("SELECT * FROM softwares WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "软件不存在" });
  const me = req.user && req.user.id;
  const posts = db.prepare("SELECT * FROM posts WHERE soft_id=? ORDER BY id DESC LIMIT 12").all(row.id).map((p) => decoratePost(p, me));
  res.json({ software: mapSoft(row), posts });
});

app.post("/api/softwares/:id/download", (_req, res) => {
  const row = db.prepare("SELECT * FROM softwares WHERE id=?").get(_req.params.id);
  if (!row) return res.status(404).json({ error: "软件不存在" });
  db.prepare("UPDATE softwares SET downloads = downloads+1 WHERE id=?").run(row.id);
  res.json({ software: mapSoft(db.prepare("SELECT * FROM softwares WHERE id=?").get(row.id)) });
});

app.get("/api/music/search", authRequired, asyncH(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "输入歌名" });
  const songs = await searchSongs(q);
  res.json({ songs });
}));

app.post("/api/tracks/import", authRequired, asyncH(async (req, res) => {
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const body = req.body || {};
  const title = String(body.title || "").trim().slice(0, 40);
  const artist = String(body.artist || "").trim().slice(0, 32) || "未知歌手";
  let url = safeMediaUrl(body.url);
  let lyrics = String(body.lyrics || "").slice(0, 20000);
  const cover = safeMediaUrl(body.cover);
  if (!title) return res.status(400).json({ error: "缺少歌名" });
  if (!lyrics) lyrics = await lyricsFor(title, artist);
  if (!url) return res.status(400).json({ error: "这首没有可播放预览，换一首或自己上传" });
  const owned = db.prepare("SELECT COUNT(*) AS c FROM tracks WHERE user_id=?").get(req.user.id).c;
  if (owned >= 30) return res.status(400).json({ error: "最多上传 30 首" });
  const dup = db.prepare("SELECT * FROM tracks WHERE title=? AND artist=? AND url=?").get(title, artist, url);
  if (dup) return res.json({ track: mapTrack(dup), existed: true });
  const id = db.prepare(
    "INSERT INTO tracks (title, artist, cover, url, created_at, user_id, lyrics, source, source_id) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(title, artist, cover, url, now(), req.user.id, lyrics, String(body.source || "").slice(0, 16), String(body.sourceId || "").slice(0, 32)).lastInsertRowid;
  bumpExp(req.user.id, 4, 1);
  res.json({ track: mapTrack(db.prepare("SELECT * FROM tracks WHERE id=?").get(id)) });
}));

app.get("/api/tracks/:id/lyrics", (_req, res) => {
  const row = db.prepare("SELECT * FROM tracks WHERE id=?").get(_req.params.id);
  if (!row) return res.status(404).json({ error: "歌曲不存在" });
  res.json({ lyrics: row.lyrics || "", track: mapTrack(row) });
});

app.get("/api/tracks", (_req, res) => {
  res.json({ tracks: db.prepare("SELECT * FROM tracks ORDER BY id DESC").all().map(mapTrack) });
});

app.post("/api/tracks", authRequired, (req, res, next) => {
  mediaUpload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "文件太大，请小于 20MB" : (err.message || "上传失败");
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, (req, res) => {
  try {
    assertNotBanned(req.user);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const owned = db.prepare("SELECT COUNT(*) AS c FROM tracks WHERE user_id=?").get(req.user.id).c;
  if (owned >= 30) return res.status(400).json({ error: "最多上传 30 首" });
  const files = req.files || {};
  const audio = files.audio && files.audio[0];
  const coverFile = files.cover && files.cover[0];
  const remote = safeMediaUrl(req.body && req.body.url);
  const src = audio ? `/uploads/${audio.filename}` : remote;
  if (!src) return res.status(400).json({ error: "请选择音频文件或填写可播放链接" });
  const fromName = audio ? path.parse(audio.originalname || "").name : "";
  const title = String((req.body && req.body.title) || fromName || "未命名").trim().slice(0, 40) || "未命名";
  const artist = String((req.body && req.body.artist) || req.user.nickname || req.user.username).trim().slice(0, 32) || "三楼电台";
  const cover = coverFile ? `/uploads/${coverFile.filename}` : safeMediaUrl(req.body && req.body.cover);
  const lyrics = String((req.body && req.body.lyrics) || "").slice(0, 20000);
  const id = db.prepare("INSERT INTO tracks (title, artist, cover, url, created_at, user_id, lyrics) VALUES (?,?,?,?,?,?,?)")
    .run(title, artist, cover, src, now(), req.user.id, lyrics).lastInsertRowid;
  bumpExp(req.user.id, 4, 1);
  res.json({ track: mapTrack(db.prepare("SELECT * FROM tracks WHERE id=?").get(id)) });
});

app.delete("/api/tracks/:id", authRequired, (req, res) => {
  const row = db.prepare("SELECT * FROM tracks WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "歌曲不存在" });
  const mine = row.user_id === req.user.id;
  if (!mine && !isAdmin(req.user)) return res.status(403).json({ error: "只能删自己传的歌" });
  db.prepare("UPDATE posts SET track_id=0 WHERE track_id=?").run(row.id);
  db.prepare("DELETE FROM tracks WHERE id=?").run(row.id);
  res.json({ ok: true });
});

app.get("/api/ip", asyncH(async (req, res) => {
  const q = String(req.query.ip || "").trim();
  const mine = getClientIp(req);
  let ip = mine;
  if (q) {
    if (!net.isIP(q)) return res.status(400).json({ error: "IP 格式不对" });
    ip = q;
    if (q !== mine && !geoRate(`${mine}:q`)) return res.status(429).json({ error: "查询太频繁" });
  }
  const geo = await lookupIp(ip);
  res.json({
    ip: geo.ip,
    country: geo.country,
    province: geo.province,
    city: geo.city,
    county: geo.county,
    isp: geo.isp,
    text: geo.text,
    label: geo.label,
    source: geo.source,
    self: geo.ip === mine
  });
}));

const publicDir = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`青葫三楼 API 已启动: http://localhost:${PORT}`);
});
