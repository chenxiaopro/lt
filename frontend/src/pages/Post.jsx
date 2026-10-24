import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, timeAgo, pushHistory, removeHistory } from "../api.js";
import { useAuth } from "../context.jsx";
import { FloorWho, UserAvatar, BubbleSkin } from "../components/Dress.jsx";
import { TitleBadges, TitleText, TipList, TipStrip } from "../components/PostCard.jsx";
import { CameraIco, ChatIco, EyeIco, GiftIco, HeartIco, SmileIco, StarIco } from "../icons.jsx";
import Lightbox from "../components/Lightbox.jsx";
import SoftCard from "../components/SoftCard.jsx";
import VideoPlayer from "../components/VideoPlayer.jsx";
import { TrackChip } from "./Music.jsx";

const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "🍀", "💚", "🥺", "😎", "🤝"];

function CommentText({ text, className, onPic }) {
  const parts = String(text || "").split(/(\/uploads\/[^\s]+)/g);
  return (
    <span className={className || undefined}>
      {parts.map((p, i) =>
        p.startsWith("/uploads/") ? (
          <button type="button" className="cmt-img-btn" key={i} onClick={(e) => { e.stopPropagation(); onPic && onPic(p); }}>
            <img className="cmt-img" src={p} alt="" loading="lazy" decoding="async" />
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

function escapeRe(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function PostBody({ text, mentions }) {
  const names = (mentions || []).map((m) => m.nickname).filter(Boolean);
  const at = names.length ? `@${names.map(escapeRe).join("|@")}|` : "";
  let raw = String(text || "");
  (mentions || []).forEach((m) => {
    if (!m || !m.nickname) return;
    raw = raw.replace(new RegExp(`@${escapeRe(m.nickname)}(?=\\s|$|@|[，。！？,!?])`, "g"), "");
  });
  raw = raw.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const parts = raw.split(new RegExp(`(${at}\\/soft\\/\\d+|https?:\\/\\/[^\\s]+)`, "g"));
  return (
    <div className="post-body">
      {parts.map((p, i) => {
        if (/^\/soft\/\d+$/.test(p)) return <Link key={i} className="soft-link" to={p}>软件 #{p.slice(6)}</Link>;
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>;
        if (p.startsWith("@")) {
          const nick = p.slice(1);
          const u = (mentions || []).find((m) => m.nickname === nick);
          return u ? <Link key={i} className="mention-link" to={`/user/${u.id}`}>{p}</Link> : <span key={i}>{p}</span>;
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

function OpHead({ author, time, boardId, region, certified, certifiedAt }) {
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
        {certified ? (
          <span className="mod-stamp">
            <b>版主认证</b>
            <em>{String(certifiedAt || "").slice(0, 10)}</em>
          </span>
        ) : null}
        <span className="hx-floor-time">{time}{region ? ` · ${region}` : ""}</span>
      </div>
    </div>
  );
}

function CmtRow({ c, child, parentName, onReply, onLike, onTip, onTips, onMenu, onDelete, canCut, onPic, isOp, boardId, canGift }) {
  const a = c.author || GHOST;
  const hold = React.useRef(0);
  function startHold() {
    clearTimeout(hold.current);
    hold.current = setTimeout(() => onMenu && onMenu(c), 480);
  }
  function endHold() {
    clearTimeout(hold.current);
  }
  return (
    <div className={`xhs-cmt${child ? " child" : ""}`} id={`cmt-${c.id}`}>
      <div className="xhs-avcol">
        {a.id ? (
          <Link to={`/user/${a.id}`} className="xhs-av"><UserAvatar user={a} size="sm" /></Link>
        ) : (
          <span className="xhs-av"><UserAvatar user={a} size="sm" /></span>
        )}
        {isOp ? <span className="op-mark">楼主</span> : null}
        {c.floor ? <span className="hx-floor-no">{c.floor}楼</span> : null}
        {c.pinned ? <span className="pin-cmt">顶</span> : null}
      </div>
      <div className="xhs-main">
        <FloorWho user={a} boardId={boardId} muted />
        <BubbleSkin
          className="xhs-text"
          bubble={a.dress && a.dress.bubble}
          onClick={() => onReply(c)}
          onContextMenu={(e) => { e.preventDefault(); onMenu && onMenu(c); }}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onTouchMove={endHold}
          role="presentation"
        >
          {parentName ? <span className="reply-at">回复 {parentName}：</span> : null}
          {c.quote ? (
            <div className="cmt-quote">
              <em>{c.quote.name} · {c.quote.floor}楼</em>
              <span>{c.quote.snippet}</span>
            </div>
          ) : null}
          <CommentText text={c.content} onPic={onPic} />
        </BubbleSkin>
        <TipStrip tips={c.tipGivers} compact onOpen={() => onTips && onTips(c.tipGivers)} />
        <div className="xhs-meta">
          <span>
            {timeAgo(c.createdAt)}
            {c.editedAt ? <span className="cmt-edited">已编辑</span> : null}
            {c.ipRegion ? ` · IP属地 ${c.ipRegion}` : ""}
            <button type="button" className="xhs-reply" onClick={() => onReply(c)}>回复</button>
            {canCut ? <button type="button" className="xhs-reply danger" onClick={() => onDelete(c)}>删除</button> : null}
          </span>
        </div>
      </div>
      <div className="xhs-side">
        <button type="button" className={`xhs-heart cmt-like${c.liked ? " on" : ""}`} onClick={() => onLike(c)} aria-label="点赞">
          <HeartIco size={24} filled={!!c.liked} />
          {c.likeCount ? <span>{c.likeCount}</span> : null}
        </button>
        {canGift ? (
          <button type="button" className="xhs-heart tip-act" onClick={() => onTip && onTip(c)} aria-label="打赏">
            <GiftIco size={20} />
            <span>赏{c.tipCount ? ` ${c.tipCount}` : ""}</span>
          </button>
        ) : (c.tipCount ? <span className="xhs-heart tip-act"><GiftIco size={20} /><span>赏 {c.tipCount}</span></span> : null)}
      </div>
    </div>
  );
}

export default function Post() {
  const { id } = useParams();
  const { user, toast, setUser } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
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
  const [tipOn, setTipOn] = useState(false);
  const [tipAmt, setTipAmt] = useState(1);
  const [tipReason, setTipReason] = useState("");
  const [tipBusy, setTipBusy] = useState(false);
  const [tipTarget, setTipTarget] = useState(null);
  const [tipErr, setTipErr] = useState("");
  const [sheet, setSheet] = useState(null);
  const [listTips, setListTips] = useState(null);
  const [shareOn, setShareOn] = useState(false);
  const [editOn, setEditOn] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editBoard, setEditBoard] = useState("");
  const [boardOpts, setBoardOpts] = useState([]);

  const [opOnly, setOpOnly] = useState(false);
  const [onlyUser, setOnlyUser] = useState(null);
  const [cmtMore, setCmtMore] = useState(false);
  const [cmtOff, setCmtOff] = useState(0);
  const [reportOn, setReportOn] = useState(null);
  const [reportReason, setReportReason] = useState("垃圾广告");
  const [reportDetail, setReportDetail] = useState("");
  const [pollPick, setPollPick] = useState([]);
  const [paidBusy, setPaidBusy] = useState(false);
  const [cmtOrder, setCmtOrder] = useState("asc");
  const [quoteTo, setQuoteTo] = useState(null);
  const [jumpVal, setJumpVal] = useState("");
  const [editCmt, setEditCmt] = useState(null);
  const [cmtQ, setCmtQ] = useState("");
  const [cmtHits, setCmtHits] = useState(null);
  const [cmtKey, setCmtKey] = useState("");

  async function load() {
    try {
      const p = await api(`/api/posts/${id}`);
      setGone(false);
      setPost(p.post);
      pushHistory(p.post);
      setOpOnly(false);
      setOnlyUser(null);
      setCmtOff(0);
      await loadComments({ more: false });
    } catch (e) {
      setPost(null);
      setComments([]);
      setGone(true);
      removeHistory(id);
      throw e;
    }
  }

  async function loadComments({ more, onlyOp, onlyId, offset, order, jump }) {
    const off = more ? (offset ?? cmtOff) : 0;
    const ord = order || cmtOrder;
    const idQ = onlyId ? `&onlyId=${onlyId}` : onlyOp ? "&opOnly=1" : "";
    const c = await api(`/api/posts/${id}/comments?limit=30&offset=${off}${idQ}${ord === "desc" ? "&order=desc" : ""}${jump ? `&jump=${jump}` : ""}`);
    const list = c.comments || [];
    setComments((prev) => {
      if (!more) return list;
      const seen = new Set(prev.map((x) => x.id));
      return prev.concat(list.filter((x) => !seen.has(x.id)));
    });
    const usedOff = Number(c.offset != null ? c.offset : off);
    const roots = list.filter((x) => !x.parentId).length;
    setCmtOff(usedOff + roots);
    setCmtMore(!!c.hasMore);
    return c;
  }

  function flashCmt(cid, list) {
    const by = {};
    (list || comments).forEach((x) => { by[x.id] = x; });
    const hit = by[cid];
    if (hit && hit.parentId) {
      let rid = hit.parentId;
      let g = 0;
      while (by[rid] && by[rid].parentId && g < 8) {
        rid = by[rid].parentId;
        g += 1;
      }
      setOpenKids((m) => (m[rid] ? m : { ...m, [rid]: true }));
    }
    setTimeout(() => {
      const el = document.getElementById(`cmt-${cid}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("cmt-flash");
    }, 80);
  }

  async function jumpTo(raw) {
    const floor = Number(raw);
    if (!floor) {
      toast("请输入楼层");
      return;
    }
    try {
      const c = await loadComments({ more: false, onlyOp: opOnly, onlyId: onlyUser && onlyUser.id, jump: floor });
      if (c && c.jumpId) flashCmt(c.jumpId, c.comments || []);
    } catch (e) {
      toast(e.message);
    }
  }

  async function searchCmts(e) {
    if (e) e.preventDefault();
    const key = cmtQ.trim();
    if (!key) {
      setCmtHits(null);
      setCmtKey("");
      return;
    }
    try {
      const d = await api(`/api/posts/${id}/comments/search?q=${encodeURIComponent(key)}`);
      setCmtHits(d.results || []);
      setCmtKey(d.key || key);
    } catch (err) {
      toast(err.message);
    }
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, [id]);

  useEffect(() => {
    if (!post?.canMove) return;
    api("/api/boards").then((d) => setBoardOpts(d.boards || [])).catch(() => setBoardOpts([]));
  }, [post?.canMove]);

  useEffect(() => {
    const cid = Number(sp.get("c") || 0);
    if (!cid || !comments.length) return undefined;
    const by = {};
    comments.forEach((c) => { by[c.id] = c; });
    const hit = by[cid];
    if (!hit) return undefined;
    if (hit.parentId) {
      let rid = hit.parentId;
      let g = 0;
      while (by[rid] && by[rid].parentId && g < 8) {
        rid = by[rid].parentId;
        g += 1;
      }
      setOpenKids((m) => (m[rid] ? m : { ...m, [rid]: true }));
    }
    const t = setTimeout(() => {
      const el = document.getElementById(`cmt-${cid}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("cmt-flash");
    }, 160);
    return () => clearTimeout(t);
  }, [comments, sp]);

  async function needLogin() {
    if (!user) {
      nav("/login");
      return false;
    }
    return true;
  }

  async function like() {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/like`, { method: "POST" });
      setPost({ ...post, liked: d.liked, likeCount: d.likeCount });
    } catch (e) {
      toast(e.message);
    }
  }

  async function collect() {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/collect`, { method: "POST" });
      setPost({ ...post, collected: d.collected, collectCount: d.collectCount });
    } catch (e) {
      toast(e.message);
    }
  }

  function openTip(kind, comment) {
    if (!user) return nav("/login");
    setTipTarget({ kind, comment: comment || null });
    setTipAmt(kind === "user" ? 1 : 10);
    setTipReason("");
    setTipErr("");
    setTipOn(true);
  }

  async function sendTip() {
    if (!(await needLogin())) return;
    if (tipBusy) return;
    const kind = (tipTarget && tipTarget.kind) || "user";
    const comment = tipTarget && tipTarget.comment;
    if (kind === "user") {
      const why = String(tipReason || "").trim();
      if (why.length < 5 || why.length > 30) {
        setTipErr("理由需 5 到 30 个字符");
        return;
      }
      if ((user.gourd || 0) < Number(tipAmt)) {
        setTipErr("葫芦不足");
        return;
      }
    } else {
      const n = Math.floor(Number(tipAmt));
      if (!Number.isFinite(n) || n < 1 || n > 9999) {
        setTipErr("数量需为 1 到 9999");
        return;
      }
    }
    setTipErr("");
    setTipBusy(true);
    try {
      if (kind === "user") {
        const path = comment ? `/api/comments/${comment.id}/tip` : `/api/posts/${id}/tip`;
        const d = await api(path, { method: "POST", body: { amount: tipAmt, reason: tipReason } });
        if (typeof d.gourd === "number") setUser((u) => (u ? { ...u, gourd: d.gourd } : u));
        if (d.post) setPost(d.post);
        else if (!comment) setPost({ ...post, tipCount: d.tipCount });
        if (comment && d.comment) {
          setComments((list) => list.map((x) => (x.id === comment.id ? { ...x, ...d.comment } : x)));
        } else if (comment) {
          setComments((list) => list.map((x) => (x.id === comment.id ? { ...x, tipCount: d.tipCount } : x)));
        }
        toast(`已赠送 ${tipAmt} 葫芦`);
      } else {
        const d = await api(`/api/posts/${id}/gourd`, {
          method: "POST",
          body: { action: kind, amount: tipAmt, reason: tipReason, commentId: comment ? comment.id : 0 }
        });
        if (d.post) setPost(d.post);
        if (d.comment) setComments((list) => list.map((x) => (x.id === d.comment.id ? { ...x, ...d.comment } : x)));
        toast(kind === "deduct" ? `已扣除 ${tipAmt} 葫芦` : `已赏 ${tipAmt} 葫芦`);
      }
      setTipOn(false);
      setTipReason("");
      setTipTarget(null);
    } catch (e) {
      setTipErr(e.message || "操作失败");
    } finally {
      setTipBusy(false);
    }
  }

  async function moderate(action, extra) {
    if (!(await needLogin())) return;
    const asks = {
      lock: post?.locked ? "确认解锁该帖？" : "确认锁定该帖？",
      hide: post?.hidden ? "确认取消折叠？" : "确认折叠该帖？",
      delete: "确认删除该帖？将进入回收站。",
      restore: "确认还原该帖？",
      purge: "确认彻底删除？此操作不可恢复。",
      bump: "确认提升该帖到最新回复最前？"
    };
    if (asks[action] && !window.confirm(asks[action])) return;
    try {
      const d = await api(`/api/posts/${id}/moderate`, { method: "POST", body: { action, ...(extra || {}) } });
      if (d.deleted) {
        toast(d.trashed ? "已移入回收站" : "帖子已彻底删除");
        nav(-1);
        return;
      }
      setPost(d.post);
      toast(action === "restore" ? "已还原" : action === "bump" ? "已提升" : "已处理");
    } catch (e) {
      toast(e.message);
    }
  }

  async function moveTo(boardId) {
    if (!boardId) return;
    if (!(await needLogin())) return;
    if (!window.confirm("确认移动该帖到所选版块？")) return;
    try {
      const d = await api(`/api/posts/${id}/move`, { method: "POST", body: { boardId: Number(boardId) } });
      setPost(d.post);
      toast("已移动");
    } catch (e) {
      toast(e.message);
    }
  }

  async function dropCmt(c) {
    if (!(await needLogin())) return;
    if (!window.confirm("确认删除这条评论？")) return;
    try {
      const d = await api(`/api/comments/${c.id}`, { method: "DELETE" });
      const gone = new Set(d.ids || [c.id]);
      setComments((list) => list.filter((x) => !gone.has(x.id)));
      if (d.removed && post) setPost({ ...post, commentCount: Math.max(0, (post.commentCount || 0) - d.removed) });
      toast("评论已删除");
    } catch (e) {
      toast(e.message);
    }
  }

  async function pinCmt(c) {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/comments/${c.id}/pin`, { method: "POST" });
      toast(d.comment && d.comment.pinned ? "已置顶" : "已取消置顶");
      await loadComments({ more: false, onlyOp: opOnly });
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveCmt() {
    if (!editCmt) return;
    const content = String(editCmt.content || "").trim();
    if (!content) {
      toast("评论不能为空");
      return;
    }
    try {
      const d = await api(`/api/comments/${editCmt.id}`, { method: "PUT", body: { content } });
      setComments((list) => list.map((x) => (x.id === d.comment.id ? { ...x, ...d.comment } : x)));
      setEditCmt(null);
      toast("评论已更新");
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
    try {
      const d = await api(`/api/comments/${c.id}/like`, { method: "POST" });
      setComments((list) => list.map((x) => (x.id === c.id ? { ...x, liked: d.liked, likeCount: d.likeCount } : x)));
    } catch (e) {
      toast(e.message);
    }
  }

  async function send() {
    if (!(await needLogin())) return;
    if (!text.trim()) return;
    try {
      const d = await api(`/api/posts/${id}/comments`, {
        method: "POST",
        body: { content: text, parentId: replyTo && replyTo.id, quoteId: quoteTo && quoteTo.id }
      });
      setText("");
      setReplyTo(null);
      setQuoteTo(null);
      setEmojiOn(false);
      toast("已回帖，经验 +3");
      if (d.comment) {
        setComments((prev) => {
          if (prev.some((x) => x.id === d.comment.id)) return prev;
          return cmtOrder === "desc" ? [d.comment, ...prev] : prev.concat(d.comment);
        });
      }
      if (d.post) setPost(d.post);
    } catch (e) {
      toast(e.message);
    }
  }

  function startReply(c) {
    setReplyTo(c || null);
    setQuoteTo(null);
    setEmojiOn(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  async function sendReport() {
    if (!(await needLogin())) return;
    try {
      await api("/api/reports", {
        method: "POST",
        body: {
          targetType: reportOn && reportOn.kind === "comment" ? "comment" : "post",
          targetId: reportOn && reportOn.kind === "comment" ? reportOn.comment.id : Number(id),
          reason: reportReason,
          detail: reportDetail
        }
      });
      setReportOn(null);
      setReportDetail("");
      toast("已提交");
    } catch (e) {
      toast(e.message);
    }
  }

  async function voteNow() {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/vote`, { method: "POST", body: { optionIds: pollPick } });
      setPost(d.post);
      toast("已投票");
    } catch (e) {
      toast(e.message);
    }
  }

  async function adoptCmt(c) {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/adopt`, { method: "POST", body: { commentId: c.id } });
      setPost(d.post);
      toast("已采纳");
    } catch (e) {
      toast(e.message);
    }
  }

  async function joinAct() {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/join`, { method: "POST" });
      setPost(d.post);
      if (typeof d.gourd === "number") setUser((u) => (u ? { ...u, gourd: d.gourd } : u));
      toast(d.joined ? "已报名" : "已取消报名");
    } catch (e) {
      toast(e.message);
    }
  }

  async function grabPacket() {
    if (!(await needLogin())) return;
    try {
      const d = await api(`/api/posts/${id}/redpacket`, { method: "POST" });
      setPost(d.post);
      if (typeof d.gourd === "number") setUser((u) => (u ? { ...u, gourd: d.gourd } : u));
      toast(`抢到 ${d.amount} 葫芦`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function unlockPaid() {
    if (!(await needLogin())) return;
    if (paidBusy) return;
    setPaidBusy(true);
    try {
      const d = await api(`/api/posts/${id}/unlock`, { method: "POST" });
      setPost(d.post);
      if (typeof d.gourd === "number") setUser((u) => (u ? { ...u, gourd: d.gourd } : u));
      toast(`已解锁，支付 ${d.price} 葫芦`);
    } catch (e) {
      toast(e.message);
    } finally {
      setPaidBusy(false);
    }
  }

  function copyText(s) {
    const t = String(s || "").replace(/\/uploads\/[^\s]+/g, "[图片]");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(() => toast("已复制")).catch(() => toast("复制失败"));
    } else toast("复制失败");
  }

  function openEdit() {
    if (!post) return;
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditBoard(String(post.board?.id || ""));
    setEditOn(true);
    if (post.canMove) {
      api("/api/boards").then((d) => setBoardOpts(d.boards || [])).catch(() => setBoardOpts([]));
    }
  }

  async function saveEdit() {
    try {
      const body = { title: editTitle, content: editContent };
      if (post.canMove && editBoard) body.boardId = Number(editBoard);
      const d = await api(`/api/posts/${id}`, { method: "PUT", body });
      setPost(d.post);
      setEditOn(false);
      toast("帖子已更新");
    } catch (e) {
      toast(e.message);
    }
  }

  function shareUrl() {
    return `${window.location.origin}/post/${id}`;
  }

  function absUrl(u) {
    const s = String(u || "");
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    return `${window.location.origin}${s.startsWith("/") ? "" : "/"}${s}`;
  }

  function shareXml() {
    const url = shareUrl();
    const pic = absUrl((post.images && post.images[0]) || (post.author && post.author.avatar) || "");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<msg>\n  <item showtype="0">\n    <title><![CDATA[${post.title || "青葫三楼"}]]></title>\n    <summary><![CDATA[${String(post.content || "").slice(0, 80)}]]></summary>\n    <url><![CDATA[${url}]]></url>\n    <picture><![CDATA[${pic}]]></picture>\n  </item>\n</msg>`;
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
            <span className="post-title">
              <TitleBadges post={post} />
              <TitleText post={post} />
            </span>
            {post.tipCount > 0 ? <span className="badge-plus">+{post.tipCount}</span> : null}
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
        {post.trashed ? (
          <div className="trash-banner">
            本帖在回收站
            {post.canModerate ? (
              <>
                <button type="button" onClick={() => moderate("restore")}>还原</button>
                <button type="button" onClick={() => moderate("purge")}>彻底删除</button>
              </>
            ) : null}
          </div>
        ) : null}
        <OpHead author={post.author} time={timeAgo(post.createdAt)} boardId={board.id} region={post.ipRegion} certified={post.certified} certifiedAt={post.certifiedAt} />
        {post.software ? <SoftCard item={post.software} /> : null}
        {post.track ? <TrackChip track={post.track} /> : null}
        {post.content ? <PostBody text={post.content} mentions={post.mentions} /> : null}
        {post.paid ? (
          <div className={`thread-box paid-box${post.paid.canView ? " open" : ""}`}>
            <div className="paid-head">
              <span className="paid-ico">费</span>
              <div className="grow">
                <b>付费内容</b>
                <p className="hint">
                  {post.paid.isOp
                    ? "你是楼主，已解锁"
                    : post.paid.purchased
                      ? "已解锁"
                      : `${post.paid.sales} 人已解锁`}
                </p>
              </div>
              <span className="paid-price">{post.paid.price} 葫芦</span>
            </div>
            {post.paid.canView ? (
              <p className="paid-body">{post.paid.text}</p>
            ) : (
              <div className="paid-lock">
                <p>支付 {post.paid.price} 葫芦后查看完整内容</p>
                <button type="button" className="btn btn-fill touch-act paid-btn" disabled={paidBusy} onClick={unlockPaid}>
                  {paidBusy ? "解锁中..." : user ? `支付 ${post.paid.price} 葫芦解锁` : "登录后解锁"}
                </button>
                {user ? <span className="hint">余额 {user.gourd || 0} 葫芦</span> : null}
              </div>
            )}
          </div>
        ) : null}
        {post.hasHide ? (
          <div className={`thread-box hide-box${post.hideLocked ? " locked" : ""}`}>
            <b>回复可见</b>
            {post.hideLocked ? <p className="hint">回复后可见隐藏内容</p> : <p className="hide-body">{post.hideText}</p>}
          </div>
        ) : null}
        {post.mentions && post.mentions.length ? (
          <div className="mention-bar">
            @ {post.mentions.map((u, i) => (
              <span key={u.id}>{i ? "、" : null}<Link to={`/user/${u.id}`}>{u.nickname}</Link></span>
            ))}
          </div>
        ) : null}
        {post.images && post.images.length ? (
          <div className={`post-imgs n${Math.min(9, post.images.length)}`}>
            {post.images.map((src, i) => (
              <button type="button" key={src} className="img-hit" onClick={() => setView({ images: post.images, index: i })}>
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}
        {post.videos && post.videos.length ? (
          <div className={`post-videos n${Math.min(3, post.videos.length)}`}>
            {post.videos.map((src) => <VideoPlayer key={src} src={src} />)}
          </div>
        ) : null}
        <TipStrip tips={post.tipGivers} onOpen={() => setListTips(post.tipGivers || [])} />
        <div className="post-acts">
          <button type="button" className={post.liked ? "on" : ""} onClick={like} aria-label="点赞">
            <HeartIco size={16} filled={!!post.liked} /> {post.likeCount || 0}
          </button>
          <button type="button" className={post.collected ? "on" : ""} onClick={collect} aria-label="收藏">
            <StarIco size={16} filled={!!post.collected} /> {post.collectCount || 0}
          </button>
          {!(user && post.author && user.id === post.author.id) ? (
            <button type="button" className="tip-act big-tip" onClick={() => openTip("user")} aria-label="打赏">
              <GiftIco size={16} /> 赏 {post.tipCount || 0}
            </button>
          ) : (post.tipCount ? <span className="tip-count-plain tip-act"><GiftIco size={16} /> 赏 {post.tipCount}</span> : null)}
          <button type="button" onClick={() => setShareOn(true)}>分享</button>
          {post.canEdit ? <button type="button" onClick={openEdit}>编辑</button> : null}
          <button type="button" className="touch-act" onClick={() => user ? setReportOn({ kind: "post" }) : nav("/login")}>举报</button>
        </div>
        {post.poll ? (
          <div className="thread-box">
            <b>投票{post.poll.multi ? " · 可多选" : " · 单选"}</b>
            {(post.poll.options || []).map((o) => (
              <label key={o.id} className="poll-opt">
                {post.poll.voted ? null : (
                  <input
                    type={post.poll.multi ? "checkbox" : "radio"}
                    name="poll"
                    checked={pollPick.includes(o.id)}
                    onChange={() => {
                      if (post.poll.multi) setPollPick((list) => list.includes(o.id) ? list.filter((x) => x !== o.id) : [...list, o.id]);
                      else setPollPick([o.id]);
                    }}
                  />
                )}
                <span>{o.text}</span>
                {post.poll.voted ? <em>{o.count} 票 · {o.percent}%</em> : null}
              </label>
            ))}
            {post.poll.voted ? <p className="hint">已投 {post.poll.total} 票</p> : <button type="button" className="btn btn-fill touch-act" onClick={voteNow}>投票</button>}
          </div>
        ) : null}
        {post.reward ? (
          <div className="thread-box">
            <b>悬赏 {post.reward.amount} 葫芦</b>
            <p className="hint">{post.reward.status === "open" ? "进行中，楼主可采纳回复" : post.reward.status === "adopted" ? "已采纳" : "已退回"}</p>
          </div>
        ) : null}
        {post.activity ? (
          <div className="thread-box">
            <b>活动</b>
            <p>{post.activity.place} · {String(post.activity.startAt || "").replace("T", " ")}</p>
            <p className="hint">{post.activity.count}/{post.activity.maxNum} 人{post.activity.fee ? ` · 报名费 ${post.activity.fee} 葫芦` : ""}</p>
            {(post.activity.members || []).length ? (
              <p className="hint">名单 {(post.activity.members || []).map((m) => m.nickname).join("、")}</p>
            ) : null}
            <button type="button" className="btn btn-fill touch-act" onClick={joinAct}>{post.activity.joined ? "取消报名" : "报名"}</button>
          </div>
        ) : null}
        {post.redpacket ? (
          <div className={`thread-box redpacket-box ${post.redpacket.status}`}>
            <div className="rp-main">
              <span className="rp-ico">葫</span>
              <div className="rp-copy">
                <b>{post.redpacket.blessing || "恭喜发财，大吉大利"}</b>
                <p className="hint">
                  共 {post.redpacket.amount} 葫芦 · {post.redpacket.count} 个 · 已领 {post.redpacket.claimedCount} 个
                </p>
                <p className="hint">
                  {post.redpacket.status === "refunded"
                    ? "已过期，剩余葫芦已退回楼主"
                    : post.redpacket.status === "done" || post.redpacket.remainCount <= 0
                      ? "红包已领完"
                      : `剩余 ${post.redpacket.remainCount} 个，共 ${post.redpacket.remainAmount} 葫芦`}
                </p>
              </div>
            </div>
            {post.redpacket.isOp ? (
              <span className="rp-state">我发出的红包</span>
            ) : post.redpacket.claimed ? (
              <span className="rp-state">已领取 {post.redpacket.myAmount} 葫芦</span>
            ) : post.redpacket.canClaim ? (
              <button type="button" className="btn btn-fill touch-act rp-btn" onClick={grabPacket}>抢红包</button>
            ) : !user && post.redpacket.status === "open" ? (
              <button type="button" className="btn btn-fill touch-act rp-btn" onClick={grabPacket}>登录后领取</button>
            ) : (
              <span className="rp-state">已结束</span>
            )}
            {(post.redpacket.claims || []).length ? (
              <p className="hint rp-claims">
                {(post.redpacket.claims || []).map((c) => `${c.nickname} ${c.amount}`).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {post.canModerate && !post.trashed ? (
          <div className="mod-bar">
            <button type="button" className={post.essence ? "on" : ""} onClick={() => moderate("essence")}>{post.essence ? "取消加精" : "加精"}</button>
            <button type="button" className={post.hot ? "on" : ""} onClick={() => moderate("hot")}>{post.hot ? "取消热帖" : "设为热帖"}</button>
            <button type="button" className={post.certified ? "on" : ""} onClick={() => moderate("certify")}>{post.certified ? "取消认证" : "版主认证"}</button>
            <button type="button" className={post.pinned ? "on" : ""} onClick={() => moderate("pin")}>{post.pinned ? "取消置顶" : "置顶"}</button>
            {post.canOfficial ? (
              <button type="button" className={post.official ? "on" : ""} onClick={() => moderate("official")}>{post.official ? "取消公告" : "全站公告"}</button>
            ) : null}
            {post.canOfficial ? (
              <>
                <button type="button" onClick={() => openTip("award")}>赏葫芦</button>
                <button type="button" onClick={() => openTip("deduct")}>扣葫芦</button>
              </>
            ) : null}
            <button type="button" className={post.locked ? "on" : ""} onClick={() => moderate("lock")}>{post.locked ? "解锁" : "锁帖"}</button>
            <button type="button" className={post.hidden ? "on" : ""} onClick={() => moderate("hide")}>{post.hidden ? "取消折叠" : "折叠"}</button>
            <button type="button" onClick={() => moderate("delete")}>删帖</button>
            <select className="mod-mute" value={post.highlight || ""} onChange={(e) => moderate("highlight", { color: e.target.value })}>
              <option value="">高亮</option>
              <option value="red">红</option>
              <option value="orange">橙</option>
              <option value="green">绿</option>
              <option value="blue">蓝</option>
              <option value="purple">紫</option>
            </select>
            <button type="button" className={post.bumpedAt ? "on" : ""} onClick={() => moderate("bump")}>提升</button>
            <button type="button" className={post.sunk ? "on" : ""} onClick={() => moderate("sink")}>{post.sunk ? "取消下沉" : "下沉"}</button>
            <select className="mod-mute" value="" onChange={(e) => { const v = e.target.value; e.target.value = ""; moveTo(Number(v)); }}>
              <option value="">移动</option>
              {boardOpts
                .filter((b) => b.id !== post.board?.id && (user?.isAdmin || (user?.modBoardIds || []).includes(b.id)))
                .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
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
        {post.trashed ? <div className="lock-tip">本帖在回收站，还原后才能回复</div> : null}
        <h3 className="cmt-title">
          评论 {post.commentCount || comments.length}
          <span className="cmt-tools">
          <button type="button" className={`touch-act op-only${opOnly ? " on" : ""}`} onClick={async () => {
            const next = !opOnly;
            setOnlyUser(null);
            setOpOnly(next);
            setCmtOff(0);
            try {
              await loadComments({ more: false, onlyOp: next });
            } catch (e) {
              toast(e.message);
            }
          }}>{opOnly ? "看全部" : "只看楼主"}</button>
          {onlyUser ? (
            <button type="button" className="touch-act op-only on" onClick={async () => {
              setOnlyUser(null);
              setCmtOff(0);
              try {
                await loadComments({ more: false });
              } catch (e) {
                toast(e.message);
              }
            }}>只看 {onlyUser.nickname} ×</button>
          ) : null}
          <button type="button" className={`touch-act op-only${cmtOrder === "desc" ? " on" : ""}`} onClick={async () => {
            const next = cmtOrder === "desc" ? "asc" : "desc";
            setCmtOrder(next);
            setCmtOff(0);
            try {
              await loadComments({ more: false, onlyOp: opOnly, order: next });
            } catch (e) {
              toast(e.message);
            }
          }}>{cmtOrder === "desc" ? "正序" : "倒序"}</button>
          </span>
        </h3>
        <div className="cmt-nav-row">
          <form className="cmt-jump" onSubmit={(e) => { e.preventDefault(); jumpTo(jumpVal); }}>
            <input className="cmt-jump-input" inputMode="numeric" value={jumpVal} onChange={(e) => setJumpVal(e.target.value.replace(/[^\d]/g, "").slice(0, 8))} placeholder="楼层" aria-label="跳到楼层" />
            <button type="submit" className="touch-act op-only">跳楼</button>
          </form>
          <form className="cmt-search" onSubmit={searchCmts}>
            <input className="cmt-search-input" value={cmtQ} maxLength={30} onChange={(e) => setCmtQ(e.target.value)} placeholder="搜本楼评论" aria-label="搜索评论" />
            <button type="submit" className="touch-act op-only">搜索</button>
          </form>
        </div>
        {cmtHits ? (
          <div className="cmt-hits">
            <div className="cmt-hits-head">
              <span>“{cmtKey}” 命中 {cmtHits.length} 条</span>
              <button type="button" className="touch-act" onClick={() => { setCmtHits(null); setCmtQ(""); setCmtKey(""); }}>关闭</button>
            </div>
            {cmtHits.length ? cmtHits.map((h) => (
              <button type="button" className="cmt-hit" key={h.id} onClick={async () => { await jumpTo(h.floor); setCmtHits(null); }}>
                <em>{h.floor}楼</em>
                <span className="cmt-hit-name">{(h.author && h.author.nickname) || "楼友"}</span>
                <span className="cmt-hit-text">{h.snippet}</span>
              </button>
            )) : <div className="hint">没找到相关评论</div>}
          </div>
        ) : null}
        {roots.map((c) => {
          const replies = kids[c.id] || [];
          const shown = openKids[c.id] ? replies : replies.slice(0, 2);
          const rest = replies.length - shown.length;
          const authorHit = replies.some((r) => post.author && r.author && r.author.id === post.author.id);
          return (
            <div className="xhs-thread" key={c.id}>
              <CmtRow c={c} isOp={!!(post.author && c.author && c.author.id === post.author.id)} boardId={board.id} onReply={startReply} onLike={likeCmt} onTip={() => openTip("user", c)} onTips={setListTips} onMenu={setSheet} onDelete={dropCmt} canCut={!!(post.canModerate || (user && c.author && user.id === c.author.id))} canGift={!!(user && c.author && user.id !== c.author.id)} onPic={(src) => setView({ images: [src], index: 0 })} />
              {authorHit ? <div className="author-replied">楼主已回复</div> : null}
              {shown.map((r) => {
                const parent = byId[r.parentId];
                const parentName = parent && parent.id !== c.id ? (parent.author || GHOST).nickname : "";
                return <CmtRow key={r.id} c={r} child parentName={parentName} isOp={!!(post.author && r.author && r.author.id === post.author.id)} boardId={board.id} onReply={startReply} onLike={likeCmt} onTip={() => openTip("user", r)} onTips={setListTips} onMenu={setSheet} onDelete={dropCmt} canCut={!!(post.canModerate || (user && r.author && user.id === r.author.id))} canGift={!!(user && r.author && user.id !== r.author.id)} onPic={(src) => setView({ images: [src], index: 0 })} />;
              })}
              {rest > 0 ? (
                <button type="button" className="expand-replies" onClick={() => setOpenKids((m) => ({ ...m, [c.id]: true }))}>
                  展开 {rest} 条回复
                </button>
              ) : null}
            </div>
          );
        })}
        {roots.length === 0 ? <div className="empty">{opOnly ? "楼主还没在评论区说话" : "还没有评论，来坐沙发"}</div> : null}
        {cmtMore ? (
          <button type="button" className="btn btn-line touch-act" onClick={() => loadComments({ more: true, onlyOp: opOnly, onlyId: onlyUser && onlyUser.id }).catch((e) => toast(e.message))}>加载更多评论</button>
        ) : null}
      </div>
      <div className="comment-dock">
        {replyTo ? (
          <div className="reply-chip">
            回复 {(replyTo.author && replyTo.author.nickname) || "楼友"}
            <button type="button" className="iconbtn" onClick={() => setReplyTo(null)}>取消</button>
          </div>
        ) : null}
        {quoteTo ? (
          <div className="reply-chip">
            引用 {quoteTo.floor}楼 {(quoteTo.author && quoteTo.author.nickname) || "楼友"}
            <button type="button" className="iconbtn" onClick={() => setQuoteTo(null)}>取消</button>
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
            placeholder={post.trashed ? "回收站帖无法回复" : (post.locked ? "帖子已锁定" : (quoteTo ? `引用 ${quoteTo.floor}楼 ${(quoteTo.author && quoteTo.author.nickname) || "楼友"}` : (replyTo ? `回复 ${(replyTo.author && replyTo.author.nickname) || "楼友"}` : "发条评论，和大家一起讨论")))}
            disabled={!!post.locked || !!post.trashed}
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
      {tipOn ? (
        <div className="modal-mask" onClick={() => setTipOn(false)}>
          <div className="modal-card tip-card" onClick={(e) => e.stopPropagation()}>
            <h3>{(tipTarget && tipTarget.kind) === "deduct" ? "扣葫芦" : ((tipTarget && tipTarget.kind) === "award" ? "赏葫芦" : "赠送葫芦")}</h3>
            {(tipTarget && tipTarget.kind) === "user" ? (
              <>
                <div className="tip-lab">选择数量：</div>
                <div className="tip-amts">
                  {[1, 2, 5].map((n) => (
                    <button key={n} type="button" className={`tip-amt${tipAmt === n ? " on" : ""}`} onClick={() => setTipAmt(n)}>{n}</button>
                  ))}
                </div>
                <label className="tip-lab">填写理由(必填)：
                  <input className="field" value={tipReason} onChange={(e) => setTipReason(e.target.value)} placeholder="5到30个字符" maxLength={30} />
                </label>
                <p className="hint">余额 {user?.gourd || 0} 葫芦</p>
              </>
            ) : (
              <>
                <label className="tip-lab">数量
                  <input className="field" type="number" min={1} max={9999} value={tipAmt} onChange={(e) => setTipAmt(Number(e.target.value) || 1)} />
                </label>
                <label className="tip-lab">理由
                  <input className="field" value={tipReason} onChange={(e) => setTipReason(e.target.value)} placeholder="可选" maxLength={80} />
                </label>
              </>
            )}
            {tipErr ? <p className="tip-err">{tipErr}</p> : null}
            <div className="tip-actions">
              <button type="button" onClick={() => setTipOn(false)}>取消</button>
              <button type="button" disabled={tipBusy} onClick={sendTip}>{tipBusy ? "处理中" : "确定"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {sheet ? (
        <div className="sheet-mask" onClick={() => setSheet(null)}>
          <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { const c = sheet; setSheet(null); startReply(c); }}>回复评论</button>
            {sheet.author && sheet.author.id ? (
              <button type="button" onClick={() => {
                const a = sheet.author;
                setSheet(null);
                setOpOnly(false);
                setOnlyUser({ id: a.id, nickname: a.nickname });
                setCmtOff(0);
                loadComments({ more: false, onlyId: a.id }).catch((e) => toast(e.message));
              }}>只看 {sheet.author.nickname}</button>
            ) : null}
            <button type="button" onClick={() => {
              const c = sheet;
              setSheet(null);
              setQuoteTo(c);
              setReplyTo(null);
              setEmojiOn(false);
              setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
            }}>引用</button>
            {user && sheet.author && user.id !== sheet.author.id ? (
              <button type="button" onClick={() => { const c = sheet; setSheet(null); openTip("user", c); }}>送葫芦</button>
            ) : null}
            {post.canOfficial ? (
              <>
                <button type="button" onClick={() => { const c = sheet; setSheet(null); openTip("award", c); }}>赏葫芦</button>
                <button type="button" onClick={() => { const c = sheet; setSheet(null); openTip("deduct", c); }}>扣葫芦</button>
              </>
            ) : null}
            <button type="button" onClick={() => { copyText(sheet.content); setSheet(null); }}>复制全文</button>
            {user && sheet.author && (user.id === sheet.author.id || post.canModerate) && !post.trashed && (!post.locked || post.canModerate) ? (
              <button type="button" onClick={() => { const c = sheet; setSheet(null); setEditCmt({ id: c.id, content: c.content }); }}>编辑</button>
            ) : null}
            {post.canModerate && !sheet.parentId ? (
              <button type="button" onClick={() => { const c = sheet; setSheet(null); pinCmt(c); }}>{sheet.pinned ? "取消置顶" : "置顶"}</button>
            ) : null}
            {user && sheet.author && user.id !== sheet.author.id ? (
              <>
                <button type="button" onClick={() => { const c = sheet; setSheet(null); setReportOn({ kind: "comment", comment: c }); }}>举报</button>
                <button type="button" onClick={async () => {
                  const c = sheet;
                  setSheet(null);
                  try {
                    const d = await api(`/api/users/${c.author.id}/block`, { method: "POST" });
                    toast(d.blocked ? "已拉黑" : "已取消拉黑");
                    await loadComments({ more: false, onlyOp: opOnly });
                  } catch (e) {
                    toast(e.message);
                  }
                }}>拉黑</button>
              </>
            ) : null}
            {user && post.author && user.id === post.author.id && post.reward && post.reward.status === "open" && sheet.author && sheet.author.id !== user.id ? (
              <button type="button" onClick={() => { const c = sheet; setSheet(null); adoptCmt(c); }}>采纳</button>
            ) : null}
            <button type="button" className="sheet-cancel" onClick={() => setSheet(null)}>取消</button>
          </div>
        </div>
      ) : null}
      <TipList tips={listTips} onClose={() => setListTips(null)} />
      {shareOn && post ? (
        <div className="modal-mask" onClick={() => setShareOn(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>分享帖子</h3>
            <p className="hint">QQ / 微信可用下方 XML 卡片</p>
            <textarea className="field" rows={6} readOnly value={shareXml()} />
            <div className="tip-actions">
              {typeof navigator.share === "function" ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator
                      .share({
                        title: post.title || "青葫三楼",
                        text: String(post.content || "").replace(/\s+/g, " ").slice(0, 80),
                        url: shareUrl()
                      })
                      .catch(() => {});
                  }}
                >
                  系统分享
                </button>
              ) : null}
              <button type="button" onClick={() => { copyText(shareUrl()); }}>复制链接</button>
              <button type="button" onClick={() => { copyText(shareXml()); }}>复制 XML</button>
              <a className="btn" href={`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl())}&title=${encodeURIComponent(post.title || "")}&summary=${encodeURIComponent(String(post.content || "").slice(0, 80))}&pics=${encodeURIComponent(absUrl((post.images && post.images[0]) || ""))}`} target="_blank" rel="noreferrer">QQ</a>
              <button type="button" onClick={() => setShareOn(false)}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}
      {reportOn ? (
        <div className="modal-mask" onClick={() => setReportOn(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>举报</h3>
            <label className="field-lab">理由
              <select className="field" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                {["垃圾广告", "人身攻击", "色情低俗", "违法违规", "其他"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="field-lab">说明
              <textarea className="field" rows={3} maxLength={80} value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} placeholder="5 到 80 个字符" />
            </label>
            <div className="tip-actions">
              <button type="button" onClick={() => setReportOn(null)}>取消</button>
              <button type="button" className="btn btn-fill touch-act" onClick={sendReport}>提交</button>
            </div>
          </div>
        </div>
      ) : null}
      {editOn && post ? (
        <div className="modal-mask" onClick={() => setEditOn(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>编辑帖子</h3>
            <input className="field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={48} />
            <textarea className="field" rows={6} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
            {post.canMove ? (
              <label className="hint">迁版
                <select className="field" value={editBoard} onChange={(e) => setEditBoard(e.target.value)}>
                  {boardOpts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            ) : <p className="hint">楼主可改标题和正文，迁版由版主或管理员操作</p>}
            <div className="tip-actions">
              <button type="button" onClick={() => setEditOn(false)}>取消</button>
              <button type="button" className="btn btn-fill" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      ) : null}
      {editCmt ? (
        <div className="modal-mask" onClick={() => setEditCmt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>编辑评论</h3>
            <textarea className="field" rows={5} maxLength={1000} value={editCmt.content} onChange={(e) => setEditCmt((cur) => ({ ...cur, content: e.target.value }))} />
            <div className="tip-actions">
              <button type="button" onClick={() => setEditCmt(null)}>取消</button>
              <button type="button" className="btn btn-fill" onClick={saveCmt}>保存</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
