import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { BackIco, ImageIco } from "../icons.jsx";
import Lightbox from "../components/Lightbox.jsx";

function bubbleTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function groupedWith(m, prev) {
  if (!prev) return false;
  if (prev.mine !== m.mine) return false;
  if (prev.deleted || m.deleted) return false;
  return new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000;
}

export default function Chat({ peerId }) {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [peer, setPeer] = useState(null);
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [pics, setPics] = useState([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const log = useRef(null);
  const [view, setView] = useState({ images: [], index: -1 });

  function scrollBottom() {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function load() {
    const d = await api(`/api/dms/${peerId}`);
    setPeer(d.user);
    setList(d.messages || []);
  }

  useEffect(() => {
    if (!user) return nav("/login");
    load().catch((e) => toast(e.message));
    const t = setInterval(() => load().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [peerId, user]);

  useEffect(() => {
    scrollBottom();
  }, [list.length]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !pics.length) return;
    if (sending) return;
    setSending(true);
    setText("");
    const images = pics.slice();
    setPics([]);
    try {
      const d = await api(`/api/dms/${peerId}`, { method: "POST", body: { body, images } });
      setList((cur) => [...cur, d.message]);
    } catch (err) {
      setText(body);
      setPics(images);
      toast(err.message);
    } finally {
      setSending(false);
    }
  }

  async function recall(m) {
    if (!window.confirm("撤回这条消息？")) return;
    try {
      await api(`/api/dms/${m.id}/recall`, { method: "POST" });
      setList((cur) => cur.map((x) => (x.id === m.id ? { ...x, deleted: true, body: "", images: [] } : x)));
    } catch (err) {
      toast(err.message);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  }

  async function onPic(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("files", file);
    try {
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls || [])[0];
      if (url) setPics((cur) => [...cur, url].slice(0, 9));
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="tg-page">
      <div className="tg-head">
        <button type="button" className="ico-btn dark" onClick={() => nav("/messages")} aria-label="返回">
          <BackIco />
        </button>
        {peer ? (
          <Link className="tg-who" to={`/user/${peer.id}`}>
            <img src={peer.avatar} alt="" />
            <div>
              <b>{peer.nickname}</b>
              <span>{peer.bio || "青葫私信"}</span>
            </div>
          </Link>
        ) : <div className="grow" />}
      </div>
      <div className="tg-log" ref={log}>
        {list.map((m, i) => {
          const prev = list[i - 1];
          const gap = !prev || new Date(m.createdAt) - new Date(prev.createdAt) > 8 * 60 * 1000;
          const grouped = groupedWith(m, prev);
          return (
            <React.Fragment key={m.id}>
              {gap ? <div className="tg-date">{bubbleTime(m.createdAt)}</div> : null}
              <div className={`tg-row ${m.mine ? "mine" : ""} ${grouped ? "grouped" : ""}`}>
                {m.mine ? null : <img className="tg-face" src={peer?.avatar} alt="" />}
                <div className={`tg-bubble${(m.images || []).length ? " has-pic" : ""}${m.deleted ? " deleted" : ""}`}>
                  {m.deleted ? (
                    <span className="tg-recalled">已撤回</span>
                  ) : (
                    <>
                      {m.body ? <span>{m.body}</span> : null}
                      {(m.images || []).map((src, i) => (
                        <button
                          type="button"
                          key={src}
                          className="tg-pic-wrap"
                          onClick={() => setView({ images: m.images, index: i })}
                        >
                          <img className="tg-pic" src={src} alt="" />
                        </button>
                      ))}
                    </>
                  )}
                  <em className="tg-meta">
                    {bubbleTime(m.createdAt)}
                    {m.mine && !m.deleted ? <i className={`tg-status ${m.isRead ? "read" : ""}`}>{m.isRead ? "已读" : "已发送"}</i> : null}
                    {m.mine && !m.deleted ? (
                      <button type="button" className="tg-recall" onClick={() => recall(m)}>撤回</button>
                    ) : null}
                  </em>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {list.length === 0 ? <div className="empty soft">打个招呼吧</div> : null}
      </div>
      {pics.length ? (
        <div className="tg-pending">
          {pics.map((src) => (
            <button type="button" key={src} onClick={() => setPics((cur) => cur.filter((x) => x !== src))}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <form className="tg-dock" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPic} />
        <button type="button" className="tg-pic-btn" onClick={() => fileRef.current && fileRef.current.click()} aria-label="图片">
          <ImageIco size={20} />
        </button>
        <input
          className="tg-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="发消息，Enter 发送"
          maxLength={2000}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="tg-send" disabled={sending || (!text.trim() && !pics.length)}>{sending ? "发送中" : "发送"}</button>
      </form>
      <Lightbox images={view.images} index={view.index} onClose={() => setView({ images: [], index: -1 })} onIndex={(i) => setView((v) => ({ ...v, index: i }))} />
    </div>
  );
}
