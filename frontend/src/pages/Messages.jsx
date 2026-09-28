import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { ChatIco, HeartIco, PlusIco, StarIco } from "../icons.jsx";
import Chat from "./Chat.jsx";

function msgTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const day = Math.floor(h / 24);
  if (day < 7) return "周" + "日一二三四五六"[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function inboxLineOf(n) {
  if (!n) return "赞、评论、收藏都在这里";
  const who = n.from?.nickname || "楼友";
  if (n.type === "comment") return `${who} 回复了你`;
  if (n.type === "like") return `${who} 赞了你的帖子`;
  if (n.type === "collect") return `${who} 收藏了你的帖子`;
  if (n.type === "follow") return `${who} 关注了你`;
  return `${who} ${n.content || ""}`;
}

function actText(n) {
  if (n.type === "like") return "赞了你的帖子";
  if (n.type === "collect") return "收藏了你的帖子";
  if (n.type === "comment") return n.content === "回复了你的评论" ? "回复了你的评论" : "回复了你的帖子";
  if (n.type === "follow") return "关注了你";
  return n.content || "互动";
}

export default function Messages() {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const { uid } = useParams();
  const peerId = uid ? Number(uid) : 0;
  const [sp] = useSearchParams();
  const inbox = sp.get("inbox") === "1";
  const tab = sp.get("tab") === "follow" ? "follow" : "all";
  const filter = sp.get("filter") || "all";
  const [list, setList] = useState([]);
  const [sent, setSent] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dms, setDms] = useState([]);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!user) return nav("/login");
    api("/api/notifications")
      .then((d) => setList(d.notifications || []))
      .catch((e) => toast(e.message));
    api("/api/dms")
      .then((d) => setDms(d.conversations || []))
      .catch(() => setDms([]));
    api(`/api/users/${user.id}/replies`)
      .then((d) => setSent(d.replies || []))
      .catch(() => setSent([]));
    Promise.all([
      api(`/api/users/${user.id}/following`).catch(() => ({ users: [] })),
      api("/api/rankings").catch(() => ({ harvest: [] }))
    ]).then(([f, r]) => {
      const follow = f.users || [];
      const extra = (r.harvest || []).filter((u) => u.id !== user.id && !follow.some((x) => x.id === u.id));
      setContacts([...follow, ...extra].slice(0, 12));
    });
  }, [user, peerId]);

  function goInbox(extra) {
    const q = new URLSearchParams({ inbox: "1", ...(extra || {}) });
    nav(`/messages?${q.toString()}`);
  }

  async function readAll() {
    await api("/api/notifications/read", { method: "POST" });
    setList(list.map((n) => ({ ...n, isRead: true })));
  }

  if (!user) return null;

  const interact = list.filter((n) => n.type === "like" || n.type === "collect" || n.type === "comment");
  const follows = list.filter((n) => n.type === "follow");
  const inboxLatest = interact[0];
  const shown = filter === "like"
    ? interact.filter((n) => n.type === "like" || n.type === "collect")
    : filter === "comment"
      ? interact.filter((n) => n.type === "comment")
      : interact;

  const listPane = inbox ? (
    <div className="dy-msg">
      <div className="act-tabs">
        <button type="button" className={tab !== "follow" ? "on" : ""} onClick={() => { setMenu((v) => (tab !== "follow" ? !v : false)); goInbox(); }}>
          互动消息
        </button>
        <button type="button" className={tab === "follow" ? "on" : ""} onClick={() => { setMenu(false); goInbox({ tab: "follow" }); }}>
          新的关注
        </button>
        <button type="button" className="msg-read" onClick={readAll}>全部已读</button>
      </div>
      {menu && tab !== "follow" ? (
        <div className="act-menu">
          {[
            ["all", "全部消息", <ChatIco key="a" size={18} />],
            ["like", "赞与收藏", <HeartIco key="b" size={18} />],
            ["comment", "收到的评论", <ChatIco key="c" size={18} />],
            ["sent", "发出的评论", <ChatIco key="d" size={18} />]
          ].map(([id, label, ico]) => (
            <button key={id} type="button" className={filter === id ? "on" : ""} onClick={() => { goInbox({ filter: id }); setMenu(false); }}>
              {ico}
              {label}
              {filter === id ? <span className="ok">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {tab === "follow" ? (
        follows.length ? follows.map((n) => (
          <Link className={`act-row ${n.isRead ? "" : "unread"}`} key={n.id} to={n.from ? `/user/${n.from.id}` : "/me"}>
            <span className="act-av">
              <img src={n.from?.avatar} alt="" />
            </span>
            <div className="grow">
              <b>{n.from?.nickname || "楼友"}</b>
              <p>关注了你 · {msgTime(n.createdAt)}</p>
            </div>
          </Link>
        )) : <div className="empty">还没有新关注</div>
      ) : filter === "sent" ? (
        sent.length ? sent.map((r) => (
          <Link className="act-row" key={r.id} to={`/post/${r.postId}`}>
            <span className="act-av"><img src={user.avatar} alt="" /></span>
            <div className="grow">
              <b>我</b>
              <p>回复：{r.content}</p>
            </div>
          </Link>
        )) : <div className="empty">还没有发出评论</div>
      ) : shown.length ? shown.map((n) => (
        <Link
          className={`act-row ${n.isRead ? "" : "unread"}`}
          key={n.id}
          to={n.postId ? `/post/${n.postId}` : n.from ? `/user/${n.from.id}` : "/me"}
        >
          <span className="act-av">
            <img src={n.from?.avatar} alt="" />
            <i className={`act-mark ${n.type}`}>
              {n.type === "collect" ? <StarIco size={11} filled /> : n.type === "comment" ? <ChatIco size={11} filled /> : <HeartIco size={11} filled />}
            </i>
          </span>
          <div className="grow">
            <b>{n.from?.nickname || "系统"}</b>
            <p>{actText(n)} · {msgTime(n.createdAt)}</p>
          </div>
          {n.post?.cover ? <img className="act-thumb" src={n.post.cover} alt="" /> : n.post?.title ? <span className="act-ph">{n.post.title.slice(0, 4)}</span> : null}
        </Link>
      )) : <div className="empty">暂时没有互动</div>}
    </div>
  ) : (
    <div className="dy-msg">
      <div className="dy-story">
        <Link className="dy-story-item" to="/discover">
          <span className="dy-av">
            <img src={user.avatar} alt="" />
            <i className="plus"><PlusIco size={12} /></i>
          </span>
          <b>加关注</b>
        </Link>
        {contacts.map((u, i) => (
          <Link className="dy-story-item" key={u.id} to={`/user/${u.id}`}>
            <span className={`dy-av ${i === 0 ? "ring-a" : i === 1 ? "ring-b" : ""}`}>
              <img src={u.avatar} alt="" />
              {i < 3 ? <i className="online" /> : null}
            </span>
            <b>{u.nickname}</b>
          </Link>
        ))}
      </div>

      <button type="button" className="dy-inbox" onClick={() => goInbox()}>
        <span className="dy-inbox-ico"><ChatIco size={26} filled /></span>
        <div className="grow">
          <span className="dy-name">互动消息</span>
          <p className="dy-preview">{inboxLineOf(inboxLatest)}</p>
        </div>
        <div className="dy-meta">
          <span className="dy-time">{inboxLatest ? msgTime(inboxLatest.createdAt) : ""}</span>
        </div>
      </button>

      {dms.filter((c) => c.user).map((c) => (
        <Link className={`dy-thread ${c.unread ? "unread" : ""} ${peerId === c.user.id ? "on" : ""}`} key={c.user.id} to={`/messages/chat/${c.user.id}`}>
          <span className="dy-av-wrap">
            <img className="dy-face" src={c.user.avatar} alt="" />
          </span>
          <div className="grow">
            <span className="dy-name">
              {c.user.nickname}
            </span>
            <p className="dy-preview">{c.last?.body || (c.last?.images?.length ? "[图片]" : "")}</p>
          </div>
          <div className="dy-meta">
            <span className="dy-time">{msgTime(c.last?.createdAt)}</span>
            {c.unread > 1 ? <i className="dy-badge">{c.unread > 99 ? "99+" : c.unread}</i> : c.unread === 1 ? <i className="dy-badge dot" /> : null}
          </div>
        </Link>
      ))}
      {dms.length === 0 ? <div className="empty soft">还没有私信，去别人主页打个招呼</div> : null}
    </div>
  );

  return (
    <div className={`layout single msg-shell ${peerId ? "split" : ""}`}>
      <div className={`msg-pane ${peerId ? "desk-keep" : ""}`}>{listPane}</div>
      {peerId ? <Chat peerId={peerId} /> : <div className="msg-placeholder desk-only">选择一个对话开始聊天</div>}
    </div>
  );
}
