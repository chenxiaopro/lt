import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { ChatIco, EyeIco } from "../icons.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

function newsDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}年${m}月${day}日`;
}

function BoardCell({ to, slug, color, name, badge, iconName }) {
  return (
    <Link className="hx-cell" to={to}>
      <BoardIcon slug={slug} color={color} name={iconName || name} size={52} />
      <b>{name}</b>
      {badge > 0 ? <em className="hx-today">{badge > 999 ? "999+" : badge}</em> : null}
    </Link>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    api("/api/boards").then((d) => setBoards(d.boards || [])).catch(() => {});
    api("/api/home").then((d) => setBanner((d.banners || [])[0] || null)).catch(() => {});
  }, [user]);

  const notice = boards.find((b) => b.slug === "notice");
  const feedback = boards.find((b) => b.slug === "feedback");
  const sysBoards = [notice, feedback].filter(Boolean);
  const skip = new Set(sysBoards.map((b) => b.id));
  const mineGrid = boards.filter((b) => b.followed && !skip.has(b.id));
  const odd = (mineGrid.length + 1) % 2 === 1;

  return (
    <div className="layout single">
      <div className="hx-forum rec">
        {banner ? (
          <Link className="hx-news" to={`/post/${banner.id}`}>
            <div className="hx-news-thumb">
              {(banner.images || [])[0] ? <img src={banner.images[0]} alt="" /> : <div className="forum-banner-ph" />}
              {(banner.images || []).length > 1 ? <em>{banner.images.length}图</em> : null}
            </div>
            <div className="hx-news-body">
              <h3>{banner.title}</h3>
              <p>{banner.content || banner.board?.name || ""}</p>
              <div className="meta">
                <span className="who">{banner.author?.nickname || "青葫"}</span>
                <span className="stats">
                  {newsDate(banner.createdAt)}
                  <EyeIco size={13} />
                  {banner.viewCount || 0}
                  <ChatIco size={13} />
                  {banner.commentCount || 0}
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="hx-sec"><span>我的版块</span></div>
        <div className="hx-cells">
          <BoardCell to="/?tab=follow" slug="follow" name="我的关注" />
          {mineGrid.map((b) => (
            <BoardCell
              key={b.id}
              to={`/board/${b.id}`}
              slug={b.slug}
              color={b.color}
              name={b.name}
              badge={b.todayPosts}
            />
          ))}
          {odd ? <span className="hx-cell slot" /> : null}
        </div>

        {sysBoards.length ? (
          <>
            <div className="hx-sec"><span>系统推荐</span></div>
            <div className="hx-cells">
              {sysBoards.map((b) => (
                <BoardCell
                  key={b.id}
                  to={`/board/${b.id}`}
                  slug={b.slug}
                  color={b.color}
                  name={b.name}
                  badge={b.todayPosts}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
