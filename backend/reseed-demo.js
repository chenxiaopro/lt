#!/usr/bin/env node
/**
 * Refresh demo users and posts while keeping the site owner, custom boards
 * and non-demo content. Run from backend/: node reseed-demo.js
 */
const fs = require("fs");
const path = require("path");

const DEMO_USERNAMES = [
  "akai",
  "endman",
  "liyue",
  "midlaner",
  "island",
  "stardew",
  "xiaoman",
  "lab",
  "newbie",
  "porter",
  "yeyu"
];

const DEMO_POST_TITLES = [
  "三楼公约：互助分享，拒绝伸手党",
  "生存 100 天基地全记录，附平面图和物资清单",
  "新图神瞳一次清完：路线按时辰走，少跑回头路",
  "这赛季打野节奏表，对线别再送了",
  "海岛刷新点整理：刚枪位比空投香",
  "第一年四季种植表，温室之前别乱花钱",
  "安卓省电设置清单，后台唤醒能砍掉一半",
  "极简图标包 + 米白壁纸，桌面只留 8 个图标",
  "游戏闪退怎么排查？我已经清缓存三次了",
  "4K 风景壁纸包更新，按季节分好文件夹了",
  "深渊满星阵容讨论：这一期风系太吃香了",
  "红石电梯最简做法，材料能在第一周凑齐",
  "这周新游值得入吗？肝度预警写在前面",
  "你们都是怎么认识三楼的？",
  "新人报到：萌新求带，先从我的世界生存学起",
  "最近在追的剧和动画，求同类口味安利",
  "什么游戏能玩一辈子？我投生存建造类",
  "建筑接单？装饰风格求点评，偏中式庭院",
  "这赛季最难缠的英雄投票，我先投那个能清线还能支援的",
  "平板当第二块屏，有线比无线稳",
  "村民交易厅压缩版，适合山地地形",
  "深色图标在 OLED 上更干净，浅色壁纸党慎入",
  "单人排位吃鸡的三个习惯，比枪法更重要",
  "矿井电梯怎么规划，才不会把周末搭进去"
];

const { db, seedIfEmpty, refreshBoardStats } = require("./db");

function backupDatabase() {
  const dir = path.join(__dirname, "data", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(dir, `forum-${stamp}.db`);
  db.pragma("wal_checkpoint(TRUNCATE)");
  fs.copyFileSync(path.join(__dirname, "data", "forum.db"), base);
  for (const suffix of ["-wal", "-shm"]) {
    const src = path.join(__dirname, "data", `forum.db${suffix}`);
    if (fs.existsSync(src)) fs.copyFileSync(src, `${base}${suffix}`);
  }
  return base;
}

function placeholders(list) {
  return list.map(() => "?").join(",");
}

function run(sql, params = []) {
  try {
    return db.prepare(sql).run(...params);
  } catch {
    return null;
  }
}

function main() {
  const backup = backupDatabase();
  const userRows = db
    .prepare(`SELECT id FROM users WHERE username IN (${placeholders(DEMO_USERNAMES)})`)
    .all(...DEMO_USERNAMES);
  const demoUserIds = userRows.map((r) => r.id);
  const postRows = db
    .prepare(`SELECT id FROM posts WHERE title IN (${placeholders(DEMO_POST_TITLES)})`)
    .all(...DEMO_POST_TITLES);
  const demoPostIds = postRows.map((r) => r.id);

  const tx = db.transaction(() => {
    if (demoPostIds.length) {
      const posts = placeholders(demoPostIds);
      run(`DELETE FROM comments WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM likes WHERE target_type='post' AND target_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM collects WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM notifications WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM post_tips WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM post_purchases WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM redpacket_claims WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM poll_options WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM poll_votes WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM activity_joins WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM reports WHERE target_type='post' AND target_id IN (${posts})`, demoPostIds);
      run(`UPDATE softwares SET post_id=0 WHERE post_id IN (${posts})`, demoPostIds);
      run(`DELETE FROM posts WHERE id IN (${posts})`, demoPostIds);
    }

    if (demoUserIds.length) {
      const users = placeholders(demoUserIds);
      run(`DELETE FROM likes WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM collects WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM follows WHERE user_id IN (${users}) OR (target_type='user' AND target_id IN (${users}))`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM notifications WHERE user_id IN (${users}) OR from_user_id IN (${users})`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM checkins WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM dms WHERE from_id IN (${users}) OR to_id IN (${users})`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM board_mods WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM board_mutes WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM user_items WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM user_medals WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM user_honors WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM user_photos WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM user_blocks WHERE user_id IN (${users}) OR target_id IN (${users})`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM post_tips WHERE from_user_id IN (${users}) OR to_user_id IN (${users})`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM reports WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM password_resets WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM parse_logs WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM admin_logs WHERE admin_id IN (${users}) OR target_id IN (${users})`, [
        ...demoUserIds,
        ...demoUserIds
      ]);
      run(`DELETE FROM activity_joins WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM poll_votes WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM post_purchases WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM redpacket_claims WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM softwares WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM tracks WHERE user_id IN (${users})`, demoUserIds);
      run(`DELETE FROM users WHERE id IN (${users})`, demoUserIds);
    }
  });

  tx();
  seedIfEmpty({ force: true });
  refreshBoardStats();

  const counts = {
    users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    boards: db.prepare("SELECT COUNT(*) AS c FROM boards").get().c,
    posts: db.prepare("SELECT COUNT(*) AS c FROM posts").get().c,
    comments: db.prepare("SELECT COUNT(*) AS c FROM comments").get().c
  };
  console.log(JSON.stringify({ backup, removed: { users: demoUserIds.length, posts: demoPostIds.length }, counts }, null, 2));
}

main();
