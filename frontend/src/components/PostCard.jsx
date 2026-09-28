import React, { useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../api.js";

import { Level, UserAvatar, UserName } from "./Dress.jsx";
import { HeartIco, ChatIco, StarIco } from "../icons.jsx";
import Lightbox from "./Lightbox.jsx";
import SoftCard from "./SoftCard.jsx";

export { Level };

export function PostRow({ post }) {
  const img = (post.images || [])[0];
  const fresh = Date.now() - new Date(post.createdAt).getTime() < 36e5;
  return (
    <Link className="hx-row" to={`/post/${post.id}`}>
      <div className="hx-row-body">
        <h3>
          {fresh ? <span className="badge-plus">+5</span> : null}
          {fresh ? <span className="badge-new">新</span> : null}
          {post.title}
        </h3>
        {img ? null : <div className="ex">{post.content}</div>}
        <div className="hx-row-meta">
          <span>{post.author?.nickname || "葫芦丝"}</span>
          <span>{timeAgo(post.createdAt)} · {post.viewCount}看 · {post.commentCount}评</span>
        </div>
      </div>
      {img ? <img className="hx-thumb" src={img} alt="" /> : null}
    </Link>
  );
}

export function PinRow({ post }) {
  return (
    <Link className="hx-pin" to={`/post/${post.id}`}>
      {post.official ? <span className="badge-off">公</span> : <span className="badge-top">顶</span>}
      <span className="grow">{post.title}</span>
    </Link>
  );
}

export function MediaCard({ post, tall }) {
  const img = (post.images || [])[0] || post.author?.avatar;
  return (
    <Link className={`media-card ${tall ? "tall" : ""}`} to={`/post/${post.id}`}>
      <img src={img} alt="" />
      <div className="media-cap">
        <div className="who-mini">
          <UserAvatar user={post.author} size="xs" />
          <span>{post.author.nickname}</span>
        </div>
        <div className="media-stats">
          <span>赞 {post.likeCount || 0}</span>
          <span>评 {post.commentCount || 0}</span>
        </div>
      </div>
    </Link>
  );
}

function momentShowsTitle(post) {
  const t = String(post.title || "").trim();
  const c = String(post.content || "").trim();
  if (!t) return false;
  if (t === "发动态" || t === "这一刻") return false;
  if (c && (c.startsWith(t) || t === c.slice(0, t.length))) return false;
  return true;
}

export function MomentCard({ post, onLike }) {
  const imgs = (post.images || []).slice(0, 9);
  const n = imgs.length;
  const grid = n <= 1 ? "one" : n === 2 || n === 4 ? "two" : "three";
  const [shot, setShot] = useState(-1);
  return (
    <article className="moment-item">
      <Link className="moment-avatar" to={`/user/${post.author.id}`}>
        <UserAvatar user={post.author} size="md" />
      </Link>
      <div className="moment-main">
        <Link className="moment-name" to={`/user/${post.author.id}`}><UserName user={post.author} withLevel={false} /></Link>
        <Link className="moment-body" to={`/post/${post.id}`}>
          {momentShowsTitle(post) ? <div className="moment-title">{post.title}</div> : null}
          {post.content ? <div className="moment-text">{post.content}</div> : null}
          {n ? (
            <div className={`moment-imgs n-${grid}`}>
              {imgs.map((src) => (
                <span className="cell" key={src} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShot(imgs.indexOf(src)); }}>
                  <img src={src} alt="" />
                </span>
              ))}
            </div>
          ) : null}
        </Link>
        <div className="moment-meta">
          <div className="left">
            <span>{timeAgo(post.createdAt)}</span>
            {post.board ? <Link to={`/board/${post.board.id}`}>{post.board.name}</Link> : null}
          </div>
          <div className="acts">
            <button type="button" className={post.liked ? "on" : ""} onClick={() => onLike && onLike(post)}>
              赞 {post.likeCount || 0}
            </button>
            <Link to={`/post/${post.id}`}>评 {post.commentCount || 0}</Link>
          </div>
        </div>
      </div>
      <Lightbox images={imgs} index={shot} onClose={() => setShot(-1)} onIndex={setShot} />
    </article>
  );
}

export default function PostCard({ post, variant = "feed" }) {
  if (variant === "row") return <PostRow post={post} />;
  const n = Math.min(9, (post.images || []).length);
  const [shot, setShot] = useState(-1);
  return (
    <article className="post-card">
      <Link className="post-head" to={`/user/${post.author.id}`}>
        <UserAvatar user={post.author} size="sm" />
        <div className="who">
          <div className="name">
            <UserName user={post.author} />
          </div>
          <div className="meta">
            {timeAgo(post.createdAt)}{post.ipRegion ? ` · IP属地 ${post.ipRegion}` : ""}
          </div>
        </div>
      </Link>
      <Link to={`/post/${post.id}`}>
        <div className="title-row">
          {post.pinned ? <span className="pin">置顶</span> : null}
          {post.essence ? <span className="seal">精华</span> : null}
          <h3>{post.title}</h3>
        </div>
        <div className="excerpt">{post.content}</div>
        {n ? (
          <div className={`imgs n${n}`}>
            {post.images.slice(0, 9).map((src, i) => (
              <img key={src} src={src} alt="" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShot(i); }} />
            ))}
          </div>
        ) : null}
      </Link>
      {post.software ? <SoftCard item={post.software} /> : null}
      <div className="post-foot">
        <Link className="board-chip" to={`/board/${post.board.id}`}>
          <i className="dot" style={{ background: post.board.color }} />
          {post.board.name}
        </Link>
        <div className="stats">
          <span><HeartIco size={14} />{post.likeCount}</span>
          <span><ChatIco size={14} />{post.commentCount}</span>
          <span><StarIco size={14} />{post.collectCount}</span>
        </div>
      </div>
      <Lightbox images={post.images || []} index={shot} onClose={() => setShot(-1)} onIndex={setShot} />
    </article>
  );
}
