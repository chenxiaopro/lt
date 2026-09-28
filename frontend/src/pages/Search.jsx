import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { PostRow, Level } from "../components/PostCard.jsx";
import BoardIcon from "../components/BoardIcon.jsx";
import { UserAvatar } from "../components/Dress.jsx";

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const [data, setData] = useState({ posts: [], users: [], boards: [] });
  const [tab, setTab] = useState("posts");
  const [kw, setKw] = useState(q);

  useEffect(() => {
    if (!q) return;
    api(`/api/search?q=${encodeURIComponent(q)}`).then(setData).catch(() => {});
  }, [q]);

  useEffect(() => {
    setKw(q);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = kw.trim();
      if (next === q) return;
      if (next.length >= 2 || next.length === 0) setSp(next ? { q: next } : {});
    }, 400);
    return () => clearTimeout(t);
  }, [kw, q, setSp]);

  return (
    <div className="layout single">
      <div className="feed search-page">
        <div className="card search-wrap">
          <form className="circle-search" onSubmit={(e) => { e.preventDefault(); setSp(kw.trim() ? { q: kw.trim() } : {}); }}>
            <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜帖子、用户、版块" aria-label="搜索" enterKeyHint="search" />
            <button className="search-go" type="submit">搜索</button>
          </form>
        </div>
        <div className="tabs">
          <button className={`tab ${tab === "posts" ? "on" : ""}`} onClick={() => setTab("posts")}>帖子 {data.posts.length}</button>
          <button className={`tab ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}>用户 {data.users.length}</button>
          <button className={`tab ${tab === "boards" ? "on" : ""}`} onClick={() => setTab("boards")}>版块 {data.boards.length}</button>
        </div>
        {tab === "posts" && data.posts.map((p) => <PostRow key={p.id} post={p} />)}
        {tab === "posts" && !data.posts.length ? <div className="empty">没有搜到帖子</div> : null}
        {tab === "users" && !data.users.length ? <div className="empty">没有搜到用户</div> : null}
        {tab === "boards" && !data.boards.length ? <div className="empty">没有搜到版块</div> : null}
        {tab === "users" && data.users.map((u) => (
          <Link className="rank-item" key={u.id} to={`/user/${u.id}`}>
            <UserAvatar user={u} size="sm" />
            <div className="grow">
              <b>{u.nickname}</b> <Level user={u} />
              <div className="hint">{u.bio}</div>
            </div>
          </Link>
        ))}
        {tab === "boards" && data.boards.map((b) => (
          <Link className="board-mini search-hit" key={b.id} to={`/board/${b.id}`}>
            <BoardIcon slug={b.slug} color={b.color} name={b.name} size={44} />
            <div>
              <b>{b.name}</b>
              <div className="hint">{b.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
