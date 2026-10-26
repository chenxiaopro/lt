const crypto = require("crypto");

function fail(message, status) {
  const err = new Error(message);
  err.status = status || 400;
  throw err;
}

function ensureCol(db, table, name, sql) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(name)) db.exec(sql);
}

function parseJson(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isoNow() {
  return new Date().toISOString();
}

function isTrashed(row) {
  return !!(row && String(row.trashed_at || "").trim());
}

function migrate(db) {
  const hadTypes = db.prepare("PRAGMA table_info(boards)").all().some((c) => c.name === "thread_types");
  ensureCol(db, "users", "email", "ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
  ensureCol(db, "users", "last_speak_at", "ALTER TABLE users ADD COLUMN last_speak_at TEXT DEFAULT ''");
  ensureCol(db, "posts", "thread_kind", "ALTER TABLE posts ADD COLUMN thread_kind TEXT DEFAULT 'normal'");
  ensureCol(db, "posts", "thread_data", "ALTER TABLE posts ADD COLUMN thread_data TEXT DEFAULT '{}'");
  ensureCol(db, "posts", "hide_text", "ALTER TABLE posts ADD COLUMN hide_text TEXT DEFAULT ''");
  ensureCol(db, "comments", "quote_id", "ALTER TABLE comments ADD COLUMN quote_id INTEGER DEFAULT 0");
  ensureCol(db, "comments", "quote_floor", "ALTER TABLE comments ADD COLUMN quote_floor INTEGER DEFAULT 0");
  ensureCol(db, "comments", "quote_name", "ALTER TABLE comments ADD COLUMN quote_name TEXT DEFAULT ''");
  ensureCol(db, "comments", "quote_snippet", "ALTER TABLE comments ADD COLUMN quote_snippet TEXT DEFAULT ''");
  ensureCol(db, "posts", "trashed_at", "ALTER TABLE posts ADD COLUMN trashed_at TEXT DEFAULT ''");
  ensureCol(db, "comments", "edited_at", "ALTER TABLE comments ADD COLUMN edited_at TEXT DEFAULT ''");
  ensureCol(db, "boards", "thread_types", "ALTER TABLE boards ADD COLUMN thread_types TEXT DEFAULT ''");
  ensureCol(db, "posts", "type_id", "ALTER TABLE posts ADD COLUMN type_id INTEGER DEFAULT 0");
  ensureCol(db, "posts", "highlight", "ALTER TABLE posts ADD COLUMN highlight TEXT DEFAULT ''");
  ensureCol(db, "posts", "bumped_at", "ALTER TABLE posts ADD COLUMN bumped_at TEXT DEFAULT ''");
  ensureCol(db, "posts", "sunk_at", "ALTER TABLE posts ADD COLUMN sunk_at TEXT DEFAULT ''");
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, target_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      detail TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      handled_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS captchas (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_joins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS redpacket_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS post_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );
  `);
  if (!hadTypes) seedEmptyTypes(db);
}

function defaultTypes() {
  return [
    { id: 1, name: "讨论" },
    { id: 2, name: "求助" },
    { id: 3, name: "分享" }
  ];
}

function parseTypes(raw) {
  const list = parseJson(raw, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((t, i) => ({
      id: Number(t && t.id) || i + 1,
      name: String((t && t.name) || "").trim().slice(0, 8)
    }))
    .filter((t) => t.name)
    .slice(0, 12);
}

function normalizeTypes(input, prevRaw) {
  let names = [];
  if (Array.isArray(input)) {
    names = input.map((t) => (typeof t === "string" ? t : (t && t.name)));
  } else {
    names = String(input || "").split(/[,，\n]/);
  }
  const prev = parseTypes(prevRaw);
  const byName = new Map(prev.map((t) => [t.name, t.id]));
  let maxId = prev.reduce((m, t) => Math.max(m, t.id), 0);
  const seen = new Set();
  const out = [];
  names.forEach((n) => {
    const name = String(n || "").trim().slice(0, 8);
    if (!name || seen.has(name)) return;
    seen.add(name);
    const id = byName.get(name) || (maxId += 1);
    out.push({ id, name });
  });
  return out.slice(0, 12);
}

function typeIdOf(raw, id) {
  const n = Number(id) || 0;
  if (!n) return 0;
  const hit = parseTypes(raw).find((t) => t.id === n);
  return hit ? hit.id : 0;
}

function typeNameOf(raw, id) {
  const n = Number(id) || 0;
  if (!n) return "";
  const hit = parseTypes(raw).find((t) => t.id === n);
  return hit ? hit.name : "";
}

const HIGHLIGHTS = ["red", "orange", "green", "blue", "purple"];

function highlightOf(v) {
  const key = String(v || "").trim().toLowerCase();
  return HIGHLIGHTS.includes(key) ? key : "";
}

function seedEmptyTypes(db) {
  const raw = JSON.stringify(defaultTypes());
  db.prepare(
    "UPDATE boards SET thread_types=? WHERE thread_types IS NULL OR TRIM(thread_types)='' OR thread_types='[]'"
  ).run(raw);
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function issueCaptcha(db) {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const id = crypto.randomBytes(12).toString("hex");
  db.prepare("INSERT INTO captchas (id, question, answer, created_at) VALUES (?,?,?,?)").run(
    id,
    `${a} + ${b}`,
    String(a + b),
    isoNow()
  );
  return { id, question: `${a} + ${b}` };
}

function verifyCaptcha(db, id, answer) {
  const row = db.prepare("SELECT * FROM captchas WHERE id=?").get(String(id || ""));
  if (row) db.prepare("DELETE FROM captchas WHERE id=?").run(row.id);
  if (!row) fail("请完成验证");
  const age = Date.now() - Date.parse(row.created_at);
  if (!Number.isFinite(age) || age > 20 * 60 * 1000) fail("请完成验证");
  if (String(answer == null ? "" : answer).trim() !== String(row.answer)) fail("请完成验证");
}

function requestReset(db, username) {
  const name = String(username || "").trim();
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(name);
  if (!user) fail("账号不存在");
  if (!String(user.email || "").trim()) fail("该账号未绑定邮箱，请联系站长重置");
  const token = crypto.randomBytes(8).toString("hex");
  db.prepare("DELETE FROM password_resets WHERE user_id=?").run(user.id);
  db.prepare("INSERT INTO password_resets (user_id, token, created_at, used) VALUES (?,?,?,0)").run(
    user.id,
    token,
    isoNow()
  );
  return { token };
}

function confirmReset(db, bcrypt, body) {
  const name = String((body && body.username) || "").trim();
  const token = String((body && body.token) || "").trim();
  const password = String((body && body.password) || "");
  if (password.length < 6) fail("密码至少 6 位");
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(name);
  if (!user) fail("链接无效，请重新申请");
  const row = db.prepare("SELECT * FROM password_resets WHERE user_id=? AND token=?").get(user.id, token);
  if (!row || row.used) fail("链接无效，请重新申请");
  const age = Date.now() - Date.parse(row.created_at);
  if (!Number.isFinite(age) || age > 20 * 60 * 1000) fail("链接无效，请重新申请");
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(password, 8), user.id);
  db.prepare("UPDATE password_resets SET used=1 WHERE id=?").run(row.id);
}

function markSpoke(db, userId, at) {
  db.prepare("UPDATE users SET last_speak_at=? WHERE id=?").run(at || isoNow(), userId);
}

function assertFlood(db, userId) {
  const u = db.prepare("SELECT last_speak_at FROM users WHERE id=?").get(userId);
  if (!u || !u.last_speak_at) return;
  const t = Date.parse(u.last_speak_at);
  if (!Number.isFinite(t)) return;
  const left = 30 - Math.floor((Date.now() - t) / 1000);
  if (left > 0) fail(`发帖太快，请 ${left} 秒后再试`);
}

function assertSensitive(getSetting, ...parts) {
  const raw = getSetting("sensitive_words", "") || "";
  const text = Array.isArray(raw) ? raw.join("\n") : String(raw);
  const words = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!words.length) return;
  const blob = parts.map((p) => String(p || "")).join("\n").toLowerCase();
  if (words.some((w) => blob.includes(w.toLowerCase()))) fail("含有敏感词，请修改");
}

function blockedSet(db, me) {
  if (!me) return new Set();
  return new Set(db.prepare("SELECT target_id FROM user_blocks WHERE user_id=?").all(me).map((r) => r.target_id));
}

function isBlocked(db, me, targetId) {
  if (!me || !targetId || Number(me) === Number(targetId)) return false;
  return !!db.prepare("SELECT 1 FROM user_blocks WHERE user_id=? AND target_id=?").get(me, targetId);
}

function hideBlockedPosts(posts, set) {
  if (!set || !set.size) return posts || [];
  return (posts || []).filter((p) => !(p && p.author && set.has(p.author.id)));
}

function blockToggle(db, { userId, targetId, now }) {
  const uid = Number(userId);
  const tid = Number(targetId);
  if (!tid) fail("用户不存在");
  if (uid === tid) fail("不能拉黑自己");
  const target = db.prepare("SELECT id FROM users WHERE id=?").get(tid);
  if (!target) fail("用户不存在");
  const hit = db.prepare("SELECT id FROM user_blocks WHERE user_id=? AND target_id=?").get(uid, tid);
  if (hit) {
    db.prepare("DELETE FROM user_blocks WHERE id=?").run(hit.id);
    return { blocked: false };
  }
  db.prepare("INSERT INTO user_blocks (user_id, target_id, created_at) VALUES (?,?,?)").run(uid, tid, now || isoNow());
  return { blocked: true };
}

function blockList(db, userId, publicUser) {
  const rows = db.prepare(
    "SELECT u.*, b.created_at AS blocked_at FROM user_blocks b JOIN users u ON u.id=b.target_id WHERE b.user_id=? ORDER BY b.id DESC"
  ).all(userId);
  return rows.map((r) => {
    const u = publicUser(r, userId);
    u.blockedAt = r.blocked_at;
    return u;
  });
}

function targetUserId(db, type, id) {
  if (type === "comment") {
    const c = db.prepare("SELECT user_id FROM comments WHERE id=?").get(id);
    return c ? c.user_id : 0;
  }
  const p = db.prepare("SELECT user_id FROM posts WHERE id=?").get(id);
  return p ? p.user_id : 0;
}

function targetBoardId(db, type, id) {
  if (type === "comment") {
    const c = db.prepare("SELECT p.board_id AS b FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=?").get(id);
    return c ? c.b : 0;
  }
  const p = db.prepare("SELECT board_id AS b FROM posts WHERE id=?").get(id);
  return p ? p.b : 0;
}

function reportCreate(db, { userId, targetType, targetId, reason, detail, now }) {
  const type = targetType === "comment" ? "comment" : "post";
  const tid = Number(targetId);
  if (!tid) fail("举报目标不存在");
  if (type === "comment") {
    if (!db.prepare("SELECT id FROM comments WHERE id=?").get(tid)) fail("举报目标不存在");
  } else if (!db.prepare("SELECT id FROM posts WHERE id=?").get(tid)) fail("举报目标不存在");
  const why = String(reason || "").trim().slice(0, 20);
  const note = String(detail || "").trim();
  if (!why) fail("请选择理由");
  if (note.length < 5 || note.length > 80) fail("说明需 5 到 80 个字符");
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const dup = db.prepare(
    "SELECT id FROM reports WHERE user_id=? AND target_type=? AND target_id=? AND created_at>=?"
  ).get(userId, type, tid, since);
  if (dup) fail("已举报，请等待处理");
  db.prepare(
    "INSERT INTO reports (user_id, target_type, target_id, reason, detail, status, created_at) VALUES (?,?,?,?,?,'open',?)"
  ).run(userId, type, tid, why, note, now || isoNow());
}

function reportList(db, publicUser, opts) {
  const boardIds = opts && Array.isArray(opts.boardIds) ? new Set(opts.boardIds.map(Number)) : null;
  return db.prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 200").all()
    .filter((r) => !boardIds || boardIds.has(targetBoardId(db, r.target_type, r.target_id)))
    .map((r) => {
    const from = db.prepare("SELECT * FROM users WHERE id=?").get(r.user_id);
    const uid = targetUserId(db, r.target_type, r.target_id);
    const tu = uid ? db.prepare("SELECT * FROM users WHERE id=?").get(uid) : null;
    return {
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      note: r.note || "",
      createdAt: r.created_at,
      handledAt: r.handled_at || "",
      from: from ? publicUser(from) : null,
      targetUser: tu ? publicUser(tu) : null
    };
  });
}

function reportHandle(db, { id, note, now, boardIds }) {
  const row = db.prepare("SELECT * FROM reports WHERE id=?").get(Number(id));
  if (!row) fail("举报不存在");
  if (Array.isArray(boardIds) && !boardIds.map(Number).includes(targetBoardId(db, row.target_type, row.target_id))) {
    const err = new Error("没有该版块的版主权限");
    err.status = 403;
    throw err;
  }
  db.prepare("UPDATE reports SET status='done', note=?, handled_at=? WHERE id=?").run(
    String(note || "").slice(0, 80),
    now || isoNow(),
    row.id
  );
}

function threadOf(row) {
  return parseJson(row && row.thread_data, {});
}

function saveThread(db, postId, kind, data) {
  db.prepare("UPDATE posts SET thread_kind=?, thread_data=? WHERE id=?").run(
    kind,
    JSON.stringify(data || {}),
    postId
  );
}

function rollbackPost(db, postId) {
  const p = db.prepare("SELECT * FROM posts WHERE id=?").get(postId);
  if (p) refundRedpacket(db, p, true);
  db.prepare("DELETE FROM poll_options WHERE post_id=?").run(postId);
  db.prepare("DELETE FROM redpacket_claims WHERE post_id=?").run(postId);
  db.prepare("DELETE FROM post_purchases WHERE post_id=?").run(postId);
  db.prepare("DELETE FROM posts WHERE id=?").run(postId);
  if (p) {
    db.prepare("UPDATE boards SET post_count = MAX(post_count-1,0), today_posts = MAX(today_posts-1,0) WHERE id=?").run(p.board_id);
  }
}

function createThread(db, { postId, userId, kind, thread, now }) {
  const k = String(kind || "normal");
  const at = now || isoNow();
  const data = thread && typeof thread === "object" ? thread : parseJson(thread, {});
  try {
    if (k === "poll") {
      const opts = (Array.isArray(data.options) ? data.options : [])
        .map((s) => String(s || "").trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10);
      if (opts.length < 2) fail("投票至少 2 个选项");
      saveThread(db, postId, "poll", { multi: !!data.multi });
      const ins = db.prepare("INSERT INTO poll_options (post_id, text, sort_order) VALUES (?,?,?)");
      opts.forEach((text, i) => ins.run(postId, text, i));
      return;
    }
    if (k === "reward") {
      const amount = Math.floor(Number(data.amount) || 0);
      if (amount < 1 || amount > 999) fail("悬赏葫芦需 1 到 999");
      const pay = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(amount, userId, amount);
      if (!pay.changes) fail("葫芦不足");
      saveThread(db, postId, "reward", { amount, status: "open", createdAt: at });
      return;
    }
    if (k === "activity") {
      const place = String(data.place || "").trim().slice(0, 40);
      const startAt = String(data.startAt || "").trim();
      const endAt = String(data.endAt || "").trim();
      const maxNum = Math.floor(Number(data.maxNum) || 0);
      const fee = Math.max(0, Math.floor(Number(data.fee) || 0));
      if (!place || !startAt) fail("请填写地点和开始时间");
      if (maxNum < 1 || maxNum > 200) fail("人数上限需 1 到 200");
      saveThread(db, postId, "activity", { place, startAt, endAt, maxNum, fee });
      return;
    }
    if (k === "redpacket") {
      const amount = Math.floor(Number(data.amount) || 0);
      const count = Math.floor(Number(data.packets) || 0);
      const blessing = String(data.blessing || "").trim().slice(0, 40);
      if (amount < 1 || amount > 999) fail("红包总额需 1 到 999 葫芦");
      if (count < 1 || count > 100) fail("红包个数需 1 到 100");
      if (amount < count) fail("每个红包至少 1 葫芦");
      db.transaction(() => {
        saveThread(db, postId, "redpacket", {
          amount,
          count,
          blessing,
          claimedCount: 0,
          claimedAmount: 0,
          status: "open",
          createdAt: at,
          expiresAt: new Date(Date.parse(at) + 24 * 3600 * 1000).toISOString()
        });
        const pay = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(amount, userId, amount);
        if (!pay.changes) fail("葫芦不足");
      })();
      return;
    }
    if (k === "paid") {
      const price = Math.floor(Number(data.price) || 0);
      const text = String(data.text || "").trim().slice(0, 4000);
      if (price < 1 || price > 999) fail("付费金额需 1 到 999 葫芦");
      if (!text) fail("请填写付费内容");
      saveThread(db, postId, "paid", { price, text, createdAt: at });
      return;
    }
    saveThread(db, postId, "normal", {});
  } catch (err) {
    try { rollbackPost(db, postId); } catch (_) { /* keep original error */ }
    throw err;
  }
}

function refundReward(db, row) {
  if (String(row.thread_kind || "") !== "reward") return threadOf(row);
  const data = threadOf(row);
  if (data.status !== "open") return data;
  const start = Date.parse(data.createdAt || row.created_at);
  if (!Number.isFinite(start) || Date.now() - start < 7 * 24 * 3600 * 1000) return data;
  const amount = Math.floor(Number(data.amount) || 0);
  db.transaction(() => {
    if (amount > 0) db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(amount, row.user_id);
    data.status = "refunded";
    saveThread(db, row.id, "reward", data);
  })();
  return data;
}

function redpacketTotals(db, postId) {
  const r = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM redpacket_claims WHERE post_id=?").get(postId);
  return { count: Number(r.c) || 0, amount: Number(r.s) || 0 };
}

function refundRedpacket(db, row, force) {
  if (String(row.thread_kind || "") !== "redpacket") return threadOf(row);
  const data = threadOf(row);
  if (data.status !== "open") return data;
  const expires = Date.parse(data.expiresAt || "");
  if (!force && Number.isFinite(expires) && Date.now() < expires) return data;
  const totals = redpacketTotals(db, row.id);
  const amount = Math.max(0, Math.floor(Number(data.amount) || 0) - totals.amount);
  db.transaction(() => {
    if (amount > 0) db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(amount, row.user_id);
    data.status = "refunded";
    data.claimedCount = totals.count;
    data.claimedAmount = totals.amount;
    data.refundedAt = isoNow();
    saveThread(db, row.id, "redpacket", data);
  })();
  return data;
}

function redpacketView(db, row, me, lite) {
  const data = refundRedpacket(db, row);
  const amount = Math.floor(Number(data.amount) || 0);
  const count = Math.floor(Number(data.count) || 0);
  const claimedCount = Math.floor(Number(data.claimedCount) || 0);
  const claimedAmount = Math.floor(Number(data.claimedAmount) || 0);
  const status = data.status === "done" || data.status === "refunded" ? data.status : "open";
  const mine = me ? db.prepare("SELECT amount FROM redpacket_claims WHERE post_id=? AND user_id=?").get(row.id, me) : null;
  const isOp = !!(me && Number(me) === Number(row.user_id));
  return {
    amount,
    count,
    claimedCount,
    claimedAmount,
    remainCount: Math.max(0, count - claimedCount),
    remainAmount: Math.max(0, amount - claimedAmount),
    blessing: data.blessing || "",
    status,
    expiresAt: data.expiresAt || "",
    isOp,
    claimed: !!mine,
    myAmount: mine ? Number(mine.amount) || 0 : 0,
    canClaim: !!(me && !isOp && status === "open" && !mine && claimedCount < count),
    claims: lite ? [] : db.prepare(
      "SELECT c.amount, c.created_at, u.id, u.nickname, u.avatar FROM redpacket_claims c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.id DESC LIMIT 50"
    ).all(row.id).map((r) => ({
      userId: r.id,
      nickname: r.nickname,
      avatar: r.avatar,
      amount: Number(r.amount) || 0,
      createdAt: r.created_at
    }))
  };
}

function claimRedpacket(db, { post, user, now }) {
  if (String(post.thread_kind || "") !== "redpacket") fail("这不是红包帖");
  const data = threadOf(post);
  if (post.user_id === user.id) fail("不能领取自己的红包");
  if (data.status === "refunded") fail("红包已过期退回");
  if (data.status === "done") fail("红包已领完");
  const expires = Date.parse(data.expiresAt || "");
  if (!Number.isFinite(expires) || Date.now() >= expires) {
    refundRedpacket(db, post);
    fail("红包已过期");
  }
  if (db.prepare("SELECT 1 FROM redpacket_claims WHERE post_id=? AND user_id=?").get(post.id, user.id)) {
    fail("你已经领过这个红包了");
  }
  const totals = redpacketTotals(db, post.id);
  const total = Math.floor(Number(data.amount) || 0);
  const count = Math.floor(Number(data.count) || 0);
  const remainAmount = total - totals.amount;
  const remainCount = count - totals.count;
  if (remainCount <= 0 || remainAmount < remainCount) fail("红包已领完");
  const cap = remainAmount - (remainCount - 1);
  const max = Math.max(1, Math.min(cap, Math.ceil((remainAmount / remainCount) * 2)));
  const share = remainCount === 1 ? remainAmount : 1 + crypto.randomInt(max);
  db.transaction(() => {
    db.prepare("INSERT INTO redpacket_claims (post_id, user_id, amount, created_at) VALUES (?,?,?,?)").run(
      post.id,
      user.id,
      share,
      now || isoNow()
    );
    db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(share, user.id);
    data.claimedCount = totals.count + 1;
    data.claimedAmount = totals.amount + share;
    if (data.claimedCount >= count) data.status = "done";
    saveThread(db, post.id, "redpacket", data);
  })();
  return { amount: share };
}

function paidView(db, row, me, packed, lite) {
  const data = threadOf(row);
  const isOp = !!(me && Number(me) === Number(row.user_id));
  const isMod = !!(packed && packed.canModerate);
  const bought = me
    ? db.prepare("SELECT price FROM post_purchases WHERE post_id=? AND user_id=?").get(row.id, me)
    : null;
  const canView = isOp || isMod || !!bought;
  const stats = db.prepare("SELECT COUNT(*) AS c FROM post_purchases WHERE post_id=?").get(row.id);
  return {
    price: Math.max(1, Math.floor(Number(data.price) || 1)),
    isOp,
    purchased: !!bought,
    canView,
    sales: Number(stats.c) || 0,
    text: canView && !lite ? String(data.text || "") : ""
  };
}

function purchasePaid(db, { post, user, now }) {
  if (String(post.thread_kind || "") !== "paid") fail("这不是付费帖");
  if (Number(post.user_id) === Number(user.id)) fail("这是你发布的帖子");
  if (db.prepare("SELECT 1 FROM post_purchases WHERE post_id=? AND user_id=?").get(post.id, user.id)) {
    fail("你已经解锁过了");
  }
  const data = threadOf(post);
  const price = Math.floor(Number(data.price) || 0);
  if (price < 1 || price > 999) fail("付费金额异常");
  db.transaction(() => {
    const pay = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(price, user.id, price);
    if (!pay.changes) fail("葫芦不足");
    db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(price, post.user_id);
    db.prepare("INSERT INTO post_purchases (post_id, user_id, price, created_at) VALUES (?,?,?,?)").run(
      post.id,
      user.id,
      price,
      now || isoNow()
    );
  })();
  return { price };
}

function pollView(db, postId, me, multi) {
  const options = db.prepare("SELECT * FROM poll_options WHERE post_id=? ORDER BY sort_order, id").all(postId);
  const counts = {};
  db.prepare("SELECT option_id, COUNT(*) AS c FROM poll_votes WHERE post_id=? GROUP BY option_id").all(postId)
    .forEach((r) => { counts[r.option_id] = r.c; });
  const total = options.reduce((s, o) => s + (counts[o.id] || 0), 0);
  const voted = me
    ? !!db.prepare("SELECT 1 FROM poll_votes WHERE post_id=? AND user_id=?").get(postId, me)
    : false;
  return {
    multi: !!multi,
    voted,
    total,
    options: options.map((o) => {
      const count = counts[o.id] || 0;
      return {
        id: o.id,
        text: o.text,
        count,
        percent: total ? Math.round((count * 100) / total) : 0
      };
    })
  };
}

function activityView(db, row, data, me) {
  const members = db.prepare(
    "SELECT u.id, u.nickname FROM activity_joins j JOIN users u ON u.id=j.user_id WHERE j.post_id=? ORDER BY j.id"
  ).all(row.id);
  const isOp = me && Number(me) === Number(row.user_id);
  return {
    place: data.place || "",
    startAt: data.startAt || "",
    endAt: data.endAt || "",
    maxNum: Number(data.maxNum) || 0,
    fee: Number(data.fee) || 0,
    count: members.length,
    members: isOp ? members : [],
    joined: !!(me && members.some((m) => m.id === me))
  };
}

function withThread(db, packed, row, me, lite) {
  const kind = String(row.thread_kind || "normal");
  packed.threadKind = kind;
  if (kind === "poll") {
    packed.poll = pollView(db, row.id, me, !!(threadOf(row).multi));
  } else if (kind === "reward") {
    const data = refundReward(db, row);
    packed.reward = { amount: Number(data.amount) || 0, status: data.status || "open" };
  } else if (kind === "activity") {
    packed.activity = activityView(db, row, threadOf(row), me);
  } else if (kind === "redpacket") {
    packed.redpacket = redpacketView(db, row, me, !!lite);
  } else if (kind === "paid") {
    packed.paid = paidView(db, row, me, packed, !!lite);
    if (!packed.paid.canView) {
      const imgs = Array.isArray(packed.images) ? packed.images : [];
      const vids = Array.isArray(packed.videos) ? packed.videos : [];
      if (imgs.length) {
        packed.paid.hiddenImages = imgs.length;
        packed.images = [];
      }
      if (vids.length) {
        packed.paid.hiddenVideos = vids.length;
        packed.videos = [];
      }
    }
  }
  attachHide(db, packed, row, me);
  return packed;
}

function setHideText(db, postId, text) {
  const hide = String(text || "").trim().slice(0, 2000);
  db.prepare("UPDATE posts SET hide_text=? WHERE id=?").run(hide, postId);
}

function canSeeHide(db, row, me, packed) {
  if (!me) return false;
  if (Number(row.user_id) === Number(me)) return true;
  if (packed && packed.canModerate) return true;
  return !!db.prepare("SELECT 1 FROM comments WHERE post_id=? AND user_id=?").get(row.id, me);
}

function attachHide(db, packed, row, me) {
  const hide = String(row.hide_text || "").trim();
  packed.hasHide = !!hide;
  packed.hideLocked = false;
  packed.hideText = "";
  if (!hide) return;
  if (canSeeHide(db, row, me, packed)) packed.hideText = hide;
  else packed.hideLocked = true;
}

function quoteOf(db, postId, quoteId) {
  const id = Number(quoteId) || 0;
  if (!id) return null;
  const c = db.prepare("SELECT * FROM comments WHERE id=? AND post_id=?").get(id, postId);
  if (!c) fail("引用的评论不存在");
  const u = db.prepare("SELECT nickname FROM users WHERE id=?").get(c.user_id);
  const snippet = String(c.content || "").replace(/\/uploads\/[^\s]+/g, "[图片]").replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    id: c.id,
    floor: c.floor || 0,
    name: (u && u.nickname) || "楼友",
    snippet
  };
}

function votePoll(db, { post, userId, optionIds, now }) {
  if (String(post.thread_kind || "") !== "poll") fail("这不是投票帖");
  if (db.prepare("SELECT 1 FROM poll_votes WHERE post_id=? AND user_id=?").get(post.id, userId)) fail("已经投过");
  const multi = !!threadOf(post).multi;
  const ids = [...new Set((Array.isArray(optionIds) ? optionIds : [optionIds]).map((n) => Number(n)).filter(Boolean))];
  if (!ids.length) fail("请选择选项");
  if (!multi && ids.length !== 1) fail("该投票为单选");
  const opts = db.prepare("SELECT id FROM poll_options WHERE post_id=?").all(post.id).map((o) => o.id);
  if (ids.some((id) => !opts.includes(id))) fail("选项无效");
  if (ids.length > opts.length) fail("选项过多");
  const ins = db.prepare("INSERT INTO poll_votes (post_id, option_id, user_id, created_at) VALUES (?,?,?,?)");
  const at = now || isoNow();
  db.transaction(() => {
    ids.forEach((id) => ins.run(post.id, id, userId, at));
  })();
}

function adoptReward(db, { post, user, commentId, now }) {
  if (String(post.thread_kind || "") !== "reward") fail("这不是悬赏帖");
  if (post.user_id !== user.id) fail("只有楼主可以采纳");
  const data = refundReward(db, post);
  if (data.status !== "open") fail("悬赏已结束");
  const c = db.prepare("SELECT * FROM comments WHERE id=? AND post_id=?").get(Number(commentId), post.id);
  if (!c) fail("评论不存在");
  if (c.user_id === user.id) fail("不能采纳自己的回复");
  const amount = Math.floor(Number(data.amount) || 0);
  db.transaction(() => {
    if (amount > 0) db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(amount, c.user_id);
    data.status = "adopted";
    data.adoptedCommentId = c.id;
    data.adoptedAt = now || isoNow();
    saveThread(db, post.id, "reward", data);
  })();
  return { toId: c.user_id, amount, commentId: c.id };
}

function joinActivity(db, { post, user, now }) {
  if (String(post.thread_kind || "") !== "activity") fail("这不是活动帖");
  const data = threadOf(post);
  const hit = db.prepare("SELECT id FROM activity_joins WHERE post_id=? AND user_id=?").get(post.id, user.id);
  if (hit) {
    db.prepare("DELETE FROM activity_joins WHERE id=?").run(hit.id);
    return { joined: false };
  }
  const count = db.prepare("SELECT COUNT(*) AS c FROM activity_joins WHERE post_id=?").get(post.id).c;
  const maxNum = Number(data.maxNum) || 0;
  if (maxNum && count >= maxNum) fail("名额已满");
  const fee = Math.max(0, Math.floor(Number(data.fee) || 0));
  db.transaction(() => {
    if (fee > 0 && user.id !== post.user_id) {
      const pay = db.prepare("UPDATE users SET gourd = gourd - ? WHERE id=? AND gourd >= ?").run(fee, user.id, fee);
      if (!pay.changes) fail("葫芦不足");
      db.prepare("UPDATE users SET gourd = gourd + ? WHERE id=?").run(fee, post.user_id);
    }
    db.prepare("INSERT INTO activity_joins (post_id, user_id, created_at) VALUES (?,?,?)").run(
      post.id,
      user.id,
      now || isoNow()
    );
  })();
  return { joined: true };
}

function listComments(db, { postId, opId, opOnly, onlyId, offset, limit, blocked, mapComment, me, order, jumpFloor }) {
  const lim = Math.min(30, Math.max(1, Number(limit) || 30));
  const desc = String(order || "") === "desc";
  const hide = blocked instanceof Set ? blocked : new Set();
  const all = db.prepare("SELECT * FROM comments WHERE post_id=? ORDER BY floor ASC, id ASC").all(postId)
    .filter((c) => !hide.has(c.user_id));
  const byId = {};
  all.forEach((c) => { byId[c.id] = c; });

  const want = Number(jumpFloor) || 0;
  let jumpId = 0;
  let jumpRootId = 0;
  if (want) {
    const hit = all.find((c) => Number(c.floor) === want);
    if (!hit) fail("没有这一楼");
    jumpId = hit.id;
    jumpRootId = hit.id;
    let p = hit.parent_id;
    let g = 0;
    while (p && byId[p] && g < 20) {
      jumpRootId = p;
      p = byId[p].parent_id;
      g += 1;
    }
  }

  function slicePage(ordered, anchorId) {
    let off = Math.max(0, Number(offset) || 0);
    if (anchorId) {
      const idx = ordered.findIndex((c) => c.id === anchorId);
      if (idx < 0) fail("没有这一楼");
      off = Math.floor(idx / lim) * lim;
    }
    const page = ordered.slice(off, off + lim);
    return { page, off, hasMore: off + page.length < ordered.length };
  }

  const only = opOnly ? Number(opId) : Number(onlyId) || 0;
  if (only) {
    const mineRows = all.filter((c) => Number(c.user_id) === only);
    const pinnedMine = mineRows.filter((c) => c.is_pinned);
    const restMine = mineRows.filter((c) => !c.is_pinned);
    const orderedRows = pinnedMine.concat(desc ? restMine.slice().reverse() : restMine);
    const ordered = orderedRows.map((c) => {
      const mapped = mapComment(c, me);
      if (c.parent_id) {
        const parent = byId[c.parent_id];
        if (!parent || Number(parent.user_id) !== only) mapped.parentId = null;
      }
      return mapped;
    });
    const sliced = slicePage(ordered, jumpId);
    return { comments: sliced.page, hasMore: sliced.hasMore, offset: sliced.off, jumpId };
  }

  const roots = all.filter((c) => !c.parent_id);
  const pinned = roots.filter((c) => c.is_pinned);
  const rest = roots.filter((c) => !c.is_pinned);
  const ordered = pinned.concat(desc ? rest.slice().reverse() : rest);
  const sliced = slicePage(ordered, jumpRootId);
  const page = sliced.page;
  const rootIds = new Set(page.map((c) => c.id));
  function underRoot(c) {
    let p = c.parent_id;
    let g = 0;
    while (p && g < 20) {
      if (rootIds.has(p)) return true;
      p = byId[p] ? byId[p].parent_id : null;
      g += 1;
    }
    return false;
  }
  const extra = all.filter((c) => c.parent_id && underRoot(c));
  return {
    comments: page.concat(extra).map((c) => mapComment(c, me)),
    hasMore: sliced.hasMore,
    offset: sliced.off,
    jumpId
  };
}

function snippetOf(text, key) {
  const s = String(text || "").replace(/\s+/g, " ");
  const i = s.toLowerCase().indexOf(String(key).toLowerCase());
  if (i < 0) return s.slice(0, 40);
  const start = Math.max(0, i - 12);
  const end = Math.min(s.length, i + String(key).length + 18);
  return (start > 0 ? "…" : "") + s.slice(start, end) + (end < s.length ? "…" : "");
}

function searchComments(db, { postId, q, blocked, mapComment, me, limit }) {
  const key = String(q || "").trim();
  if (!key) return { results: [], total: 0, key: "" };
  if (key.length > 30) fail("搜索词最多 30 个字");
  const hide = blocked instanceof Set ? blocked : new Set();
  const lim = Math.min(50, Math.max(1, Number(limit) || 50));
  const like = `%${key.replace(/[%_]/g, "")}%`;
  const rows = db
    .prepare("SELECT * FROM comments WHERE post_id=? AND content LIKE ? ORDER BY floor ASC, id ASC LIMIT 200")
    .all(postId, like)
    .filter((c) => !hide.has(c.user_id));
  const results = rows.slice(0, lim).map((c) => ({
    id: c.id,
    floor: c.floor,
    snippet: snippetOf(c.content, key),
    author: mapComment(c, me).author,
    createdAt: c.created_at
  }));
  return { results, total: rows.length, key };
}

function neighbors(db, post) {
  if (!post || !post.board_id) return { prev: null, next: null };
  const prev = db.prepare(
    "SELECT id, title FROM posts WHERE board_id=? AND COALESCE(is_hidden,0)=0 AND id>? ORDER BY id ASC LIMIT 1"
  ).get(post.board_id, post.id);
  const next = db.prepare(
    "SELECT id, title FROM posts WHERE board_id=? AND COALESCE(is_hidden,0)=0 AND id<? ORDER BY id DESC LIMIT 1"
  ).get(post.board_id, post.id);
  function pack(row) {
    if (!row) return null;
    return { id: row.id, title: String(row.title || "未命名").slice(0, 48) };
  }
  return { prev: pack(prev), next: pack(next) };
}

function deleteCommentTree(db, commentId) {
  const ids = [];
  function walk(id) {
    ids.push(id);
    db.prepare("SELECT id FROM comments WHERE parent_id=?").all(id).forEach((r) => walk(r.id));
  }
  walk(commentId);
  const delLike = db.prepare("DELETE FROM likes WHERE target_type='comment' AND target_id=?");
  const delCmt = db.prepare("DELETE FROM comments WHERE id=?");
  db.transaction(() => {
    ids.forEach((id) => {
      delLike.run(id);
      delCmt.run(id);
    });
  })();
  return ids;
}

module.exports = {
  migrate,
  isTrashed,
  parseTypes,
  normalizeTypes,
  typeIdOf,
  typeNameOf,
  highlightOf,
  defaultTypes,
  validEmail,
  issueCaptcha,
  verifyCaptcha,
  requestReset,
  confirmReset,
  markSpoke,
  assertFlood,
  assertSensitive,
  blockedSet,
  isBlocked,
  hideBlockedPosts,
  blockToggle,
  blockList,
  reportCreate,
  reportList,
  reportHandle,
  createThread,
  withThread,
  refundRedpacket,
  claimRedpacket,
  purchasePaid,
  setHideText,
  quoteOf,
  votePoll,
  adoptReward,
  joinActivity,
  listComments,
  searchComments,
  neighbors,
  deleteCommentTree
};
