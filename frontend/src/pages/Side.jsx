import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { Level, UserAvatar, UserName } from "../components/Dress.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

export function CheckinBar() {
  const { user, setUser, toast } = useAuth();
  const nav = useNavigate();
  const [check, setCheck] = useState(null);

  useEffect(() => {
    if (!user) return;
    api("/api/checkin").then(setCheck).catch(() => {});
  }, [user]);

  async function doCheckin() {
    if (!user) return nav("/login");
    try {
      const d = await api("/api/checkin", { method: "POST" });
      setUser(d.user);
      setCheck({ done: true, streak: d.streak, reward: d.gourd });
      toast(`签到成功，葫芦 +${d.gourd}，经验 +${d.exp}`);
    } catch (e) {
      toast(e.message);
    }
  }

  const streak = user ? user.checkinStreak || check?.streak || 0 : 0;

  return (
    <div className="checkin checkin-mini">
      <div className="checkin-left">
        <b>每日签到</b>
        <span className="hint">连签 {streak} 天 · 今日 +{check?.reward || 2} 葫芦</span>
      </div>
      <button className="btn btn-gourd" type="button" onClick={doCheckin}>
        {check?.done ? "已签到" : "签到"}
      </button>
    </div>
  );
}

export default function Side({ home }) {
  const [ranks, setRanks] = useState({ masters: [] });

  useEffect(() => {
    api("/api/rankings").then(setRanks).catch(() => {});
  }, []);

  return (
    <aside className="side">
      <h4>热门版块</h4>
      {(home?.hotBoards || []).map((b) => (
        <Link className="board-mini" key={b.id} to={`/board/${b.id}`}>
          <BoardIcon slug={b.slug} color={b.color} name={b.name} size={36} />
          <div className="grow">
            <b>{b.name}</b>
            <div className="hint">今日 {b.todayPosts} 帖 · {b.followCount} 关注</div>
          </div>
        </Link>
      ))}
      <h4 style={{ marginTop: 16 }}>热搜</h4>
      {(home?.hots || []).map((h, i) => (
        <Link className="hot-item" key={h.id} to={`/post/${h.id}`}>
          <span className={`ord n${i + 1}`}>{i + 1}</span>
          <span>{h.title}</span>
        </Link>
      ))}
      <h4 style={{ marginTop: 16 }}>大神榜</h4>
      {(ranks.masters || []).slice(0, 6).map((u, i) => (
        <Link className="rank-item" key={u.id} to={`/user/${u.id}`}>
          <span className={`ord n${i + 1}`}>{i + 1}</span>
          <UserAvatar user={u} size="sm" />
          <div className="grow">
            <b><UserName user={u} withLevel={false} /></b>
            <div className="hint"><Level user={u} /> · {u.exp} 经验</div>
          </div>
        </Link>
      ))}
    </aside>
  );
}
