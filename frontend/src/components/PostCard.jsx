import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../api.js";

import { Level, UserAvatar, UserName } from "./Dress.jsx";
import { HeartIco, ChatIco, StarIco } from "../icons.jsx";
import Lightbox from "./Lightbox.jsx";
import SoftCard from "./SoftCard.jsx";
import VideoPlayer from "./VideoPlayer.jsx";

export { Level };

export function TitleBadges({ post, showPin = true }) {
  if (!post) return null;
  const items = [];
  if (post.official) items.push(["off", "公"]);
  if (post.pinned && showPin) items.push(["top", "顶"]);
  if (post.certified) items.push(["cert", "认"]);
  if (post.essence) items.push(["ess", "精"]);
  if (post.hot) items.push(["hot", "热"]);
  if (post.threadKind === "poll") items.push(["poll", "投"]);
  if (post.threadKind === "reward") items.push(["rew", "赏"]);
  if (post.threadKind === "activity") items.push(["act", "活"]);
  if (post.threadKind === "redpacket") items.push(["red", "包"]);
  if (post.threadKind === "paid") items.push(["paid", "费"]);
  if (post.hasHide) items.push(["hide", "隐"]);
  if (!items.length) return null;
  return (
    <span className="title-badges">
      {items.map(([k, t]) => (
        <span key={k} className={`badge-${k}`}>{t}</span>
      ))}
    </span>
  );
}

export function TitleText({ post, className }) {
  const hl = post && post.highlight ? ` hl-${post.highlight}` : "";
  const cls = className || "post-title-text";
  return (
    <>
      {post && post.typeName ? <span className="type-tag">[{post.typeName}]</span> : null}
      <span className={`${cls}${hl}`}>{post ? post.title : ""}</span>
    </>
  );
}

export function uniqueTips(tips) {
  const seen = new Map();
  (tips || []).forEach((t) => {
    const uid = t.userId || t.id;
    if (uid && !seen.has(uid)) seen.set(uid, t);
  });
  return [...seen.values()];
}

export function TipStrip({ tips, onOpen, compact }) {
  const faces = uniqueTips(tips).slice(0, 8);
  if (!faces.length) return null;
  return (
    <button type="button" className={`tip-strip${compact ? " compact" : ""}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen && onOpen(); }}>
      {faces.map((t) => (
        <span className="tip-face" key={t.userId || t.id}>
          <img src={t.avatar} alt="" />
          <em className={t.amount < 0 ? "neg" : "pos"}>{t.amount < 0 ? Math.abs(t.amount) : `+${t.amount}`}</em>
        </span>
      ))}
    </button>
  );
}

export function TipList({ tips, onClose }) {
  if (!tips) return null;
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-card tip-list-card" onClick={(e) => e.stopPropagation()}>
        <h3>打赏列表</h3>
        {tips.length ? tips.map((t) => (
          <div className="tip-list-row" key={t.tipId || `${t.userId}-${t.createdAt}`}>
            <img className="tip-list-av" src={t.avatar} alt="" />
            <div className="grow">
              <b>{t.nickname}</b>
              <p>{t.reason || (t.amount < 0 ? "扣葫芦" : "打赏")}</p>
            </div>
            <span className={`tip-list-amt ${t.amount < 0 ? "neg" : "pos"}`}>
              {t.amount < 0 ? `-${Math.abs(t.amount)}` : `+${t.amount}`}
            </span>
          </div>
        )) : <div className="empty">还没有打赏</div>}
        <button type="button" className="btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

function PostRowInner({ post, fresh, img }) {
  return (
    <>
      <div className="hx-row-body">
        <h3 className="post-title">
          <TitleBadges post={post} />
          {post.tipCount > 0 ? <span className="badge-plus">+{post.tipCount}</span> : null}
          {fresh ? <span className="badge-new">新</span> : null}
          <TitleText post={post} />
        </h3>
        {img ? null : <div className="ex">{post.content}</div>}
        <div className="hx-row-meta">
          <span>{post.author ? <UserName user={post.author} withLevel={false} /> : "葫芦丝"}</span>
          <span>{timeAgo(post.createdAt)} · {post.viewCount}看 · {post.commentCount}评</span>
        </div>
      </div>
      {img ? <img className="hx-thumb" src={img} alt="" loading="lazy" decoding="async" /> : null}
    </>
  );
}

export const PostRow = memo(function PostRow({ post, pickable, picked, onPick }) {
  const img = (post.images || [])[0];
  const fresh = Date.now() - new Date(post.createdAt).getTime() < 36e5;
  if (pickable) {
    return (
      <div className={`hx-row pickable${picked ? " picked" : ""}`} onClick={() => onPick && onPick(post.id)}>
        <span className={`pick-box${picked ? " on" : ""}`} aria-hidden="true" />
        <PostRowInner post={post} fresh={fresh} img={img} />
      </div>
    );
  }
  return (
    <Link className="hx-row" to={`/post/${post.id}`}>
      <PostRowInner post={post} fresh={fresh} img={img} />
    </Link>
  );
})

function PinRowInner({ post, showBoardPin }) {
  return (
    <>
      <TitleBadges post={post} showPin={showBoardPin} />
      <TitleText post={post} className="pin-title" />
    </>
  );
}

export const PostRowDense = memo(function PostRowDense({ post }) {
  const img = (post.images || [])[0];
  const fresh = Date.now() - new Date(post.createdAt).getTime() < 36e5;
  const body = String(post.content || "").trim();
  const fallback = (post.images || []).length ? "[图片]" : (post.videos || []).length ? "[视频]" : "";
  const excerpt = body ? (body.length > 80 ? `${body.slice(0, 80)}…` : body) : fallback;
  return (
    <Link className="hx-row" to={`/post/${post.id}`}>
      <div className="hx-row-body">
        <h3 className="post-title">
          <TitleBadges post={post} />
          {post.tipCount > 0 ? <span className="badge-plus">+{post.tipCount}</span> : null}
          {fresh ? <span className="badge-new">新</span> : null}
          <TitleText post={post} />
        </h3>
        {excerpt ? <div className="ex dense-ex">{excerpt}</div> : null}
        <div className="hx-row-meta">
          <span>{post.author ? <UserName user={post.author} withLevel={false} /> : "葫芦丝"}</span>
          <span>{timeAgo(post.createdAt)} · {post.viewCount}看 · {post.commentCount}评</span>
        </div>
      </div>
      {img ? <img className="hx-thumb" src={img} alt="" loading="lazy" decoding="async" /> : null}
    </Link>
  );
})

export const PinRow = memo(function PinRow({ post, showBoardPin = true, pickable, picked, onPick }) {
  if (pickable) {
    return (
      <div className={`hx-pin pickable${picked ? " picked" : ""}`} onClick={() => onPick && onPick(post.id)}>
        <span className={`pick-box${picked ? " on" : ""}`} aria-hidden="true" />
        <PinRowInner post={post} showBoardPin={showBoardPin} />
      </div>
    );
  }
  return (
    <Link className="hx-pin" to={`/post/${post.id}`}>
      <PinRowInner post={post} showBoardPin={showBoardPin} />
    </Link>
  );
})

export function MediaCard({ post, tall }) {
  const img = (post.images || [])[0] || post.author?.avatar;
  return (
    <Link className={`media-card ${tall ? "tall" : ""}`} to={`/post/${post.id}`}>
      <img src={img} alt="" loading="lazy" decoding="async" />
      <div className="media-cap">
        <div className="who-mini">
          <UserAvatar user={post.author} size="xs" />
          <span><UserName user={post.author} withLevel={false} /></span>
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

export const MomentCard = memo(function MomentCard({ post, onLike }) {
  const imgs = (post.images || []).slice(0, 9);
  const vids = (post.videos || []).slice(0, 3);
  const n = imgs.length;
  const grid = n <= 1 ? "one" : n === 2 || n === 4 ? "two" : "three";
  const [shot, setShot] = useState(-1);
  return (
    <article className="moment-item">
      <Link className="moment-avatar" to={post.author ? `/user/${post.author.id}` : "/"}>
        <UserAvatar user={post.author} size="md" />
      </Link>
      <div className="moment-main">
        <Link className="moment-name" to={post.author ? `/user/${post.author.id}` : "/"}><UserName user={post.author} withLevel={false} /></Link>
        <Link className="moment-body" to={`/post/${post.id}`}>
          {momentShowsTitle(post) ? <div className="moment-title">{post.title}</div> : null}
          {post.content ? <div className="moment-text">{post.content}</div> : null}
          {n ? (
            <div className={`moment-imgs n-${grid}`}>
              {imgs.map((src) => (
                <span className="cell" key={src} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShot(imgs.indexOf(src)); }}>
                  <img src={src} alt="" loading="lazy" decoding="async" />
                </span>
              ))}
            </div>
          ) : null}
        </Link>
        {vids.length ? (
          <div className="moment-videos">
            {vids.map((src) => <VideoPlayer key={src} src={src} compact />)}
          </div>
        ) : null}
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
})

export default memo(function PostCard({ post, variant = "feed" }) {
  if (variant === "row") return <PostRow post={post} />;
  const n = Math.min(9, (post.images || []).length);
  const vid = (post.videos || [])[0];
  const [shot, setShot] = useState(-1);
  return (
    <article className="post-card">
      <Link className="post-head" to={post.author ? `/user/${post.author.id}` : "/"}>
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
          <h3 className="post-title">
            <TitleBadges post={post} />
            <TitleText post={post} />
          </h3>
        </div>
        <div className="excerpt">{post.content}</div>
        {n ? (
          <div className={`imgs n${n}`}>
            {post.images.slice(0, 9).map((src, i) => (
              <img key={src} src={src} alt="" loading="lazy" decoding="async" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShot(i); }} />
            ))}
          </div>
        ) : null}
        {vid ? (
          <div className="feed-video">
            <video src={vid} muted playsInline preload="metadata" />
            <span>视频</span>
          </div>
        ) : null}
      </Link>
      {post.software ? <SoftCard item={post.software} /> : null}
      <div className="post-foot">
        {post.board ? (
          <Link className="board-chip" to={`/board/${post.board.id}`}>
            <i className="dot" style={{ background: post.board.color }} />
            {post.board.name}
          </Link>
        ) : <span />}
        <div className="stats">
          <span><HeartIco size={14} />{post.likeCount}</span>
          <span><ChatIco size={14} />{post.commentCount}</span>
          <span><StarIco size={14} />{post.collectCount}</span>
        </div>
      </div>
      <Lightbox images={post.images || []} index={shot} onClose={() => setShot(-1)} onIndex={setShot} />
    </article>
  );
})
