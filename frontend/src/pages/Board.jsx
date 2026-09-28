import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { PinRow, PostRow } from "../components/PostCard.jsx";
import { formatHeat } from "../api.js";
import BoardIcon from "../components/BoardIcon.jsx";

export default function Board() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [board, setBoard] = useState(null);
  const [tab, setTab] = useState("reply");
  const [posts, setPosts] = useState([]);

  async function load() {
    const b = await api(`/api/boards/${id}`);
    setBoard(b.board);
    const p = await api(`/api/posts?boardId=${id}&tab=${tab}`);
    setPosts(p.posts || []);
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, [id, tab]);

  async function follow() {
    if (!user) return nav("/login");
    const d = await api(`/api/boards/${id}/follow`, { method: "POST" });
    setBoard({ ...board, followed: d.followed, followCount: board.followCount + (d.followed ? 1 : -1) });
  }

  if (!board) return <div className="empty">正在上这层楼...</div>;

  const pins = posts.filter((p) => p.pinned || p.official);
  const feed = posts.filter((p) => !p.pinned && !p.official);

  return (
    <div className="layout single">
      <div className="board-page">
        <div className="hx-hero" style={{ background: `linear-gradient(180deg, ${board.color}33, #fff 72%)` }}>
          <BoardIcon slug={board.slug} color={board.color} name={board.name} size={64} />
          <div className="grow">
            <h2>{board.name}</h2>
            {board.desc ? <p className="board-desc">{board.desc}</p> : null}
            <div className="stats-line">
              <span>热度 {formatHeat(board.heat)}</span>
              <span>话题 {formatHeat(board.topics || board.postCount)}</span>
              <span>关注 {formatHeat(board.followCount)}</span>
            </div>
            <div className="mods">版主 {(board.moderators || []).join("、") || "暂无"}</div>
          </div>
          <button className={`btn-follow ${board.followed ? "off" : ""}`} onClick={follow}>
            {board.followed ? "已关注" : "关注"}
          </button>
        </div>
        <div className="sort-bar">
          <div className="hx-sort">
            {[
              ["reply", "最新回复"],
              ["latest", "最新发帖"],
              ["hot", "热门"]
            ].map(([k, label]) => (
              <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          <div className="sort-actions">
            <Link className="rules-link" to={`/board/${id}/rules`}>版规</Link>
            <button className="btn btn-fill" onClick={() => nav(user ? `/publish?board=${id}` : "/login")}>发帖</button>
          </div>
        </div>
        {pins.map((p) => <PinRow key={p.id} post={p} />)}
        {feed.map((p) => <PostRow key={p.id} post={p} />)}
        {feed.length === 0 && pins.length === 0 ? <div className="empty">这层楼还没人说话</div> : null}
      </div>
    </div>
  );
}
