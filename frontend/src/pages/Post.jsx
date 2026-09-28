import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, timeAgo, pushHistory, removeHistory } from "../api.js";
import { useAuth } from "../context.jsx";
import { FloorWho, UserAvatar } from "../components/Dress.jsx";
import { CameraIco, ChatIco, EyeIco, HeartIco, SmileIco, StarIco } from "../icons.jsx";
import Lightbox from "../components/Lightbox.jsx";
import SoftCard from "../components/SoftCard.jsx";
import { TrackChip } from "./Music.jsx";

const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "🍀", "💚", "🥺", "😎", "🤝"];

function CommentText({ text, className, onPic }) {
  const parts = String(text || "").split(/(\/uploads\/[^\s]+)/g);
  return (
    <span className={className || undefined}>
      {parts.map((p, i) =>
        p.startsWith("/uploads/") ? (
          <button type="button" className="cmt-img-btn" key={i} onClick={(e) => { e.stopPropagation(); onPic && onPic(p); }}>
            <img className="cmt-img" src={p} alt="" />
          </button>
        ) : <span key={i}>{p}</span>
      )}
    </span>
  );
}

const GHOST = {
  id: 0,
  nickname: "已注销",
  avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=gone&backgroundColor=f3f4f6",
  level: 1,
  titleColor: "#9ca3af"
};

function PostBody({ text }) {
  const parts = String(text || "").split(/(\/soft\/\d+|https?:\/\/[^\s]+)/g);
  return (
    <div className="post-body">
      {parts.map((p, i) => {
        if (/^\/soft\/\d+$/.test(p)) return <Link key={i} className="soft-link" to={p}>软件 #{p.slice(6)}</Link>;
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

function OpHead({ author, time, boardId, region }) {
  const a = author || GHOST;
  return (
    <div className="op-head">
      <div className="hx-floor-av">
        {a.id ? (
          <Link to={`/user/${a.id}`}>
            <UserAvatar user={a} size="md" plain square />
          </Link>
        ) : (
          <UserAvatar user={a} size="md" plain square />
        )}
        <span className="op-mark">楼主</span>
      </div>
      <FloorWho user={a} boardId={boardId} link />
      <div className="hx-floor-side">
        <span className="hx-floor-time">{time}{region ? ` · ${region}` : ""}</span>
      </div>
    </div>
  );
}

function CmtRow({ c, child, parentName, onReply, onLike, onDelete, canCut, onPic, isOp, boardId }) {
  const a = c.author || GHOST;
  return (
    <div className={`xhs-cmt${child ? " child" : ""}`}>
      <div className="xhs-avcol">
        {a.id ? (
          <Link to={`/user/${a.id}`} className="xhs-av"><UserAvatar user={a} size="sm" /></Link>
        ) : (
          <span className="xhs-av"><UserAvatar user={a} size="sm" /></span>
        )}
        {isOp ? <span className="op-mark">楼主</span> : null}
      </div>
      <div className="xhs-main">
        <FloorWho user={a} boardId={boardId} muted />
        <div className="xhs-text" onClick={() => onReply(c)} role="presentation">
          {parentName ? <span className="reply-at">回复 {parentName}：</span> : null}
          <CommentText text={c.content} onPic={onPic} />
        </div>
        <div className="xhs-meta">
          <span>
            {timeAgo(c.createdAt)}
            {c.ipRegion ? ` · IP属地 ${c.ipRegion}` : ""}
            <button type="button" className="xhs-reply" onClick={() => onReply(c)}>回复</button>
            {canCut ? <button type="button" className="xhs-reply danger" onClick={() => onDelete(c)}>删除</button> : null}
          </span>
        </div>
      </div>
      <button type="button" className={`xhs-heart${c.liked ? " on" : ""}`} onClick={() => onLike(c)}>
        <HeartIco size={16} filled={!!c.liked} />
        {c.likeCount ? <span>{c.likeCount}</span> : null}
      </button>
    </div>
  );
}

export default function Post() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOn, setEmojiOn] = useState(false);
  const [openKids, setOpenKids] = useState({});
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const [view, setView] = useState({ images: [], index: -1 });
  const [gone, setGone] = useState(false);

  async function load() {
    try {
      const p = await api(`/api/posts/${id}`);
      setGone(false);
      setPost(p.post);
      pushHistory(p.post);
      const c = await api(`/api/posts/${id}/comments`);
      setComments(c.comments || []);
    } catch (e) {
      setPost(null);
      setComments([]);
      setGone(true);
      removeHistory(id);
      throw e;
    }
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, [id]);

  async function needLogin() {
    if (!user) {
      nav("/login");
      return false;
    }
    return true;
  }

  async function like() {
    if (!(await needLogin())) return;
    const d = await api(`/api/posts/${id}/like`, { method: "POST" });
    setPost({ ...post, liked: d.liked, likeCount: d.likeCount });
  }

  async function collect() {
    if (!(await needLogin())) return;
    const d = await api(`/api/posts/${id}/collect`, { method: "POST" });
    setPost({ ...post, collected: d.collected, collectCount: d.collectCount });
  }

  async function moderate(action) {
    if (!(await needLogin())) return;
    const asks = {
      lock: post?.locked ? "确认解锁该帖？" : "确认锁定该帖？",
      hide: post?.hidden ? "确认取消折叠？" : "确认折叠该帖？",
      delete: "确认删除该帖？删除后无法恢复。"
    };
    if (asks[action] && !window.confirm(asks[action])) return;
    try {
      const d = await api(`/api/posts/${id}/moderate`, { method: "POST", body: { action } });
      if (d.deleted) {
        toast("帖子已删除");
        nav(-1);
        return;
      }
      setPost(d.post);
      toast("已处理");
    } catch (e) {
      toast(e.message);
    }
  }

  async function dropCmt(c) {
    if (!(await needLogin())) return;
    if (!window.confirm("确认删除这条评论？")) return;
    try {
      await api(`/api/comments/${c.id}`, { method: "DELETE" });
      setComments((list) => list.filter((x) => x.id !== c.id));
      toast("评论已删除");
    } catch (e) {
      toast(e.message);
    }
  }

  async function muteAuthor(hours) {
    if (!(await needLogin()) || !post?.author) return;
    const tip = hours ? `确认禁言楼主 ${hours} 小时？` : "确认解除楼主禁言？";
    if (!window.confirm(tip)) return;
    try {
      await api(`/api/boards/${post.board.id}/mute`, { method: "POST", body: { userId: post.author.id, hours } });
      toast(hours ? `已禁言 ${hours} 小时` : "已解除禁言");
    } catch (e) {
      toast(e.message);
    }
  }

  async function likeCmt(c) {
    if (!(await needLogin())) return;
    const d = await api(`/api/comments/${c.id}/like`, { method: "POST" });
    setComments((list) => list.map((x) => (x.id === c.id ? { ...x, liked: d.liked, likeCount: d.likeCount } : x)));
  }

  async function send() {
    if (!(await needLogin())) return;
    if (!text.trim()) return;
    await api(`/api/posts/${id}/comments`, { method: "POST", body: { content: text, parentId: replyTo?.id } });
    setText("");
    setReplyTo(null);
    setEmojiOn(false);
    toast("已回帖，经验 +3");
    const c = await api(`/api/posts/${id}/comments`);
    setComments(c.comments || []);
    setPost({ ...post, commentCount: post.commentCount + 1 });
  }

  function startReply(c) {
    setReplyTo(c || null);
    setEmojiOn(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  async function onImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!(await needLogin())) return;
    const fd = new FormData();
    fd.append("files", file);
    try {
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls && up.urls[0]) || "";
      if (url) setText((t) => `${t}${t ? " " : ""}${url}`);
    } catch (err) {
      toast(err.message);
    }
  }

  if (gone) {
    return (
      <div className="empty empty-gone">
        <p>帖子不存在或已删除</p>
        <button type="button" className="btn btn-fill" onClick={() => nav(-1)}>返回上一页</button>
      </div>
    );
  }
  if (!post) return <div className="empty">帖子展开中...</div>;

  const board = post.board || {};
  const byId = {};
  comments.forEach((c) => { byId[c.id] = c; });
  const roots = comments.filter((c) => !c.parentId);
  const kids = {};
  comments.forEach((c) => {
    if (!c.parentId) return;
    let rid = c.parentId;
    let guard = 0;
    while (byId[rid] && byId[rid].parentId && guard < 8) {
      rid = byId[rid].parentId;
      guard += 1;
    }
    (kids[rid] || (kids[rid] = [])).push(c);
  });
  const fresh = Date.now() - new Date(post.createdAt).getTime() < 36e5;

  return (
    <div className="layout single post-layout">
      <div className="post-detail">
        <div className="thread-head">
          <h1>
            <span>{post.title}</span>
            {fresh ? <span className="badge-new">新</span> : null}
          </h1>
          <div className="thread-sub">
            <Link className="thread-board" to={`/board/${board.id}`}>{board.name || "版块"} ›</Link>
            <span className="thread-counts">
              <EyeIco size={14} /> {post.viewCount}
              <ChatIco size={14} /> {post.commentCount}
            </span>
          </div>
        </div>
        <OpHead author={post.author} time={timeAgo(post.createdAt)} boardId={board.id} region={post.ipRegion} />
        {post.software ? <SoftCard item={post.software} /> : null}
        {post.track ? <TrackChip track={post.track} /> : null}
        {post.content ? <PostBody text={post.content} /> : null}
        {post.images && post.images.length ? (
          <div className="post-imgs">
            {post.images.map((src, i) => (
              <button type="button" key={src} className="img-hit" onClick={() => setView({ images: post.images, index: i })}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="post-acts">
          <button type="button" className={post.liked ? "on" : ""} onClick={like} aria-label="点赞">
            <HeartIco size={16} filled={!!post.liked} /> {post.likeCount || 0}
          </button>
          <button type="button" className={post.collected ? "on" : ""} onClick={collect} aria-label="收藏">
            <StarIco size={16} filled={!!post.collected} /> {post.collectCount || 0}
          </button>
        </div>
        {post.canModerate ? (
          <div className="mod-bar">
            <button type="button" className={post.essence ? "on" : ""} onClick={() => moderate("essence")}>{post.essence ? "取消加精" : "加精"}</button>
            <button type="button" className={post.pinned ? "on" : ""} onClick={() => moderate("pin")}>{post.pinned ? "取消置顶" : "置顶"}</button>
            <button type="button" className={post.locked ? "on" : ""} onClick={() => moderate("lock")}>{post.locked ? "解锁" : "锁帖"}</button>
            <button type="button" className={post.hidden ? "on" : ""} onClick={() => moderate("hide")}>{post.hidden ? "取消折叠" : "折叠"}</button>
            <button type="button" onClick={() => moderate("delete")}>删帖</button>
            <select className="mod-mute" defaultValue="" onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v !== "") muteAuthor(Number(v)); }}>
              <option value="">禁言楼主</option>
              <option value="1">1 小时</option>
              <option value="24">1 天</option>
              <option value="168">7 天</option>
              <option value="0">解除禁言</option>
            </select>
          </div>
        ) : null}
        {post.locked ? <div className="lock-tip">本帖已锁定，只能围观</div> : null}
        <h3 className="cmt-title">评论 {comments.length}</h3>
        {roots.map((c) => {
          const replies = kids[c.id] || [];
          const shown = openKids[c.id] ? replies : replies.slice(0, 2);
          const rest = replies.length - shown.length;
          const authorHit = replies.some((r) => post.author && r.author && r.author.id === post.author.id);
          return (
            <div className="xhs-thread" key={c.id}>
              <CmtRow c={c} isOp={!!(post.author && c.author && c.author.id === post.author.id)} boardId={board.id} onReply={startReply} onLike={likeCmt} onDelete={dropCmt} canCut={!!(post.canModerate || (user && c.author && user.id === c.author.id))} onPic={(src) => setView({ images: [src], index: 0 })} />
              {authorHit ? <div className="author-replied">楼主已回复</div> : null}
              {shown.map((r) => {
                const parent = byId[r.parentId];
                const parentName = parent && parent.id !== c.id ? (parent.author || GHOST).nickname : "";
                return <CmtRow key={r.id} c={r} child parentName={parentName} isOp={!!(post.author && r.author && r.author.id === post.author.id)} boardId={board.id} onReply={startReply} onLike={likeCmt} onDelete={dropCmt} canCut={!!(post.canModerate || (user && r.author && user.id === r.author.id))} onPic={(src) => setView({ images: [src], index: 0 })} />;
              })}
              {rest > 0 ? (
                <button type="button" className="expand-replies" onClick={() => setOpenKids((m) => ({ ...m, [c.id]: true }))}>
                  展开 {rest} 条回复
                </button>
              ) : null}
            </div>
          );
        })}
        {roots.length === 0 ? <div className="empty">还没有评论，来坐沙发</div> : null}
      </div>
      <div className="comment-dock">
        {replyTo ? (
          <div className="reply-chip">
            回复 {(replyTo.author && replyTo.author.nickname) || "楼友"}
            <button type="button" className="iconbtn" onClick={() => setReplyTo(null)}>取消</button>
          </div>
        ) : null}
        {emojiOn ? (
          <div className="emoji-strip">
            {EMOJIS.map((e) => (
              <button type="button" key={e} onClick={() => setText((t) => t + e)}>{e}</button>
            ))}
          </div>
        ) : null}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImage} />
        <div className="cmt-pill">
          <input
            ref={inputRef}
            className="cmt-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={post.locked ? "帖子已锁定" : (replyTo ? `回复 ${(replyTo.author && replyTo.author.nickname) || "楼友"}` : "发条评论，和大家一起讨论")}
            disabled={!!post.locked}
          />
          <button type="button" className="cmt-ico" onClick={() => fileRef.current && fileRef.current.click()} aria-label="图片">
            <CameraIco size={20} />
          </button>
          <button type="button" className="cmt-ico" onClick={() => setEmojiOn((v) => !v)} aria-label="表情">
            <SmileIco size={20} />
          </button>
          {text.trim() ? (
            <button type="button" className="cmt-send" onClick={send}>发送</button>
          ) : null}
        </div>
      </div>
      <Lightbox images={view.images} index={view.index} onClose={() => setView({ images: [], index: -1 })} onIndex={(i) => setView((v) => ({ ...v, index: i }))} />
    </div>
  );
}
