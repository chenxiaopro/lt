const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const {
  db,
  now,
  levelOf,
  titleOf,
  publicUser,
  publicUserLite,
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
  isModerator,
  staffBoards,
  mapSoft,
  mapTrack,
  migrateMedia,
  migrateIndexes,
  migrateMedals,
  MEDALS,
  honorPreset,
  migrateWear,
  migrateParse,
  purgeParseLogs,
  migrateTips,
  migrateSocial,
  maybePromoteHot,
  hotNeed,
  assignUin,
  prettyShop,
  claimPrettyUin,
  setUserUin,
  extendVip,
  getVipPlans,
  setVipPlans,
  prettyCatalog,
  upsertPrettyItem,
  deletePrettyItem,
  migrateSuperUin,
  deleteAccount,
  isMutual,
  mutualFriends,
  tipGiversOf,
  getLevels,
  getExpRules,
  getSetting,
  setSetting,
  expOf,
  medalCatalog,
  addMedal,
  removeMedal,
  setWornMedals,
  grantMedal,
  upsertHonor,
  setShownHonor,
  listMiniApps,
  saveMiniApps,
  logAdmin,
  adminLogs,
  isInstalled,
  getSite,
  installFresh
} = require("./db");
const { attachGeoDb, getClientIp, lookupIp, regionOf } = require("./geoip");
const { searchSongs, lyricsFor } = require("./music");
const { parseShare, assertPublicUrl, safeFetch, pickUrl } = require("./parse");
const { designDressAsync, hexOf, normalizeKind } = require("./dress");
const net = require("net");
const forumx = require("./forumx");

seedIfEmpty();
function safeMigrate(label, fn) {
  try { fn(); }
  catch (err) { console.error(`[migrate:${label}]`, err && err.stack ? err.stack : err); }
}
safeMigrate("boards", migrateBoards);
safeMigrate("gifts", migrateGifts);
safeMigrate("commentThreads", migrateCommentThreads);
safeMigrate("commentFit", migrateCommentFit);
safeMigrate("scrub", scrubTestPosts);
safeMigrate("dms", migrateDms);
safeMigrate("staff", migrateStaff);
safeMigrate("media", migrateMedia);
safeMigrate("medals", migrateMedals);
safeMigrate("wear", migrateWear);
safeMigrate("parse", migrateParse);
safeMigrate("boardStats", refreshBoardStats);
safeMigrate("tips", migrateTips);
safeMigrate("social", migrateSocial);
safeMigrate("superUin", migrateSuperUin);
safeMigrate("forumx", () => forumx.migrate(db));
safeMigrate("indexes", migrateIndexes);
try { attachGeoDb(db); } catch (err) { console.error("[geoip]", err && err.message); }

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

function upsertDotEnv(key, value) {
  const file = path.join(__dirname, ".env");
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const safe = String(value || "").replace(/\r?\n/g, "");
  const line = `${key}=${safe}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, () => line);
  else text = `${String(text).replace(/\s*$/, "")}\n${line}\n`;
  fs.writeFileSync(file, text);
  process.env[key] = safe;
}

function effectiveYyApi() {
  return String(process.env.YY_API || getSetting("yy_api", "") || "").trim();
}
function effectiveYyCookie() {
  return String(process.env.YY_COOKIE || getSetting("yy_cookie", "") || "").trim();
}
loadDotEnv();

const SECRET = process.env.JWT_SECRET || "qinghu-sanlou-dev-secret";
const PORT = Number(process.env.PORT || 3001);
const RELEASE = "1.0.34";
const IMAGE_MAX_MB = 6;
const VIDEO_MAX_MB = Math.max(1, Math.min(200, Number(process.env.VIDEO_MAX_MB) || 80));
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif"]);
const VIDEO_EXTS = new Set([".mp4", ".m4v", ".webm", ".mov", ".ogv"]);
const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac", ".mpeg"]);

function safeUploadExt(file) {
  const mime = String(file.mimetype || "").toLowerCase();
  const raw = path.extname(file.originalname || "").toLowerCase();
  if (mime.startsWith("video/")) return VIDEO_EXTS.has(raw) ? raw : ".mp4";
  if (mime.startsWith("audio/")) return AUDIO_EXTS.has(raw) ? raw : ".mp3";
  return IMAGE_EXTS.has(raw) ? raw : ".jpg";
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeUploadExt(file)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: IMAGE_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = file.originalname || "";
    const safeMime = /^image\/(jpeg|jpg|png|gif|webp|bmp|heic|heif)$/.test(mime);
    if (safeMime || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(name)) {
      return cb(null, true);
    }
    cb(new Error("请上传图片文件"));
  }
});
const videoUpload = multer({
  storage,
  limits: { fileSize: VIDEO_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = file.originalname || "";
    if (/^video\//.test(mime) || /\.(mp4|m4v|webm|mov|ogv)$/i.test(name)) {
      return cb(null, true);
    }
    cb(new Error("请上传 mp4、mov、m4v 或 webm 视频"));
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
app.disable("x-powered-by");
app.use(cors());
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(uploadDir, {
  index: false,
  fallthrough: false,
  maxAge: "7d",
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
}));

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

function authStaff(req, res, next) {
  authRequired(req, res, () => {
    if (!isAdmin(req.user) && !isModerator(req.user)) {
      return res.status(403).json({ error: "需要版主或管理员权限" });
    }
    next();
  });
}

// 管理员返回 null（全部版块），版主返回所辖版块 id 列表
function staffBoardIds(user) {
  return isAdmin(user) ? null : staffBoards(user.id);
}

function asyncH(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (res.headersSent) return;
      if (err && err.status) return res.status(err.status).json({ error: err.message });
      res.status(500).json({ error: "服务开小差了" });
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

function fail(message, status) {
  const err = new Error(message);
  err.status = status || 400;
  throw err;
}

function packPost(row, me, opts) {
  return forumx.withThread(db, decoratePost(row, me, opts), row, me, !!(opts && opts.lite));
}

function sendErr(res, err) {
  if (err && err.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: err && err.message ? err.message : "服务开小差了" });
}

function giveTip({ fromId, toId, amount, reason, postId, commentId }) {
  if (fromId === toId) fail("不能给自己打赏", 400);
  if (![1, 2, 5].includes(amount)) fail("请选择 1、2 或 5 葫芦", 400);
  const why = String(reason || "").trim();
  if (why.length < 5 || why.length > 30) fail("理由需 5 到 30 个字符", 400);
  if (!geoRate(`tip:${fromId}`, 12)) fail("打赏太频繁，稍后再试", 429);
  db.transaction(() => {
    const pay = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(amount, fromId, amount);
    if (!pay.changes) fail("葫芦不足", 400);
    db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(amount, toId);
    db.prepare(
      "INSERT INTO post_tips (post_id, comment_id, from_user_id, to_user_id, amount, reason, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(postId, commentId || 0, fromId, toId, amount, why, now());
    if (commentId) {
      db.prepare("UPDATE comments SET tip_count = COALESCE(tip_count,0) + ? WHERE id=?").run(amount, commentId);
    } else {
      db.prepare("UPDATE posts SET tip_count = COALESCE(tip_count,0) + ? WHERE id=?").run(amount, postId);
    }
  })();
  return why;
}

function mapComment(c, me) {
  const author = publicUserLite(db.prepare("SELECT * FROM users WHERE id=?").get(c.user_id));
  const liked = me
    ? !!db.prepare("SELECT 1 FROM likes WHERE user_id=? AND target_type='comment' AND target_id=?").get(me, c.id)
    : false;
  return {
    id: c.id,
    content: c.content,
    likeCount: c.like_count,
    tipCount: Number(c.tip_count || 0),
    floor: c.floor,
    pinned: !!c.is_pinned,
    createdAt: c.created_at,
    editedAt: c.edited_at || "",
    ipRegion: c.ip_region,
    parentId: c.parent_id,
    liked,
    author,
    tipGivers: tipGiversOf(c.post_id, c.id)
    ,
    quote: c.quote_id ? {
      id: c.quote_id,
      floor: c.quote_floor || 0,
      name: c.quote_name || "",
      snippet: c.quote_snippet || ""
    } : null
  };
}

function sanitizeMentions(fromId, ids) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = Number(raw);
    if (!id || seen.has(id) || id === fromId) continue;
    if (!isMutual(fromId, id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 20) break;
  }
  return out;
}

function parseImages(raw) {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
    return arr.filter((u) => typeof u === "string" && u.startsWith("/uploads/")).slice(0, 9);
  } catch {
    return [];
  }
}

function parseVideos(raw) {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
    return arr
      .filter((u) => typeof u === "string" && u.startsWith("/uploads/") && /\.(mp4|m4v|webm|mov|ogv)$/i.test(u))
      .slice(0, 3);
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
    { id: "home", name: "首页聚合", method: "GET", path: "/api/home", sample: "/api/home", params: [], returns: ["banners", "community", "hotBoards", "hots"], auth: false },
    { id: "postsRecommend", name: "推荐帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=recommend", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsFollow", name: "关注流", method: "GET", path: "/api/posts", sample: "/api/posts?tab=follow", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsHot", name: "热门帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=hot", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsEssence", name: "精华帖", method: "GET", path: "/api/posts", sample: "/api/posts?tab=essence", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsLatest", name: "此刻/最新", method: "GET", path: "/api/posts", sample: "/api/posts?tab=latest", params: ["tab"], returns: ["posts"], auth: false },
    { id: "postsReply", name: "版块按回复", method: "GET", path: "/api/posts", sample: `/api/posts?boardId=${s.boardId}&tab=reply`, params: ["boardId", "tab"], returns: ["posts"], auth: false },
    { id: "boards", name: "版块列表", method: "GET", path: "/api/boards", sample: "/api/boards", params: ["category", "followed"], returns: ["boards"], auth: false },
    { id: "boardDetail", name: "版块详情", method: "GET", path: "/api/boards/:id", sample: `/api/boards/${s.boardId}`, params: ["id"], returns: ["board"], auth: false },
    { id: "boardNotice", name: "版块公告", method: "PUT", path: "/api/boards/:id/announcement", params: ["id", "announcement"], returns: ["ok", "announcement"], auth: true, write: true },
    { id: "boardTypes", name: "版块分类", method: "PUT", path: "/api/boards/:id/types", params: ["id", "types"], returns: ["ok", "threadTypes"], auth: true, write: true },
    { id: "postDetail", name: "帖子详情", method: "GET", path: "/api/posts/:id", sample: `/api/posts/${s.postId}`, params: ["id"], returns: ["post"], auth: false },
    { id: "movePost", name: "移动主题", method: "POST", path: "/api/posts/:id/move", params: ["id", "boardId"], returns: ["post"], auth: true, write: true },
    { id: "batchPosts", name: "批量管理", method: "POST", path: "/api/posts/batch", params: ["ids", "action", "value", "color", "boardId"], returns: ["ok", "count"], auth: true, write: true },
    { id: "comments", name: "评论列表", method: "GET", path: "/api/posts/:id/comments", sample: `/api/posts/${s.postId}/comments`, params: ["id"], returns: ["comments"], auth: false },
    { id: "searchComments", name: "帖内搜索", method: "GET", path: "/api/posts/:id/comments/search", sample: `/api/posts/${s.postId}/comments/search?q=活动`, params: ["id", "q"], returns: ["results", "total"], auth: false },
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
    { id: "tipPost", name: "打赏帖子", method: "POST", path: "/api/posts/:id/tip", params: ["id", "amount", "reason"], returns: ["ok", "gourd", "tipCount", "post"], auth: true, write: true },
    { id: "tipComment", name: "打赏评论", method: "POST", path: "/api/comments/:id/tip", params: ["id", "amount", "reason"], returns: ["ok", "gourd", "tipCount", "comment"], auth: true, write: true },
    { id: "adminGourd", name: "管理员扣赏", method: "POST", path: "/api/posts/:id/gourd", params: ["id", "action", "amount", "reason", "commentId"], returns: ["ok", "post"], auth: true, write: true },
    { id: "mutualFriends", name: "互关好友", method: "GET", path: "/api/friends/mutual", sample: "/api/friends/mutual", params: [], returns: ["users"], auth: true },
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
    release: RELEASE,
    checks: {
      database: { ok: database.ok },
      uploads: { ok: uploads.ok }
    }
  });
});

app.get("/api/version", (_req, res) => {
  res.json({ release: RELEASE, name: "qinghu-sanlou" });
});

app.get("/api/mini-apps", (_req, res) => {
  res.json({ apps: listMiniApps() });
});

app.get("/api/config", (_req, res) => {
  const site = getSite();
  res.json({
    name: site.name,
    tagline: site.tagline,
    installed: site.installed,
    version: RELEASE,
    videoMaxMb: VIDEO_MAX_MB
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
    release: RELEASE,
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
  forumx.verifyCaptcha(db, (req.body || {}).captchaId, (req.body || {}).captchaAnswer);
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
  assignUin(user.id);
  bumpExp(user.id, 10, 8);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  res.json({ token: sign(fresh), user: publicUser(fresh, fresh.id) });
}));

app.post("/api/auth/login", asyncH(async (req, res) => {
  const { username, password } = req.body || {};
  forumx.verifyCaptcha(db, (req.body || {}).captchaId, (req.body || {}).captchaAnswer);
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

app.get("/api/captcha", (_req, res) => {
  res.json(forumx.issueCaptcha(db));
});

app.post("/api/auth/forgot", (req, res) => {
  try {
    res.json(forumx.requestReset(db, (req.body || {}).username));
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/auth/reset", (req, res) => {
  try {
    forumx.confirmReset(db, bcrypt, req.body || {});
    res.json({ ok: true });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user, req.user.id) });
});

app.get("/api/account", authRequired, (req, res) => {
  try {
    let pretty = [];
    let plans = [];
    try { pretty = prettyShop(36); } catch { pretty = []; }
    try { plans = getVipPlans().filter((p) => p.enabled); } catch { plans = []; }
    res.json({
      user: publicUser(req.user, req.user.id),
      pretty,
      plans,
      vipCost: Number(getSetting("vip_cost", 88)) || 88,
      vipDays: Number(getSetting("vip_days", 30)) || 30
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "号店暂时不可用" });
  }
});

app.post("/api/account/vip", authRequired, (req, res) => {
  if (!geoRate(`vip:${req.user.id}`, 6)) return res.status(429).json({ error: "开通太频繁，稍后再试" });
  const slug = String((req.body || {}).slug || "vip").toLowerCase() === "svip" ? "svip" : "vip";
  const plan = getVipPlans().find((p) => p.slug === slug && p.enabled);
  if (!plan) return res.status(400).json({ error: "该会员套餐未开放" });
  const cost = plan.cost;
  const days = plan.days;
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if ((row.gourd || 0) < cost) return res.status(400).json({ error: `葫芦不够，需要 ${cost}` });
  db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=?").run(cost, req.user.id);
  extendVip(req.user.id, days, plan.slug);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ user: publicUser(fresh, fresh.id), days, plan: plan.slug });
});

app.post("/api/account/uin", authRequired, (req, res) => {
  if (!geoRate(`uin:${req.user.id}`, 8)) return res.status(429).json({ error: "换号太频繁，稍后再试" });
  try {
    const hit = claimPrettyUin(req.user.id, (req.body || {}).uin);
    const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    res.json({ user: publicUser(fresh, fresh.id), uin: hit.uin, cost: hit.cost });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

app.put("/api/users/me", authRequired, (req, res) => {
  const { nickname, bio, gender, city, avatar, birthday, cover, hometown, school, email } = req.body || {};
  const nextAvatar = typeof avatar === "string" && avatar.startsWith("/uploads/") ? avatar : req.user.avatar;
  const nextBirthday = birthday === undefined ? (req.user.birthday || "") : String(birthday || "").slice(0, 10);
  let nextCover = req.user.cover || "";
  if (typeof cover === "string") {
    if (cover.startsWith("/uploads/") || cover === "") nextCover = cover;
  }
  let nextEmail = req.user.email || "";
  if (email !== undefined) {
    const v = String(email || "").trim();
    if (v && !forumx.validEmail(v)) return res.status(400).json({ error: "邮箱格式不对" });
    nextEmail = v;
  }
  db.prepare("UPDATE users SET nickname=?, bio=?, gender=?, city=?, avatar=?, birthday=?, cover=?, hometown=?, school=?, email=? WHERE id=?").run(
    String(nickname || req.user.nickname || "").slice(0, 16),
    String(bio || "").slice(0, 80),
    gender || req.user.gender || "保密",
    String(city ?? req.user.city ?? "未知").slice(0, 16),
    nextAvatar,
    nextBirthday,
    nextCover,
    String(hometown ?? req.user.hometown ?? "").slice(0, 32),
    String(school ?? req.user.school ?? "").slice(0, 40),
    nextEmail,
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

app.post("/api/account/delete", authRequired, (req, res) => {
  const password = String((req.body || {}).password || "");
  if (!password || !bcrypt.compareSync(password, req.user.password_hash)) {
    return res.status(400).json({ error: "密码不正确" });
  }
  try {
    deleteAccount(req.user.id);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  res.json({ ok: true, deleted: true });
});

app.get("/api/users/:id", authOptional, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const me = req.user && req.user.id;
  const out = publicUser(user, me);
  if (out) out.blocked = forumx.isBlocked(db, me, user.id);
  res.json({ user: out });
});

app.get("/api/users/:id/photos", authOptional, (req, res) => {
  const rows = db.prepare("SELECT * FROM user_photos WHERE user_id=? ORDER BY id DESC LIMIT 18").all(req.params.id);
  res.json({ photos: rows.map((r) => ({ id: r.id, url: r.url, createdAt: r.created_at })) });
});

app.post("/api/users/me/photos", authRequired, (req, res) => {
  const url = String((req.body || {}).url || "");
  if (!url.startsWith("/uploads/")) return res.status(400).json({ error: "请先上传图片" });
  const n = db.prepare("SELECT COUNT(*) AS c FROM user_photos WHERE user_id=?").get(req.user.id).c;
  if (n >= 9) return res.status(400).json({ error: "最多 9 张照片" });
  const info = db.prepare("INSERT INTO user_photos (user_id, url, created_at) VALUES (?,?,?)").run(req.user.id, url, now());
  res.json({ photo: { id: info.lastInsertRowid, url, createdAt: now() } });
});

app.delete("/api/users/me/photos/:pid", authRequired, (req, res) => {
  db.prepare("DELETE FROM user_photos WHERE id=? AND user_id=?").run(req.params.pid, req.user.id);
  res.json({ ok: true });
});

app.get("/api/users/:id/posts", authOptional, (req, res) => {
  const showPool = String(req.query.pool || "") === "1";
  const rows = db
    .prepare(
      `SELECT p.* FROM posts p LEFT JOIN boards b ON b.id=p.board_id
        WHERE p.user_id=? AND COALESCE(p.trashed_at,'')='' AND (COALESCE(p.is_hidden,0)=0 OR ?=1)
          AND (?=1 OR IFNULL(b.slug,'')<>'pool')
       ORDER BY datetime(p.created_at) DESC LIMIT 50`
    )
    .all(
      req.params.id,
      req.user && (req.user.id === Number(req.params.id) || isAdmin(req.user)) ? 1 : 0,
      showPool ? 1 : 0
    );
  res.json({ posts: rows.map((r) => packPost(r, req.user && req.user.id, { lite: true })) });
});

app.get("/api/users/:id/replies", authOptional, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, p.title AS post_title, b.slug AS board_slug FROM comments c
       JOIN posts p ON p.id = c.post_id
       LEFT JOIN boards b ON b.id = p.board_id
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
      postTitle: r.post_title,
      boardSlug: r.board_slug || ""
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
  res.json({ posts: rows.map((r) => packPost(r, req.user && req.user.id, { lite: true })) });
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

app.get("/api/friends/mutual", authRequired, (req, res) => {
  const users = mutualFriends(req.user.id).map((u) => publicUser(u, req.user.id));
  res.json({ users });
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
  const typeId = Number(req.query.typeId) || 0;
  const me = req.user && req.user.id;
  let sql = "SELECT * FROM posts WHERE COALESCE(is_hidden,0)=0";
  const params = [];
  if (boardId) {
    sql += " AND board_id=?";
    params.push(boardId);
  }
  if (typeId) {
    sql += " AND COALESCE(type_id,0)=?";
    params.push(typeId);
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
    if (!me) return res.json({ posts: [], hasMore: false });
    sql += ` AND (user_id IN (SELECT target_id FROM follows WHERE user_id=? AND target_type='user')
              OR board_id IN (SELECT target_id FROM follows WHERE user_id=? AND target_type='board'))`;
    params.push(me, me);
  }
  if (tab === "essence") sql += " AND is_essence=1";
  const pinFirst = boardId ? "is_official DESC, is_pinned DESC, " : "is_official DESC, ";
  const sinkLast = "(CASE WHEN TRIM(COALESCE(posts.sunk_at,''))<>'' THEN 1 ELSE 0 END) ASC, ";
  if (tab === "hot") sql += ` ORDER BY ${pinFirst}COALESCE(is_hot,0) DESC, (like_count*2 + comment_count*3 + view_count/20) DESC, datetime(created_at) DESC`;
  else if (tab === "latest") sql += ` ORDER BY ${pinFirst}${sinkLast}datetime(created_at) DESC`;
  else if (tab === "reply") sql += ` ORDER BY ${pinFirst}${sinkLast}MAX(datetime(posts.created_at), datetime(NULLIF(posts.bumped_at,'')), (SELECT MAX(datetime(created_at)) FROM comments WHERE post_id=posts.id)) DESC`;
  else sql += ` ORDER BY ${pinFirst}(like_count + comment_count*2) DESC, datetime(created_at) DESC`;
  const lim = Math.min(50, Number(limit) || 30);
  const off = Math.max(0, Number(req.query.offset) || 0);
  sql += " LIMIT ? OFFSET ?";
  params.push(lim, off);
  let rows = db.prepare(sql).all(...params);
  const hasMore = rows.length >= lim;
  if (boardId && !userId && !q && off === 0 && !typeId) {
    const offs = db.prepare(
      "SELECT * FROM posts WHERE COALESCE(is_official,0)=1 AND COALESCE(is_hidden,0)=0 ORDER BY id DESC LIMIT 12"
    ).all();
    const seen = new Set(rows.map((r) => r.id));
    const extra = offs.filter((r) => !seen.has(r.id));
    rows = extra.concat(rows);
  }
  res.json({ posts: forumx.hideBlockedPosts(rows.map((r) => packPost(r, me, { lite: true })), forumx.blockedSet(db, me)), hasMore });
});

app.get("/api/posts/:id", authOptional, (req, res) => {
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "帖子不存在" });
  const trashed = forumx.isTrashed(row);
  const staff = req.user && canModerate(req.user, row.board_id);
  if (trashed && !staff) {
    return res.status(404).json({ error: "帖子不存在" });
  }
  if (row.is_hidden && !trashed && !(req.user && (req.user.id === row.user_id || staff))) {
    return res.status(404).json({ error: "帖子不存在" });
  }
  const countView = !trashed && String(req.query.count || "1") !== "0";
  if (countView) db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id=?").run(row.id);
  const fresh = countView ? db.prepare("SELECT * FROM posts WHERE id=?").get(row.id) : row;
  const packed = packPost(fresh, req.user && req.user.id);
  packed.neighbors = forumx.neighbors(db, row);
  res.json({ post: packed });
});

app.get("/api/posts/:id/related", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!row || forumx.isTrashed(row)) return res.json({ opPosts: [], related: [] });
  const base = "COALESCE(is_hidden,0)=0 AND COALESCE(trashed_at,'')=''";
  const opRows = db.prepare(
    `SELECT * FROM posts WHERE user_id=? AND id<>? AND ${base}
     ORDER BY (comment_count*2 + like_count) DESC, datetime(created_at) DESC LIMIT 5`
  ).all(row.user_id, row.id);
  const related = [];
  const seen = new Set([row.id]);
  const tags = (JSON.parse(row.tags || "[]") || []).map((t) => String(t || "").trim()).filter(Boolean);
  const addRow = (r) => {
    if (related.length >= 5 || seen.has(r.id) || Number(r.user_id) === Number(row.user_id)) return;
    seen.add(r.id);
    related.push(r);
  };
  tags.forEach((t) => {
    if (related.length >= 5) return;
    db.prepare(
      `SELECT * FROM posts WHERE board_id=? AND id<>? AND ${base} AND tags LIKE ?
       ORDER BY (comment_count*2 + like_count) DESC, datetime(created_at) DESC LIMIT 5`
    ).all(row.board_id, row.id, `%"${t}"%`).forEach(addRow);
  });
  if (related.length < 5) {
    db.prepare(
      `SELECT * FROM posts WHERE board_id=? AND id<>? AND ${base}
       ORDER BY (comment_count*2 + like_count) DESC, datetime(created_at) DESC LIMIT 12`
    ).all(row.board_id, row.id).forEach(addRow);
  }
  res.json({ opPosts: opRows.map((r) => packPost(r, me)), related: related.map((r) => packPost(r, me)) });
});

app.post("/api/posts", authRequired, asyncH(async (req, res) => {
  const { boardId, title, content, images, tags, link, version, category, size, softId, trackId, mentionIds, threadKind, thread, captchaId, captchaAnswer } = req.body || {};
  const videos = parseVideos((req.body || {}).videos);
  const hideText = String((req.body || {}).hideText || "").trim().slice(0, 2000);
  const paidText = threadKind === "paid" ? String((thread && thread.text) || "").trim().slice(0, 4000) : "";
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
  const typeId = forumx.typeIdOf(board.thread_types, (req.body || {}).typeId);
  forumx.verifyCaptcha(db, captchaId, captchaAnswer);
  forumx.assertFlood(db, req.user.id);
  forumx.assertSensitive(getSetting, headline, body, Array.isArray(tags) ? tags.join(" ") : "");
  if (hideText) forumx.assertSensitive(getSetting, hideText);
  if (paidText) forumx.assertSensitive(getSetting, paidText);
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
      `INSERT INTO posts (user_id, board_id, title, content, images, videos, tags, created_at, ip_region, soft_id, track_id, type_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      req.user.id,
      boardId,
      headline,
      body.slice(0, 8000),
      JSON.stringify(Array.isArray(images) ? images.slice(0, 9) : []),
      JSON.stringify(videos),
      JSON.stringify(Array.isArray(tags) ? tags.slice(0, 5) : []),
      now(),
      await regionOf(req),
      soft,
      track,
      typeId
    );
  db.prepare("UPDATE boards SET post_count = post_count+1, today_posts = today_posts+1 WHERE id=?").run(boardId);
  refreshBoardStats();
  if (soft) db.prepare("UPDATE softwares SET post_id=? WHERE id=? AND (post_id IS NULL OR post_id=0)").run(info.lastInsertRowid, soft);
  const postId = info.lastInsertRowid;
  const mentioned = sanitizeMentions(req.user.id, mentionIds);
  if (mentioned.length) {
    db.prepare("UPDATE posts SET mentions=? WHERE id=?").run(JSON.stringify(mentioned), postId);
    mentioned.forEach((uid) => notify(uid, req.user.id, "mention", postId, "在帖子里艾特了你"));
  }
  forumx.createThread(db, { postId, userId: req.user.id, kind: threadKind, thread, now: now() });
  bumpExp(req.user.id, expOf("post") || 5, 5);
  forumx.setHideText(db, postId, hideText);
  forumx.markSpoke(db, req.user.id, now());
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(postId);
  res.json({ post: packPost(row, req.user.id) });
}));

app.put("/api/posts/:id", authRequired, asyncH(async (req, res) => {
  const id = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  const owner = post.user_id === req.user.id;
  const mod = canModerate(req.user, post.board_id);
  if (!owner && !mod) return res.status(403).json({ error: "不能编辑这篇帖子" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const body = req.body || {};
  const title = body.title != null ? String(body.title || "").trim().slice(0, 48) : post.title;
  const content = body.content != null ? String(body.content || "").trim().slice(0, 8000) : post.content;
  if (!title || !content) return res.status(400).json({ error: "标题和正文不能为空" });
  const images = Array.isArray(body.images) ? JSON.stringify(body.images.slice(0, 9)) : post.images;
  const videos = Array.isArray(body.videos) ? JSON.stringify(parseVideos(body.videos)) : post.videos;
  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags.slice(0, 5)) : post.tags;
  let boardId = post.board_id;
  if (body.boardId != null && Number(body.boardId) && Number(body.boardId) !== post.board_id) {
    if (!mod) return res.status(403).json({ error: "楼主不能迁版" });
    const board = db.prepare("SELECT * FROM boards WHERE id=?").get(Number(body.boardId));
    if (!board) return res.status(400).json({ error: "版块不存在" });
    if (!isAdmin(req.user) && !staffBoards(req.user.id).includes(board.id)) {
      return res.status(403).json({ error: "只能移动到你所辖版块" });
    }
    boardId = board.id;
  }
  const trackId = body.trackId == null ? post.track_id : (Number(body.trackId) || 0);
  const destBoard = db.prepare("SELECT * FROM boards WHERE id=?").get(boardId);
  const typeId = body.typeId != null
    ? forumx.typeIdOf(destBoard && destBoard.thread_types, body.typeId)
    : forumx.typeIdOf(destBoard && destBoard.thread_types, post.type_id);
  db.prepare("UPDATE posts SET title=?, content=?, images=?, videos=?, tags=?, board_id=?, track_id=?, type_id=? WHERE id=?")
    .run(title, content, images, videos, tags, boardId, trackId, typeId, id);
  if (boardId !== post.board_id) {
    db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?").run(post.board_id);
    db.prepare("UPDATE boards SET post_count = post_count+1 WHERE id=?").run(boardId);
    refreshBoardStats();
  }
  if (body.mentionIds) {
    const mentioned = sanitizeMentions(req.user.id, body.mentionIds);
    db.prepare("UPDATE posts SET mentions=? WHERE id=?").run(JSON.stringify(mentioned), id);
  }
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  res.json({ post: packPost(row, req.user.id) });
}));

app.get("/api/posts/:id/share.xml", authOptional, (req, res) => {
  const row = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!row || forumx.isTrashed(row)) return res.status(404).type("text/plain").send("not found");
  const post = packPost(row, req.user && req.user.id);
  const origin = `${req.protocol}://${req.get("host")}`;
  const url = `${origin}/post/${post.id}`;
  const rawPic = (post.images && post.images[0]) || (post.author && post.author.avatar) || "";
  const pic = rawPic && !/^https?:\/\//i.test(rawPic) ? `${origin}${rawPic.startsWith("/") ? "" : "/"}${rawPic}` : rawPic;
  const title = String(post.title || "青葫三楼").slice(0, 80);
  const summary = String(post.content || "").replace(/[<>]/g, "").slice(0, 120);
  res.type("application/xml; charset=utf-8").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<msg>\n  <item showtype="0">\n    <title><![CDATA[${title}]]></title>\n    <summary><![CDATA[${summary}]]></summary>\n    <url><![CDATA[${url}]]></url>\n    <picture><![CDATA[${pic}]]></picture>\n  </item>\n</msg>\n`
  );
});

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

app.post("/api/posts/:id/tip", authRequired, (req, res) => {
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const id = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  const amount = Number((req.body || {}).amount);
  const reason = String((req.body || {}).reason || "").trim();
  try {
    giveTip({ fromId: req.user.id, toId: post.user_id, amount, reason, postId: id, commentId: 0 });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "打赏失败" });
  }
  notify(post.user_id, req.user.id, "tip", id, `打赏了你 ${amount} 葫芦`);
  const me = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  res.json({ ok: true, gourd: me.gourd, tipCount: fresh.tip_count || 0, post: packPost(fresh, req.user.id) });
});

app.post("/api/comments/:id/tip", authRequired, (req, res) => {
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const amount = Number((req.body || {}).amount);
  const reason = String((req.body || {}).reason || "").trim();
  try {
    giveTip({ fromId: req.user.id, toId: c.user_id, amount, reason, postId: c.post_id, commentId: c.id });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "打赏失败" });
  }
  notify(c.user_id, req.user.id, "tip", c.post_id, `打赏了你的评论 ${amount} 葫芦`, c.id);
  const me = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const fresh = db.prepare("SELECT * FROM comments WHERE id=?").get(c.id);
  res.json({ ok: true, gourd: me.gourd, tipCount: fresh.tip_count || 0, comment: mapComment(fresh, req.user.id) });
});

app.post("/api/posts/:id/gourd", authRequired, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "仅管理员可操作" });
  const id = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  const body = req.body || {};
  const action = String(body.action || "award") === "deduct" ? "deduct" : "award";
  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > 9999) {
    return res.status(400).json({ error: "数量需为 1 到 9999" });
  }
  const commentId = Number(body.commentId) || 0;
  let targetId = post.user_id;
  let comment = null;
  if (commentId) {
    comment = db.prepare("SELECT * FROM comments WHERE id=? AND post_id=?").get(commentId, id);
    if (!comment) return res.status(404).json({ error: "评论不存在" });
    targetId = comment.user_id;
  }
  const reason = String(body.reason || "").trim().slice(0, 80) || (action === "deduct" ? "管理员扣葫芦" : "管理员赏葫芦");
  if (action === "deduct") {
    db.prepare("UPDATE users SET gourd = MAX(gourd - ?, 0) WHERE id=?").run(amount, targetId);
    db.prepare(
      "INSERT INTO post_tips (post_id, comment_id, from_user_id, to_user_id, amount, reason, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(id, commentId, req.user.id, targetId, -amount, reason, now());
    notify(targetId, req.user.id, "tip", id, `管理员扣除了你 ${amount} 葫芦`);
    logAdmin(req.user.id, "gourd_deduct", targetId, `${amount} ${reason}`);
  } else {
    db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(amount, targetId);
    db.prepare(
      "INSERT INTO post_tips (post_id, comment_id, from_user_id, to_user_id, amount, reason, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(id, commentId, req.user.id, targetId, amount, reason, now());
    if (commentId) db.prepare("UPDATE comments SET tip_count = COALESCE(tip_count,0) + ? WHERE id=?").run(amount, commentId);
    else db.prepare("UPDATE posts SET tip_count = COALESCE(tip_count,0) + ? WHERE id=?").run(amount, id);
    notify(targetId, req.user.id, "tip", id, `管理员赏了你 ${amount} 葫芦`);
    logAdmin(req.user.id, "gourd_award", targetId, `${amount} ${reason}`);
  }
  const freshPost = db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  const payload = { ok: true, post: packPost(freshPost, req.user.id) };
  if (commentId) {
    const freshC = db.prepare("SELECT * FROM comments WHERE id=?").get(commentId);
    payload.comment = mapComment(freshC, req.user.id);
  }
  res.json(payload);
});

app.get("/api/posts/:id/comments", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post) && !(req.user && canModerate(req.user, post.board_id))) {
    return res.status(404).json({ error: "帖子不存在" });
  }
  const opOnly = String(req.query.opOnly || "") === "1";
  try {
    res.json(forumx.listComments(db, {
      postId: post.id,
      opId: post.user_id,
      opOnly,
      onlyId: req.query.onlyId,
      offset: req.query.offset,
      limit: req.query.limit || 30,
      blocked: forumx.blockedSet(db, me),
      mapComment,
      me,
      order: req.query.order,
      jumpFloor: req.query.jump
    }));
  } catch (e) {
    return sendErr(res, e);
  }
});

app.get("/api/posts/:id/comments/search", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post) && !(req.user && canModerate(req.user, post.board_id))) {
    return res.status(404).json({ error: "帖子不存在" });
  }
  try {
    res.json(forumx.searchComments(db, {
      postId: post.id,
      q: req.query.q,
      limit: req.query.limit || 50,
      blocked: forumx.blockedSet(db, me),
      mapComment,
      me
    }));
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/posts/:id/comments", authRequired, asyncH(async (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post)) return res.status(400).json({ error: "帖子在回收站，请先还原" });
  if (post.is_locked) return res.status(403).json({ error: "帖子已锁定，无法回复" });
  try { assertCanSpeak(req.user, post.board_id); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const content = String((req.body && req.body.content) || "").trim();
  if (!content) return res.status(400).json({ error: "评论不能为空" });
  const parentId = Number((req.body || {}).parentId) || 0;
  if (parentId && !db.prepare("SELECT id FROM comments WHERE id=? AND post_id=?").get(parentId, post.id)) {
    return res.status(400).json({ error: "回复的评论不存在" });
  }
  forumx.assertFlood(db, req.user.id);
  forumx.assertSensitive(getSetting, content);
  const quoted = forumx.quoteOf(db, post.id, (req.body || {}).quoteId);
  const maxFloor = db.prepare("SELECT MAX(floor) AS m FROM comments WHERE post_id=?").get(post.id).m || 0;
  const info = db
    .prepare(
      `INSERT INTO comments (post_id, user_id, parent_id, content, floor, created_at, ip_region)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(
      post.id,
      req.user.id,
      parentId || null,
      content.slice(0, 1000),
      maxFloor + 1,
      now(),
      await regionOf(req)
    );
  if (quoted) {
    db.prepare("UPDATE comments SET quote_id=?, quote_floor=?, quote_name=?, quote_snippet=? WHERE id=?").run(
      quoted.id,
      quoted.floor,
      quoted.name,
      quoted.snippet,
      info.lastInsertRowid
    );
  }
  db.prepare("UPDATE posts SET comment_count = comment_count+1 WHERE id=?").run(post.id);
  maybePromoteHot(post.id);
  bumpExp(req.user.id, expOf("comment") || 10, 1);
  if (parentId) {
    const parent = db.prepare("SELECT * FROM comments WHERE id=?").get(parentId);
    if (parent) notify(parent.user_id, req.user.id, "comment", post.id, "回复了你的评论", info.lastInsertRowid);
  } else {
    notify(post.user_id, req.user.id, "comment", post.id, "回复了你的帖子", info.lastInsertRowid);
  }
  forumx.markSpoke(db, req.user.id, now());
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(info.lastInsertRowid);
  const freshPost = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
  const packed = packPost(freshPost, req.user.id);
  packed.neighbors = forumx.neighbors(db, freshPost);
  res.json({ comment: mapComment(c, req.user.id), post: packed });
}));

app.post("/api/posts/:id/vote", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  try {
    forumx.votePoll(db, { post, userId: req.user.id, optionIds: (req.body || {}).optionIds, now: now() });
    const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
    res.json({ post: packPost(fresh, req.user.id) });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/posts/:id/adopt", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  try {
    const hit = forumx.adoptReward(db, { post, user: req.user, commentId: Number((req.body || {}).commentId), now: now() });
    notify(hit.toId, req.user.id, "tip", post.id, `采纳了你的回复，悬赏 ${hit.amount} 葫芦`, hit.commentId);
    const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
    res.json({ post: packPost(fresh, req.user.id) });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/posts/:id/join", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  try {
    const d = forumx.joinActivity(db, { post, user: req.user, now: now() });
    const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
    const me = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    res.json({ post: packPost(fresh, req.user.id), joined: d.joined, gourd: me.gourd });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/posts/:id/redpacket", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post)) return res.status(400).json({ error: "帖子在回收站，红包不可领取" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  try {
    const hit = forumx.claimRedpacket(db, { post, user: req.user, now: now() });
    notify(post.user_id, req.user.id, "tip", post.id, `领取了你的红包 ${hit.amount} 葫芦`);
    bumpExp(req.user.id, 1, 0);
    const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
    const me = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    res.json({ post: packPost(fresh, req.user.id), amount: hit.amount, gourd: me.gourd });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/posts/:id/unlock", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post)) return res.status(400).json({ error: "帖子在回收站，无法解锁" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  try {
    const hit = forumx.purchasePaid(db, { post, user: req.user, now: now() });
    notify(post.user_id, req.user.id, "tip", post.id, `购买了你的付费内容，到账 ${hit.price} 葫芦`);
    const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
    const me = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    res.json({ post: packPost(fresh, req.user.id), price: hit.price, gourd: me.gourd });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/reports", authRequired, (req, res) => {
  const body = req.body || {};
  try {
    forumx.reportCreate(db, {
      userId: req.user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      detail: body.detail,
      now: now()
    });
    res.json({ ok: true });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.get("/api/admin/reports", authStaff, (req, res) => {
  const ids = staffBoardIds(req.user);
  res.json({ reports: forumx.reportList(db, publicUser, ids ? { boardIds: ids } : {}) });
});

app.put("/api/admin/reports/:id", authStaff, (req, res) => {
  try {
    const ids = staffBoardIds(req.user);
    forumx.reportHandle(db, { id: req.params.id, note: (req.body || {}).note, now: now(), boardIds: ids });
    logAdmin(req.user.id, "report", Number(req.params.id), (req.body || {}).note || "已处理");
    res.json({ ok: true, reports: forumx.reportList(db, publicUser, ids ? { boardIds: ids } : {}) });
  } catch (e) {
    return sendErr(res, e);
  }
});

app.post("/api/users/:id/block", authRequired, (req, res) => {
  try {
    const d = forumx.blockToggle(db, { userId: req.user.id, targetId: req.params.id, now: now() });
    res.json(d);
  } catch (e) {
    return sendErr(res, e);
  }
});

app.get("/api/me/blocks", authRequired, (req, res) => {
  res.json({ users: forumx.blockList(db, req.user.id, publicUser) });
});

app.get("/api/admin/words", authAdmin, (_req, res) => {
  res.json({ words: getSetting("sensitive_words", "") || "" });
});

app.put("/api/admin/words", authAdmin, (req, res) => {
  const words = String((req.body || {}).words || "");
  setSetting("sensitive_words", words);
  logAdmin(req.user.id, "words", 0, "更新敏感词");
  res.json({ ok: true, words });
});

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
      const msg = err.code === "LIMIT_FILE_SIZE" ? `图片太大，单张不超过 ${IMAGE_MAX_MB}MB` : (err.message || "上传失败");
      return res.status(400).json({ error: msg });
    }
    const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    if (!urls.length) return res.status(400).json({ error: "没有收到图片" });
    res.json({ urls });
  });
});

app.post("/api/upload/video", authRequired, (req, res) => {
  videoUpload.array("files", 3)(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE"
        ? `视频太大，单个不超过 ${VIDEO_MAX_MB}MB`
        : (err.message || "视频上传失败");
      return res.status(400).json({ error: msg });
    }
    const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    if (!urls.length) return res.status(400).json({ error: "没有收到视频" });
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
    .map((r) => packPost(r, me, { lite: true }));
  const users = db
    .prepare(
      `SELECT * FROM users
       WHERE nickname LIKE ? OR username LIKE ? OR CAST(uin AS TEXT) LIKE ? ${/^\d+$/.test(q) ? "OR uin=?" : ""}
       ORDER BY CASE WHEN CAST(uin AS TEXT)=? THEN 0 WHEN CAST(uin AS TEXT) LIKE ? THEN 1 ELSE 2 END
       LIMIT 10`
    )
    .all(...(/^\d+$/.test(q)
      ? [`%${q}%`, `%${q}%`, `%${q}%`, Number(q), q, `${q}%`]
      : [`%${q}%`, `%${q}%`, `%${q}%`, q, `${q}%`]))
    .map((u) => publicUser(u, me));
  const boards = db
    .prepare("SELECT * FROM boards WHERE name LIKE ? OR desc LIKE ? LIMIT 10")
    .all(`%${q}%`, `%${q}%`)
    .map((b) => mapBoard(b, me));
  res.json({ posts: forumx.hideBlockedPosts(posts, forumx.blockedSet(db, me)), users, boards });
});

app.get("/api/badge", authRequired, (req, res) => {
  const me = req.user.id;
  const notices = db.prepare(
    "SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0"
  ).get(me).c;
  const dms = db.prepare(
    "SELECT COUNT(*) AS c FROM dms WHERE to_id=? AND is_read=0 AND COALESCE(deleted,0)=0"
  ).get(me).c;
  res.json({ notifications: notices, dms, unread: notices + dms });
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
    commentId: Number(n.comment_id) || 0,
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
  const id = Number((req.body || {}).id);
  if (id) db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=? AND id=?").run(req.user.id, id);
  else db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(req.user.id);
  res.json({ ok: true });
});

function mapDm(row, me) {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    body: row.body,
    images: parseImages(row.images),
    videos: parseVideos(row.videos),
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
      .prepare("SELECT COUNT(*) AS c FROM dms WHERE to_id=? AND from_id=? AND is_read=0 AND COALESCE(deleted,0)=0")
      .get(me, peerId).c;
    const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
    if (!peer) return null;
    return {
      user: publicUserLite(peer),
      last: mapDm(last, me),
      unread
    };
  }).filter((c) => c && c.user);
  const unread = db.prepare("SELECT COUNT(*) AS c FROM dms WHERE to_id=? AND is_read=0 AND COALESCE(deleted,0)=0").get(me).c;
  res.json({ conversations, unread });
});

app.get("/api/dms/:id", authRequired, (req, res) => {
  const me = req.user.id;
  const peerId = Number(req.params.id);
  if (!peerId || peerId === me) return res.status(400).json({ error: "不能和自己发私信" });
  const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
  if (!peer) return res.status(404).json({ error: "用户不存在" });
  db.prepare("UPDATE dms SET is_read=1 WHERE to_id=? AND from_id=?").run(me, peerId);
  const after = Math.max(0, Number(req.query.after) || 0);
  const rows = after
    ? db.prepare(
      `SELECT * FROM dms WHERE ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?)) AND id>?
       ORDER BY id ASC LIMIT 200`
    ).all(me, peerId, peerId, me, after)
    : db.prepare(
      `SELECT * FROM dms WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)
       ORDER BY id ASC LIMIT 200`
    ).all(me, peerId, peerId, me);
  res.json({ user: publicUserLite(peer), messages: rows.map((r) => mapDm(r, me)), after });
});

app.post("/api/dms/:id", authRequired, (req, res) => {
  const me = req.user.id;
  const peerId = Number(req.params.id);
  const body = String((req.body || {}).body || "").trim().slice(0, 2000);
  if (!peerId || peerId === me) return res.status(400).json({ error: "不能和自己发私信" });
  const images = parseImages((req.body || {}).images);
  const videos = parseVideos((req.body || {}).videos);
  if (!body && !images.length && !videos.length) return res.status(400).json({ error: "请输入内容" });
  try { assertNotBanned(req.user); } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const peer = db.prepare("SELECT * FROM users WHERE id=?").get(peerId);
  if (!peer) return res.status(404).json({ error: "用户不存在" });
  if (forumx.isBlocked(db, me, peerId)) return res.status(400).json({ error: "对方在你的黑名单中" });
  const info = db.prepare("INSERT INTO dms (from_id, to_id, body, images, videos, is_read, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(me, peerId, body, JSON.stringify(images), JSON.stringify(videos), 0, now());
  const row = db.prepare("SELECT * FROM dms WHERE id=?").get(info.lastInsertRowid);
  res.json({ message: mapDm(row, me) });
});

app.post("/api/dms/:id/recall", authRequired, (req, res) => {
  const row = db.prepare("SELECT * FROM dms WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "消息不存在" });
  if (row.from_id !== req.user.id) return res.status(403).json({ error: "只能撤回自己发的消息" });
  db.prepare("UPDATE dms SET deleted=1, body='', images='[]', videos='[]' WHERE id=?").run(row.id);
  res.json({ ok: true });
});

app.get("/api/checkin", authRequired, (req, res) => {
  const day = today();
  const done = db.prepare("SELECT * FROM checkins WHERE user_id=? AND day=?").get(req.user.id, day);
  const last = String(req.user.last_checkin || "").slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = (last === day || last === yest) ? (req.user.checkin_streak || 0) : 0;
  res.json({
    done: !!done,
    streak,
    gourd: req.user.gourd,
    reward: Math.min(16, 2 + streak)
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
    .map((r) => packPost(r, null, { lite: true }));
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

function giftPayloadOf(b, fallback) {
  const prev = fallback || {};
  const style = String(b.style != null ? b.style : prev.style || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16);
  return JSON.stringify({
    mark: String(b.mark != null ? b.mark : prev.mark || "").slice(0, 4),
    color: hexOf(b.color != null ? b.color : prev.color, prev.color || "#ff2442"),
    color2: hexOf(b.color2 != null ? b.color2 : prev.color2, prev.color2 || "#fbbf24"),
    style,
    bg: hexOf(b.bg != null ? b.bg : prev.bg, prev.bg || "#f6f7f9"),
    card: hexOf(b.card != null ? b.card : prev.card, prev.card || "#ffffff"),
    ink: hexOf(b.ink != null ? b.ink : prev.ink, prev.ink || "#1f2937")
  });
}

app.get("/api/admin/gifts", authAdmin, (_req, res) => {
  const gifts = db.prepare("SELECT * FROM gifts ORDER BY kind, id DESC").all().map((g) => mapGift(g));
  res.json({ gifts });
});

app.post("/api/admin/gifts", authAdmin, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim().slice(0, 20);
  let slug = String(b.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
  if (!slug) slug = `pd${Date.now().toString(36)}`;
  const kind = normalizeKind(b.kind);
  if (!name) return res.status(400).json({ error: "请填写名称" });
  if (db.prepare("SELECT id FROM gifts WHERE slug=?").get(slug)) return res.status(400).json({ error: "slug 已存在" });
  const cost = Math.max(0, Math.min(9999, Math.floor(Number(b.cost) || 0)));
  const stock = Math.max(0, Math.min(99999, Math.floor(Number(b.stock) || 999)));
  const desc = String(b.desc || "").slice(0, 80);
  const id = db.prepare(
    "INSERT INTO gifts (name, cost, cover, stock, desc, kind, slug, payload) VALUES (?,?,?,?,?,?,?,?)"
  ).run(name, cost, "", stock, desc, kind, slug, giftPayloadOf(b)).lastInsertRowid;
  logAdmin(req.user.id, "gift_create", id, `创建装扮 ${name}`);
  res.json({ gift: mapGift(db.prepare("SELECT * FROM gifts WHERE id=?").get(id)) });
});

app.put("/api/admin/gifts/:id", authAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM gifts WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "装扮不存在" });
  const b = req.body || {};
  const name = String(b.name != null ? b.name : row.name).trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: "请填写名称" });
  const prev = parseGiftPayloadSafe(row.payload);
  const cost = Number.isFinite(Number(b.cost)) ? Math.max(0, Math.min(9999, Math.floor(Number(b.cost)))) : row.cost;
  const stock = Number.isFinite(Number(b.stock)) ? Math.max(0, Math.min(99999, Math.floor(Number(b.stock)))) : row.stock;
  const desc = String(b.desc != null ? b.desc : row.desc || "").slice(0, 80);
  db.prepare("UPDATE gifts SET name=?, cost=?, stock=?, desc=?, payload=? WHERE id=?").run(
    name, cost, stock, desc, giftPayloadOf(b, prev), row.id
  );
  logAdmin(req.user.id, "gift_edit", row.id, `编辑装扮 ${name}`);
  res.json({ gift: mapGift(db.prepare("SELECT * FROM gifts WHERE id=?").get(row.id)) });
});

app.post("/api/admin/gifts/:id/remove", authAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM gifts WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "装扮不存在" });
  db.prepare("DELETE FROM user_items WHERE gift_id=?").run(row.id);
  db.prepare("DELETE FROM gifts WHERE id=?").run(row.id);
  logAdmin(req.user.id, "gift_delete", row.id, `删除装扮 ${row.name}`);
  res.json({ ok: true });
});

function parseGiftPayloadSafe(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return {}; }
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

app.post("/api/admin/gifts/ai", authAdmin, asyncH(async (req, res) => {
  const prompt = String((req.body || {}).prompt || "").trim().slice(0, 200);
  const kind = normalizeKind((req.body || {}).kind);
  if (!prompt) return res.status(400).json({ error: "请描述想要的装扮" });
  const { drafts, source } = await designDressAsync(kind, prompt);
  res.json({ drafts, draft: drafts[0], source });
}));

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

app.post("/api/honors/wear", authRequired, (req, res) => {
  try {
    setShownHonor(req.user.id, Number((req.body || {}).boardId || 0));
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ user: publicUser(user, user.id) });
});

function parsePostIds(raw, max) {
  const arr = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const id = Number(x);
    if (!Number.isInteger(id) || id < 1 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function decorateByIds(ids, me) {
  const out = [];
  for (const id of ids) {
    const r = db.prepare("SELECT * FROM posts WHERE id=? AND COALESCE(is_hidden,0)=0").get(id);
    if (r) out.push(packPost(r, me, { lite: true }));
  }
  return out;
}

function autoBannerPosts(me, limit) {
  const bannerRows = db.prepare(
    `SELECT * FROM posts WHERE COALESCE(is_hidden,0)=0
     ORDER BY is_essence DESC, is_pinned DESC, like_count DESC LIMIT 20`
  ).all();
  const banners = [];
  const seenId = new Set();
  const seenCover = new Set();
  bannerRows.forEach((r) => {
    if (banners.length >= limit) return;
    if (seenId.has(r.id)) return;
    let imgs = [];
    try { imgs = JSON.parse(r.images || "[]"); } catch { imgs = []; }
    const cover = imgs[0] || "";
    if (cover && seenCover.has(cover)) return;
    seenId.add(r.id);
    if (cover) seenCover.add(cover);
    banners.push(packPost(r, me, { lite: true }));
  });
  return banners;
}

function homeBannersOf(me) {
  const ids = parsePostIds(getSetting("home_banners", []), 4);
  return ids.length ? decorateByIds(ids, me) : autoBannerPosts(me, 3);
}

function communityPostsOf(me, banners) {
  const ids = parsePostIds(getSetting("community_posts", []), 3);
  if (ids.length) return decorateByIds(ids, me);
  return [];
}

app.get("/api/home", authOptional, (req, res) => {
  const me = req.user && req.user.id;
  const banners = homeBannersOf(me);
  const community = communityPostsOf(me, banners);
  const hotBoards = db.prepare("SELECT * FROM boards ORDER BY today_posts DESC, follow_count DESC LIMIT 8").all();
  const hots = db.prepare("SELECT title, id FROM posts ORDER BY view_count DESC LIMIT 8").all();
  res.json({
    banners: forumx.hideBlockedPosts(banners, forumx.blockedSet(db, me)),
    community: forumx.hideBlockedPosts(community, forumx.blockedSet(db, me)),
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

app.get("/api/admin/featured", authAdmin, (req, res) => {
  const bannerIds = parsePostIds(getSetting("home_banners", []), 4);
  const communityIds = parsePostIds(getSetting("community_posts", []), 3);
  res.json({
    bannerIds,
    communityIds,
    banners: decorateByIds(bannerIds, req.user.id),
    community: decorateByIds(communityIds, req.user.id)
  });
});

app.put("/api/admin/featured", authAdmin, (req, res) => {
  const body = req.body || {};
  const bannerIds = parsePostIds(body.bannerIds, 4);
  const communityIds = parsePostIds(body.communityIds, 3);
  setSetting("home_banners", bannerIds);
  setSetting("community_posts", communityIds);
  logAdmin(req.user.id, "featured", 0, `轮播 ${bannerIds.join(",") || "自动"} · 圈子 ${communityIds.join(",") || "自动"}`);
  res.json({
    ok: true,
    bannerIds,
    communityIds,
    banners: decorateByIds(bannerIds, req.user.id),
    community: decorateByIds(communityIds, req.user.id)
  });
});

app.get("/api/admin/shop", authAdmin, (req, res) => {
  res.json({ plans: getVipPlans(), pretty: prettyCatalog(req.query.q) });
});

app.put("/api/admin/shop/plans", authAdmin, (req, res) => {
  const plans = setVipPlans((req.body || {}).plans);
  logAdmin(req.user.id, "shop_plans", 0, `VIP ${plans[0].cost}/${plans[0].days}天 · SVIP ${plans[1].cost}/${plans[1].days}天`);
  res.json({ plans });
});

app.post("/api/admin/shop/pretty", authAdmin, (req, res) => {
  try {
    const item = upsertPrettyItem(req.body || {});
    logAdmin(req.user.id, "shop_pretty", 0, `${item.enabled ? "上架" : "下架"}靓号 ${item.uin} · ${item.cost}葫芦`);
    res.json({ item, pretty: prettyCatalog() });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

app.delete("/api/admin/shop/pretty/:uin", authAdmin, (req, res) => {
  try {
    const item = deletePrettyItem(req.params.uin);
    logAdmin(req.user.id, "shop_pretty", 0, `删除靓号 ${item.uin}`);
    res.json({ item, pretty: prettyCatalog(req.query.q) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

app.put("/api/admin/shop/pretty/:uin", authAdmin, (req, res) => {
  const cur = db.prepare("SELECT * FROM pretty_items WHERE uin=?").get(Number(req.params.uin));
  if (!cur) return res.status(404).json({ error: "号码不在号店" });
  const body = req.body || {};
  try {
    const item = upsertPrettyItem({
      uin: cur.uin,
      cost: body.cost == null ? cur.cost : body.cost,
      enabled: body.enabled == null ? cur.enabled : body.enabled
    });
    logAdmin(req.user.id, "shop_pretty", 0, `${item.enabled ? "上架" : "下架"}靓号 ${item.uin} · ${item.cost}葫芦`);
    res.json({ item, pretty: prettyCatalog() });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
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
  if (forumx.isTrashed(post) && action !== "restore" && action !== "purge" && action !== "delete") {
    return res.status(400).json({ error: "帖子在回收站，请先还原" });
  }
  if (action === "essence") {
    db.prepare("UPDATE posts SET is_essence=? WHERE id=?").run(post.is_essence ? 0 : 1, post.id);
  } else if (action === "pin") {
    db.prepare("UPDATE posts SET is_pinned=? WHERE id=?").run(post.is_pinned ? 0 : 1, post.id);
  } else if (action === "official") {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "只有管理员可以设全站公告" });
    db.prepare("UPDATE posts SET is_official=? WHERE id=?").run(post.is_official ? 0 : 1, post.id);
  } else if (action === "certify") {
    const on = post.is_certified ? 0 : 1;
    db.prepare("UPDATE posts SET is_certified=?, certified_at=? WHERE id=?").run(
      on,
      on ? now() : (post.certified_at || ""),
      post.id
    );
  } else if (action === "hot") {
    db.prepare("UPDATE posts SET is_hot=? WHERE id=?").run(post.is_hot ? 0 : 1, post.id);
  } else if (action === "lock") {
    if (!post.is_locked && ((post.comment_count || 0) >= hotNeed() || post.is_hot)) {
      return res.status(400).json({ error: "热帖已自动解锁，不能再锁" });
    }
    db.prepare("UPDATE posts SET is_locked=? WHERE id=?").run(post.is_locked ? 0 : 1, post.id);
  } else if (action === "hide") {
    db.prepare("UPDATE posts SET is_hidden=? WHERE id=?").run(post.is_hidden ? 0 : 1, post.id);
  } else if (action === "delete") {
    if (forumx.isTrashed(post)) return res.status(400).json({ error: "已在回收站" });
    db.prepare("UPDATE posts SET is_hidden=1, trashed_at=? WHERE id=?").run(now(), post.id);
    db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?").run(post.board_id);
    refreshBoardStats();
    return res.json({ ok: true, deleted: true, trashed: true });
  } else if (action === "restore") {
    if (!forumx.isTrashed(post)) return res.status(400).json({ error: "不在回收站" });
    db.prepare("UPDATE posts SET is_hidden=0, trashed_at='' WHERE id=?").run(post.id);
    db.prepare("UPDATE boards SET post_count = post_count+1 WHERE id=?").run(post.board_id);
    refreshBoardStats();
  } else if (action === "purge") {
    if (!forumx.isTrashed(post)) return res.status(400).json({ error: "不在回收站" });
    forumx.refundRedpacket(db, post, true);
    db.prepare("DELETE FROM likes WHERE target_type='post' AND target_id=?").run(post.id);
    db.prepare("DELETE FROM redpacket_claims WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM post_purchases WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM collects WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM comments WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM post_tips WHERE post_id=?").run(post.id);
    db.prepare("DELETE FROM posts WHERE id=?").run(post.id);
    refreshBoardStats();
    return res.json({ ok: true, deleted: true });
  } else if (action === "highlight") {
    const color = forumx.highlightOf((req.body || {}).color);
    const next = color && color === forumx.highlightOf(post.highlight) ? "" : color;
    db.prepare("UPDATE posts SET highlight=? WHERE id=?").run(next, post.id);
  } else if (action === "bump") {
    db.prepare("UPDATE posts SET bumped_at=?, sunk_at='' WHERE id=?").run(now(), post.id);
  } else if (action === "sink") {
    if (post.sunk_at) db.prepare("UPDATE posts SET sunk_at='' WHERE id=?").run(post.id);
    else db.prepare("UPDATE posts SET sunk_at=?, bumped_at='' WHERE id=?").run(now(), post.id);
  } else {
    return res.status(400).json({ error: "未知操作" });
  }
  const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
  res.json({ post: packPost(fresh, req.user.id) });
});

app.post("/api/posts/:id/move", authRequired, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post)) return res.status(400).json({ error: "帖子在回收站，请先还原" });
  if (!canModerate(req.user, post.board_id)) return res.status(403).json({ error: "没有版主权限" });
  const target = db.prepare("SELECT * FROM boards WHERE id=?").get(Number((req.body || {}).boardId));
  if (!target) return res.status(404).json({ error: "版块不存在" });
  if (target.id === post.board_id) return res.status(400).json({ error: "已经在该版块" });
  if (!isAdmin(req.user) && !staffBoards(req.user.id).includes(target.id)) {
    return res.status(403).json({ error: "只能移动到你所辖版块" });
  }
  db.prepare("UPDATE posts SET board_id=? WHERE id=?").run(target.id, post.id);
  db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?").run(post.board_id);
  db.prepare("UPDATE boards SET post_count = post_count+1 WHERE id=?").run(target.id);
  logAdmin(req.user.id, "post_move", post.id, `移动《${String(post.title).slice(0, 20)}》到 ${target.name}`);
  refreshBoardStats();
  const fresh = db.prepare("SELECT * FROM posts WHERE id=?").get(post.id);
  res.json({ post: packPost(fresh, req.user.id) });
});

app.post("/api/posts/batch", authRequired, (req, res) => {
  const body = req.body || {};
  const action = String(body.action || "");
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length) return res.status(400).json({ error: "请选择要操作的帖子" });
  if (ids.length > 200) return res.status(400).json({ error: "一次最多操作 200 帖" });
  const rows = ids.map((id) => db.prepare("SELECT * FROM posts WHERE id=?").get(id)).filter(Boolean);
  if (rows.length !== ids.length) return res.status(404).json({ error: "帖子不存在" });
  if (rows.some((p) => !canModerate(req.user, p.board_id))) {
    return res.status(403).json({ error: "选中的帖子里有不在你管辖范围内的" });
  }
  if (action !== "delete" && rows.some((p) => forumx.isTrashed(p))) {
    return res.status(400).json({ error: "选中的帖子里有回收站帖子，请先还原" });
  }
  const flush = () => refreshBoardStats();

  if (action === "essence" || action === "pin" || action === "lock" || action === "hot") {
    const col = { essence: "is_essence", pin: "is_pinned", lock: "is_locked", hot: "is_hot" }[action];
    const value = Number(body.value) ? 1 : 0;
    if (action === "lock" && value && rows.some((p) => !p.is_locked && ((p.comment_count || 0) >= hotNeed() || p.is_hot))) {
      return res.status(400).json({ error: "热帖已自动解锁，不能再锁" });
    }
    const upd = db.prepare(`UPDATE posts SET ${col}=? WHERE id=?`);
    rows.forEach((p) => upd.run(value, p.id));
    logAdmin(req.user.id, `batch_${action}`, null, `批量${value ? "设置" : "取消"} ${action} ${rows.length} 帖`);
    return res.json({ ok: true, count: rows.length });
  }
  if (action === "highlight") {
    const color = forumx.highlightOf(body.color);
    const upd = db.prepare("UPDATE posts SET highlight=? WHERE id=?");
    rows.forEach((p) => upd.run(color, p.id));
    logAdmin(req.user.id, "batch_highlight", null, `批量高亮 ${color || "清除"} ${rows.length} 帖`);
    return res.json({ ok: true, count: rows.length });
  }
  if (action === "delete") {
    const stamp = now();
    const upd = db.prepare("UPDATE posts SET is_hidden=1, trashed_at=? WHERE id=? AND COALESCE(trashed_at,'')=''");
    let moved = 0;
    rows.forEach((p) => { moved += upd.run(stamp, p.id).changes; });
    logAdmin(req.user.id, "batch_delete", null, `批量移入回收站 ${moved} 帖`);
    flush();
    return res.json({ ok: true, count: moved });
  }
  if (action === "move") {
    const target = db.prepare("SELECT * FROM boards WHERE id=?").get(Number(body.boardId));
    if (!target) return res.status(404).json({ error: "版块不存在" });
    if (!isAdmin(req.user) && !staffBoards(req.user.id).includes(target.id)) {
      return res.status(403).json({ error: "只能移动到你所辖版块" });
    }
    const upd = db.prepare("UPDATE posts SET board_id=? WHERE id=?");
    const dec = db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0) WHERE id=?");
    const inc = db.prepare("UPDATE boards SET post_count = post_count+1 WHERE id=?");
    let moved = 0;
    rows.forEach((p) => {
      if (p.board_id === target.id) return;
      upd.run(target.id, p.id);
      dec.run(p.board_id);
      inc.run(target.id);
      moved += 1;
    });
    logAdmin(req.user.id, "batch_move", null, `批量移动 ${moved} 帖到 ${target.name}`);
    flush();
    return res.json({ ok: true, count: moved });
  }
  return res.status(400).json({ error: "未知操作" });
});

app.delete("/api/comments/:id", authRequired, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(c.post_id);
  const ok = c.user_id === req.user.id || (post && canModerate(req.user, post.board_id));
  if (!ok) return res.status(403).json({ error: "没有删除权限" });
  const ids = forumx.deleteCommentTree(db, c.id);
  if (post) db.prepare("UPDATE posts SET comment_count = MAX(comment_count-?,0) WHERE id=?").run(ids.length, post.id);
  res.json({ ok: true, removed: ids.length, ids });
});

app.put("/api/comments/:id", authRequired, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(c.post_id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (forumx.isTrashed(post)) return res.status(400).json({ error: "帖子在回收站，请先还原" });
  const owner = c.user_id === req.user.id;
  const mod = canModerate(req.user, post.board_id);
  if (!owner && !mod) return res.status(403).json({ error: "没有编辑权限" });
  if (post.is_locked && !mod) return res.status(403).json({ error: "帖子已锁定，无法编辑" });
  const content = String((req.body || {}).content || "").trim();
  if (!content) return res.status(400).json({ error: "评论不能为空" });
  try {
    forumx.assertSensitive(getSetting, content);
  } catch (e) {
    return sendErr(res, e);
  }
  db.prepare("UPDATE comments SET content=?, edited_at=? WHERE id=?").run(content.slice(0, 1000), now(), c.id);
  const fresh = db.prepare("SELECT * FROM comments WHERE id=?").get(c.id);
  res.json({ comment: mapComment(fresh, req.user.id) });
});

app.post("/api/comments/:id/pin", authRequired, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "评论不存在" });
  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(c.post_id);
  if (!post) return res.status(404).json({ error: "帖子不存在" });
  if (!canModerate(req.user, post.board_id)) return res.status(403).json({ error: "没有版主权限" });
  if (c.parent_id) return res.status(400).json({ error: "只能置顶楼层评论" });
  db.prepare("UPDATE comments SET is_pinned=? WHERE id=?").run(c.is_pinned ? 0 : 1, c.id);
  const fresh = db.prepare("SELECT * FROM comments WHERE id=?").get(c.id);
  res.json({ comment: mapComment(fresh, req.user.id) });
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

app.get("/api/admin/overview", authStaff, (req, res) => {
  if (!isAdmin(req.user)) {
    const ids = staffBoards(req.user.id);
    const ph = ids.map(() => "?").join(",");
    const count = (sql, ...p) => db.prepare(sql).get(...p).c;
    const boards = ids.length
      ? db.prepare(`SELECT id, name FROM boards WHERE id IN (${ph}) ORDER BY sort_order ASC`).all(...ids)
      : [];
    return res.json({
      scope: "mod",
      boards,
      posts: ids.length ? count(`SELECT COUNT(*) AS c FROM posts WHERE board_id IN (${ph})`, ...ids) : 0,
      comments: ids.length
        ? count(`SELECT COUNT(*) AS c FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.board_id IN (${ph})`, ...ids)
        : 0,
      hidden: ids.length
        ? count(`SELECT COUNT(*) AS c FROM posts WHERE board_id IN (${ph}) AND COALESCE(is_hidden,0)=1 AND COALESCE(trashed_at,'')=''`, ...ids)
        : 0,
      trash: ids.length
        ? count(`SELECT COUNT(*) AS c FROM posts WHERE board_id IN (${ph}) AND COALESCE(trashed_at,'')!=''`, ...ids)
        : 0
    });
  }
  res.json({
    scope: "admin",
    users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    posts: db.prepare("SELECT COUNT(*) AS c FROM posts").get().c,
    comments: db.prepare("SELECT COUNT(*) AS c FROM comments").get().c,
    hidden: db.prepare("SELECT COUNT(*) AS c FROM posts WHERE COALESCE(is_hidden,0)=1 AND COALESCE(trashed_at,'')=''").get().c,
    trash: db.prepare("SELECT COUNT(*) AS c FROM posts WHERE COALESCE(trashed_at,'')!=''").get().c,
    mods: db.prepare("SELECT COUNT(*) AS c FROM board_mods").get().c,
    banned: db.prepare("SELECT COUNT(*) AS c FROM users WHERE banned_until IS NOT NULL AND datetime(banned_until)>datetime('now')").get().c,
    yyApi: effectiveYyApi(),
    yyCookie: effectiveYyCookie()
  });
});

app.put("/api/admin/yy-api", authAdmin, (req, res) => {
  const body = req.body || {};
  const url = String(body.url || "").trim().replace(/\/$/, "");
  if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ error: "电台接口需为 http(s) 地址" });
  setSetting("yy_api", url);
  upsertDotEnv("YY_API", url);
  let cookie = effectiveYyCookie();
  if (Object.prototype.hasOwnProperty.call(body, "cookie")) {
    cookie = String(body.cookie || "").trim();
    setSetting("yy_cookie", cookie);
    upsertDotEnv("YY_COOKIE", cookie);
  }
  logAdmin(req.user.id, "yy_api", 0, url ? `电台接口 ${url}` : "清空电台接口");
  res.json({ yyApi: url, yyCookie: cookie });
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
    where.push("(nickname LIKE ? OR username LIKE ? OR CAST(uin AS TEXT) LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (filter === "admin") where.push("COALESCE(role,'user')='admin'");
  else if (filter === "mod") where.push("id IN (SELECT user_id FROM board_mods)");
  else if (filter === "banned") { where.push("banned_until IS NOT NULL AND banned_until > ?"); params.push(nowIso); }
  else if (filter === "muted") { where.push("muted_until IS NOT NULL AND muted_until > ?"); params.push(nowIso); }
  else if (filter === "vip") { where.push("vip_until IS NOT NULL AND vip_until > ?"); params.push(nowIso); }
  else if (filter === "svip") { where.push("vip_until IS NOT NULL AND vip_until > ? AND vip_tier='svip'"); params.push(nowIso); }
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
  const rawKind = body.verifyKind != null ? body.verifyKind : (target.verify_kind || "");
  const verifyKind = ["", "person", "org", "official"].includes(String(rawKind)) ? String(rawKind) : "";
  const verifyTitle = String(body.verifyTitle != null ? body.verifyTitle : (target.verify_title || "")).trim().slice(0, 24);
  db.prepare("UPDATE users SET nickname=?, bio=?, gender=?, city=?, birthday=?, verify_kind=?, verify_title=? WHERE id=?")
    .run(nickname, bio, gender, city, birthday, verifyKind, verifyTitle, target.id);
  logAdmin(req.user.id, "user_edit", target.id, `编辑用户 ${nickname}${verifyKind ? " · 认证" : ""}`);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  res.json({ user: publicUser(fresh, req.user.id) });
});

app.post("/api/admin/users/:id/vip", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  const days = Math.max(1, Math.min(3650, Math.floor(Number((req.body || {}).days) || 30)));
  const tier = String((req.body || {}).tier || "vip").toLowerCase() === "svip" ? "svip" : "vip";
  extendVip(target.id, days, tier);
  logAdmin(req.user.id, "user_vip", target.id, `赠送 ${target.nickname} ${tier.toUpperCase()} ${days} 天`);
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  res.json({ user: publicUser(fresh, req.user.id) });
});

app.post("/api/admin/users/:id/uin", authAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "用户不存在" });
  try {
    setUserUin(target.id, (req.body || {}).uin);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(target.id);
  logAdmin(req.user.id, "user_uin", target.id, `设置 ${fresh.nickname} 青葫号 ${fresh.uin}`);
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
  const types = forumx.normalizeTypes(body.types);
  const savedTypes = JSON.stringify(types.length ? types : forumx.defaultTypes());
  const announcement = String(body.announcement || "").trim().slice(0, 500);
  const info = db
    .prepare("INSERT INTO boards (name, slug, icon, cover, desc, color, sort_order, category, thread_types, announcement) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(name, slug, icon, "", desc, color, sort, category, savedTypes, announcement);
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
  const typesRaw = body.types !== undefined ? body.types : body.threadTypes;
  const savedTypes = typesRaw !== undefined
    ? JSON.stringify(forumx.normalizeTypes(typesRaw, board.thread_types))
    : (board.thread_types || "");
  const announcement = body.announcement !== undefined ? String(body.announcement || "").trim().slice(0, 500) : board.announcement;
  db.prepare("UPDATE boards SET name=?, icon=?, color=?, desc=?, category=?, sort_order=?, rules=?, thread_types=?, announcement=? WHERE id=?")
    .run(name, icon, color, desc, category, sort, rules, savedTypes, announcement, board.id);
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
    const delClaims = db.prepare("DELETE FROM redpacket_claims WHERE post_id=?");
    const delPurchases = db.prepare("DELETE FROM post_purchases WHERE post_id=?");
    postIds.forEach((pid) => {
      const p = db.prepare("SELECT * FROM posts WHERE id=?").get(pid);
      if (p) forumx.refundRedpacket(db, p, true);
      delComments.run(pid);
      delLikes.run(pid);
      delCollects.run(pid);
      delClaims.run(pid);
      delPurchases.run(pid);
    });
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

app.put("/api/boards/:id/announcement", authRequired, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  if (!canModerate(req.user, board.id)) return res.status(403).json({ error: "需要版主或管理员权限" });
  const announcement = String((req.body || {}).announcement || "").trim().slice(0, 500);
  db.prepare("UPDATE boards SET announcement=? WHERE id=?").run(announcement, board.id);
  logAdmin(req.user.id, "board_notice", board.id, announcement ? "更新版块公告" : "清空版块公告");
  res.json({ ok: true, announcement });
});

app.put("/api/boards/:id/types", authRequired, (req, res) => {
  const board = db.prepare("SELECT * FROM boards WHERE id=?").get(req.params.id);
  if (!board) return res.status(404).json({ error: "版块不存在" });
  if (!canModerate(req.user, board.id)) return res.status(403).json({ error: "需要版主或管理员权限" });
  const types = forumx.normalizeTypes((req.body || {}).types);
  db.prepare("UPDATE boards SET thread_types=? WHERE id=?").run(JSON.stringify(types), board.id);
  logAdmin(req.user.id, "board_types", board.id, `更新主题分类 ${types.map((t) => t.name).join("、")}`);
  res.json({ ok: true, threadTypes: types });
});

app.get("/api/admin/honors", authAdmin, (_req, res) => {
  const rows = db.prepare(
    `SELECT h.user_id, h.board_id, h.title, h.color, IFNULL(h.expires_at,'') AS expires_at, IFNULL(h.shown,0) AS shown,
            u.nickname, u.username, u.avatar, b.name AS board_name
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
      boardName: r.board_name,
      expiresAt: r.expires_at || "",
      shown: !!r.shown
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
  const honor = upsertHonor(user.id, board.id, body.honor || pair[0], body.honorColor || pair[1], body.days);
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

app.put("/api/admin/mini-apps", authAdmin, (req, res) => {
  const apps = saveMiniApps((req.body || {}).apps);
  logAdmin(req.user.id, "mini_apps", 0, `小应用 ${apps.map((a) => a.name).join("、") || "空"}`);
  res.json({ ok: true, apps });
});

app.get("/api/admin/medals", authAdmin, (_req, res) => {
  res.json({ medals: medalCatalog() });
});

app.put("/api/admin/medals/:slug", authAdmin, (req, res) => {
  const slug = req.params.slug;
  const base = MEDALS.find((m) => m.slug === slug);
  if (!base) {
    const raw = getSetting("custom_medals", []);
    const list = Array.isArray(raw) ? raw : [];
    const cur = list.find((m) => m.slug === slug);
    if (!cur) return res.status(404).json({ error: "勋章不存在" });
    const body = req.body || {};
    const next = list.map((m) => m.slug !== slug ? m : {
      ...m,
      name: String(body.name || m.name).slice(0, 12),
      icon: String(body.icon || m.icon).slice(0, 2),
      color: String(body.color || m.color).slice(0, 16),
      desc: String(body.desc != null ? body.desc : m.desc || "").slice(0, 40),
      enabled: body.enabled === undefined ? m.enabled !== false : !!body.enabled
    });
    setSetting("custom_medals", next);
    return res.json({ medals: medalCatalog() });
  }
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

app.get("/api/admin/posts", authStaff, (req, res) => {
  const hidden = String(req.query.hidden || "") === "1";
  const trash = String(req.query.trash || "") === "1";
  const q = String(req.query.q || "").trim();
  const ids = staffBoardIds(req.user);
  if (ids && !ids.length) return res.json({ posts: [] });
  const scopeSql = ids ? ` AND board_id IN (${ids.map(() => "?").join(",")})` : "";
  const scopeP = ids || [];
  let rows;
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const id = Number(q);
    rows = db.prepare(
      `SELECT * FROM posts WHERE COALESCE(trashed_at,'')='' AND COALESCE(is_hidden,0)=0 AND (id=? OR title LIKE ? OR content LIKE ?)${scopeSql}
       ORDER BY id DESC LIMIT 20`
    ).all(Number.isInteger(id) && id > 0 ? id : 0, like, like, ...scopeP);
  } else if (trash) {
    rows = db.prepare(`SELECT * FROM posts WHERE COALESCE(trashed_at,'')!=''${scopeSql} ORDER BY id DESC LIMIT 40`).all(...scopeP);
  } else if (hidden) {
    rows = db.prepare(`SELECT * FROM posts WHERE COALESCE(is_hidden,0)=1 AND COALESCE(trashed_at,'')=''${scopeSql} ORDER BY id DESC LIMIT 40`).all(...scopeP);
  } else {
    rows = db.prepare(`SELECT * FROM posts WHERE 1=1${scopeSql} ORDER BY id DESC LIMIT 40`).all(...scopeP);
  }
  res.json({ posts: rows.map((r) => packPost(r, req.user.id, { lite: true })) });
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
  const posts = db.prepare("SELECT * FROM posts WHERE soft_id=? ORDER BY id DESC LIMIT 12").all(row.id).map((p) => packPost(p, me, { lite: true }));
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
  const yy = String(process.env.YY_API || getSetting("yy_api", "") || "").trim();
  const songs = await searchSongs(q, yy, effectiveYyCookie());
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

function parseCostOf() {
  const n = Number(getSetting("parse_cost", 1));
  return Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 1;
}

function mapParseApi(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    apiUrl: row.api_url,
    parseType: row.parse_type || "",
    respData: row.resp_data || "",
    respTitle: row.resp_title || "",
    respVideo: row.resp_video || "",
    respImg: row.resp_img || "",
    sort: row.sort || 0,
    enabled: !!row.enabled,
    createdAt: row.created_at
  };
}

function mapParseLog(row, withResult) {
  let result = null;
  if (withResult && row.result) {
    try {
      result = JSON.parse(row.result);
    } catch {
      result = null;
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname || "",
    platform: row.platform || "",
    apiId: row.api_id || 0,
    ok: !!row.ok,
    durationMs: row.duration_ms || 0,
    cost: row.cost || 0,
    title: row.title || "",
    error: row.error || "",
    createdAt: row.created_at,
    result
  };
}

function insertParseLog(userId, platform, apiId, ok, durationMs, cost, title, result, error) {
  return db.prepare(
    "INSERT INTO parse_logs (user_id, platform, api_id, ok, duration_ms, cost, title, result, error, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).run(userId, platform || "", apiId || 0, ok ? 1 : 0, durationMs || 0, cost || 0, String(title || "").slice(0, 200), JSON.stringify(result || {}), String(error || "").slice(0, 240), now()).lastInsertRowid;
}

app.get("/api/parse/config", authRequired, (_req, res) => {
  res.json({ cost: parseCostOf() });
});

app.get("/api/parse/logs", authRequired, (req, res) => {
  purgeParseLogs();
  const rows = db.prepare("SELECT * FROM parse_logs WHERE user_id=? ORDER BY id DESC LIMIT 50").all(req.user.id);
  res.json({ logs: rows.map((r) => mapParseLog(r, false)) });
});

app.get("/api/parse/logs/:id", authRequired, (req, res) => {
  const row = db.prepare("SELECT * FROM parse_logs WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "记录不存在" });
  if (row.user_id !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: "只能看自己的记录" });
  res.json({ log: mapParseLog(row, true) });
});

app.post("/api/parse", authRequired, asyncH(async (req, res) => {
  purgeParseLogs();
  try {
    assertNotBanned(req.user);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const text = String((req.body && req.body.text) || "").trim();
  const parseType = ["auto", "video", "images"].includes((req.body || {}).parseType) ? req.body.parseType : "auto";
  if (text.length < 4) return res.status(400).json({ error: "分享内容过短" });
  if (!geoRate(`parse:${req.user.id}`, 10)) return res.status(429).json({ error: "解析太频繁，稍后再试" });
  const cost = parseCostOf();
  const fresh = db.prepare("SELECT gourd FROM users WHERE id=?").get(req.user.id);
  if ((fresh.gourd || 0) < cost) return res.status(400).json({ error: "葫芦不足" });
  const apis = db.prepare("SELECT * FROM parse_apis WHERE enabled=1 ORDER BY sort ASC, id ASC").all();
  const t0 = Date.now();
  let parsed;
  try {
    parsed = await parseShare(text, apis, parseType);
  } catch (e) {
    const dur = Date.now() - t0;
    const msg = (e && e.message) || "暂不支持该平台";
    insertParseLog(req.user.id, "", 0, 0, dur, 0, "", {}, msg);
    return res.status(400).json({ error: msg });
  }
  const dur = Date.now() - t0;
  let paid = 0;
  if (cost > 0) {
    const r = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(cost, req.user.id, cost);
    if (!r.changes) {
      insertParseLog(req.user.id, parsed.platform, parsed.apiId, 0, dur, 0, parsed.title, {}, "葫芦不足");
      return res.status(400).json({ error: "葫芦不足" });
    }
    paid = cost;
  }
  const payload = {
    platform: parsed.platform,
    kind: parsed.kind || "",
    title: parsed.title,
    author: parsed.author,
    avatar: parsed.avatar || "",
    cover: parsed.cover,
    video: parsed.video,
    videoBackup: parsed.videoBackup || "",
    shareUrl: pickUrl(text),
    pics: parsed.pics || [],
    clips: parsed.clips || [],
    music: parsed.music
  };
  const logId = insertParseLog(req.user.id, parsed.platform, parsed.apiId, 1, dur, paid, parsed.title, payload, "");
  const gourd = db.prepare("SELECT gourd FROM users WHERE id=?").get(req.user.id).gourd;
  res.json({ logId, cost: paid, gourd, result: payload });
}));

app.get("/api/parse/proxy", authRequired, asyncH(async (req, res) => {
  const raw = String(req.query.url || "");
  try {
    await assertPublicUrl(raw);
  } catch (e) {
    return res.status(400).json({ error: e.message || "地址不安全" });
  }
  const { res: up } = await safeFetch(raw, { timeout: 30000 });
  if (!up.ok) return res.status(502).json({ error: "资源不可用" });
  const ctype = up.headers.get("content-type") || "application/octet-stream";
  const len = Number(up.headers.get("content-length") || 0);
  if (len > 80 * 1024 * 1024) return res.status(400).json({ error: "文件过大" });
  res.setHeader("Content-Type", ctype);
  res.setHeader("Content-Disposition", "attachment");
  if (!up.body) {
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length > 80 * 1024 * 1024) return res.status(400).json({ error: "文件过大" });
    return res.end(buf);
  }
  const reader = up.body.getReader();
  let sent = 0;
  const max = 80 * 1024 * 1024;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    sent += chunk.value.length;
    if (sent > max) {
      res.destroy();
      return;
    }
    res.write(Buffer.from(chunk.value));
  }
  res.end();
}));

app.get("/api/admin/parse", authAdmin, (_req, res) => {
  const apis = db.prepare("SELECT * FROM parse_apis ORDER BY sort ASC, id ASC").all().map(mapParseApi);
  const statsRows = db.prepare(
    "SELECT api_id, COUNT(*) AS calls, SUM(ok) AS ok, AVG(duration_ms) AS avg_ms FROM parse_logs GROUP BY api_id"
  ).all();
  const byId = {};
  statsRows.forEach((s) => {
    byId[s.api_id] = { calls: s.calls || 0, ok: s.ok || 0, avgMs: Math.round(s.avg_ms || 0) };
  });
  const stats = apis.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    calls: (byId[a.id] && byId[a.id].calls) || 0,
    ok: (byId[a.id] && byId[a.id].ok) || 0,
    avgMs: (byId[a.id] && byId[a.id].avgMs) || 0
  }));
  const builtin = byId[0];
  if (builtin) stats.unshift({ id: 0, name: "内置适配", slug: "builtin", calls: builtin.calls, ok: builtin.ok, avgMs: builtin.avgMs });
  res.json({ cost: parseCostOf(), apis, stats });
});

app.put("/api/admin/parse/cost", authAdmin, (req, res) => {
  const n = Number((req.body && req.body.cost));
  const cost = Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 0;
  setSetting("parse_cost", cost);
  logAdmin(req.user.id, "parse_cost", 0, `每次解析扣 ${cost} 葫芦`);
  res.json({ cost });
});

app.post("/api/admin/parse/apis", authAdmin, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim().slice(0, 32);
  const slug = String(b.slug || "").trim().slice(0, 32);
  const apiUrl = String(b.apiUrl || "").trim().slice(0, 500);
  if (!name || !slug || !apiUrl) return res.status(400).json({ error: "名称、slug、地址都要填" });
  try {
    const u = new URL(apiUrl.replace(/\{url\}/g, "https://example.com"));
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
  } catch {
    return res.status(400).json({ error: "接口地址无效" });
  }
  const id = db.prepare(
    "INSERT INTO parse_apis (name, slug, api_url, parse_type, resp_data, resp_title, resp_video, resp_img, sort, enabled, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    name,
    slug,
    apiUrl,
    String(b.parseType || "").slice(0, 32),
    String(b.respData || "").slice(0, 80),
    String(b.respTitle || "").slice(0, 80),
    String(b.respVideo || "").slice(0, 80),
    String(b.respImg || "").slice(0, 80),
    Number.isFinite(Number(b.sort)) ? Math.floor(Number(b.sort)) : 0,
    b.enabled === false || b.enabled === 0 ? 0 : 1,
    now()
  ).lastInsertRowid;
  logAdmin(req.user.id, "parse_api", 0, `新增接口 ${name}`);
  res.json({ api: mapParseApi(db.prepare("SELECT * FROM parse_apis WHERE id=?").get(id)) });
});

app.put("/api/admin/parse/apis/:id", authAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM parse_apis WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "接口不存在" });
  const b = req.body || {};
  const name = String(b.name != null ? b.name : row.name).trim().slice(0, 32);
  const slug = String(b.slug != null ? b.slug : row.slug).trim().slice(0, 32);
  const apiUrl = String(b.apiUrl != null ? b.apiUrl : row.api_url).trim().slice(0, 500);
  if (!name || !slug || !apiUrl) return res.status(400).json({ error: "名称、slug、地址都要填" });
  const enabled = b.enabled === false || b.enabled === 0 ? 0 : (b.enabled === true || b.enabled === 1 ? 1 : row.enabled);
  db.prepare(
    "UPDATE parse_apis SET name=?, slug=?, api_url=?, parse_type=?, resp_data=?, resp_title=?, resp_video=?, resp_img=?, sort=?, enabled=? WHERE id=?"
  ).run(
    name,
    slug,
    apiUrl,
    String(b.parseType != null ? b.parseType : row.parse_type || "").slice(0, 32),
    String(b.respData != null ? b.respData : row.resp_data || "").slice(0, 80),
    String(b.respTitle != null ? b.respTitle : row.resp_title || "").slice(0, 80),
    String(b.respVideo != null ? b.respVideo : row.resp_video || "").slice(0, 80),
    String(b.respImg != null ? b.respImg : row.resp_img || "").slice(0, 80),
    Number.isFinite(Number(b.sort)) ? Math.floor(Number(b.sort)) : row.sort,
    enabled,
    row.id
  );
  res.json({ api: mapParseApi(db.prepare("SELECT * FROM parse_apis WHERE id=?").get(row.id)) });
});

app.post("/api/admin/parse/apis/:id/remove", authAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM parse_apis WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "接口不存在" });
  db.prepare("DELETE FROM parse_apis WHERE id=?").run(row.id);
  logAdmin(req.user.id, "parse_api", 0, `移除接口 ${row.name}`);
  res.json({ ok: true });
});

app.get("/api/admin/parse/logs", authAdmin, (req, res) => {
  purgeParseLogs();
  const q = String(req.query.q || "").trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      "SELECT l.*, u.nickname FROM parse_logs l LEFT JOIN users u ON u.id=l.user_id WHERE l.title LIKE ? OR l.platform LIKE ? OR IFNULL(u.nickname,'') LIKE ? ORDER BY l.id DESC LIMIT 80"
    ).all(like, like, like);
  } else {
    rows = db.prepare(
      "SELECT l.*, u.nickname FROM parse_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 80"
    ).all();
  }
  res.json({ logs: rows.map((r) => mapParseLog(r, false)) });
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

app.use("/api/chiyun", asyncH(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "仅支持查询" });
  }
  const root = String(effectiveYyApi() || "http://music.cxovo.cn").replace(/\/+$/, "");
  const suffix = String(req.originalUrl || "").replace(/^\/api\/chiyun/, "") || "/";
  if (suffix.includes("://") || suffix.includes("..")) return res.status(400).json({ error: "路径无效" });
  const headers = { "User-Agent": "QinghuChiyun/1.0", Accept: req.headers.accept || "application/json" };
  const cookie = effectiveYyCookie();
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(root + suffix, { method: "GET", headers, signal: AbortSignal.timeout(25000) });
  const buf = Buffer.from(await r.arrayBuffer());
  res.status(r.status);
  const ct = r.headers.get("content-type");
  if (ct) res.setHeader("content-type", ct);
  res.send(buf);
}));

app.use((req, res, next) => {
  if (String(req.path || "").startsWith("/api")) {
    return res.status(404).json({ error: "接口不存在，请覆盖更新后执行 bash 一键安装.sh 重启后端" });
  }
  next();
});

const publicDir = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    setHeaders(res, filePath) {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  }));
  app.get(/^\/(?!api\/|uploads\/|chiyun-app\/).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`青葫三楼 API 已启动: http://localhost:${PORT}  release=${RELEASE}`);
  fetch(`http://127.0.0.1:${PORT}/api/home`).catch(() => {});
  fetch(`http://127.0.0.1:${PORT}/api/config`).catch(() => {});
});
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`[启动失败] 端口 ${PORT} 已被旧进程占用，新代码无法接管。`);
    console.error(`请先结束占用进程：fuser -k ${PORT}/tcp   然后 pm2 restart qinghu-api`);
  } else {
    console.error("[启动失败]", err && err.message);
  }
  process.exit(1);
});
