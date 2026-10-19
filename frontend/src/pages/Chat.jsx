import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, compressImage, uploadVideo } from "../api.js";
import { useAuth } from "../context.jsx";
import { BackIco, ImageIco, VideoIco } from "../icons.jsx";
import Lightbox from "../components/Lightbox.jsx";
import VideoPlayer from "../components/VideoPlayer.jsx";
import { UserAvatar, UserName, BubbleSkin } from "../components/Dress.jsx";

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

export default function Chat({ peerId, onRead }) {
  const { user, site, toast } = useAuth();
  const nav = useNavigate();
  const [peer, setPeer] = useState(null);
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [pics, setPics] = useState([]);
  const [vids, setVids] = useState([]);
  const [sending, setSending] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPct, setVideoPct] = useState(0);
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const log = useRef(null);
  const [view, setView] = useState({ images: [], index: -1 });
  const tick = useRef(0);
  const opened = useRef(false);
  const lastId = useRef(0);
  const stick = useRef(true);

  function scrollBottom() {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function load(afterId = 0) {
    const my = ++tick.current;
    const d = await api(`/api/dms/${peerId}${afterId ? `?after=${afterId}` : ""}`);
    if (my !== tick.current) return;
    setPeer(d.user);
    const incoming = d.messages || [];
    if (afterId) {
      if (incoming.length) {
        setList((cur) => {
          const seen = new Set(cur.map((m) => m.id));
          return cur.concat(incoming.filter((m) => !seen.has(m.id)));
        });
        if (incoming.some((m) => m.mine)) stick.current = true;
        if (incoming.some((m) => !m.mine) && onRead) onRead();
      }
    } else {
      setList(incoming);
      stick.current = true;
    }
    const last = incoming.length ? incoming[incoming.length - 1].id : afterId;
    if (last) lastId.current = Math.max(lastId.current, last);
    if (!opened.current) {
      opened.current = true;
      if (onRead) onRead();
    }
  }

  useEffect(() => {
    if (!user) return nav("/login");
    opened.current = false;
    lastId.current = 0;
    setList([]);
    setPeer(null);
    load(0).catch((e) => toast(e.message));
    const tickNow = () => {
      if (!document.hidden) load(lastId.current).catch(() => {});
    };
    const t = setInterval(tickNow, 5000);
    document.addEventListener("visibilitychange", tickNow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tickNow);
      tick.current += 1;
    };
  }, [peerId, user]);

  useEffect(() => {
    if (stick.current) scrollBottom();
  }, [list.length]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !pics.length && !vids.length) return;
    if (sending) return;
    setSending(true);
    setText("");
    const images = pics.slice();
    const videos = vids.slice();
    setPics([]);
    setVids([]);
    try {
      const d = await api(`/api/dms/${peerId}`, { method: "POST", body: { body, images, videos } });
      setList((cur) => (cur.some((x) => x.id === d.message.id) ? cur : [...cur, d.message]));
      lastId.current = Math.max(lastId.current, d.message.id || 0);
      stick.current = true;
    } catch (err) {
      setText(body);
      setPics(images);
      setVids(videos);
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
    try {
      const fd = new FormData();
      fd.append("files", await compressImage(file));
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls || [])[0];
      if (url) setPics((cur) => [...cur, url].slice(0, 9));
    } catch (err) {
      toast(err.message);
    }
  }

  async function onVideo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const maxMb = site?.videoMaxMb || 80;
    if (file.size > maxMb * 1024 * 1024) {
      toast(`单个视频不能超过 ${maxMb}MB`);
      return;
    }
    setVideoBusy(true);
    setVideoPct(0);
    try {
      const url = await uploadVideo(file, setVideoPct);
      setVids((cur) => [...cur, url].slice(0, 3));
      toast("视频已上传");
    } catch (err) {
      toast(err.message);
    } finally {
      setVideoBusy(false);
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
              <b><UserName user={peer} withLevel={false} /></b>
              <span>{peer.bio || "青葫私信"}</span>
            </div>
          </Link>
        ) : <div className="grow" />}
      </div>
      <div
        className="tg-log"
        ref={log}
        onScroll={() => {
          const el = log.current;
          if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {list.map((m, i) => {
          const prev = list[i - 1];
          const gap = !prev || new Date(m.createdAt) - new Date(prev.createdAt) > 8 * 60 * 1000;
          const grouped = groupedWith(m, prev);
          const skin = m.deleted ? null : (m.mine ? user?.dress?.bubble : peer?.dress?.bubble);
          return (
            <React.Fragment key={m.id}>
              {gap ? <div className="tg-date">{bubbleTime(m.createdAt)}</div> : null}
              <div className={`tg-row ${m.mine ? "mine" : ""} ${grouped ? "grouped" : ""}${skin ? " has-skin" : ""}`}>
                {m.mine ? null : (peer ? <span className="tg-face-wrap"><UserAvatar user={peer} size="sm" /></span> : null)}
                <BubbleSkin
                  className={`tg-bubble${(m.images || []).length || (m.videos || []).length ? " has-pic" : ""}${m.deleted ? " deleted" : ""}`}
                  bubble={skin}
                >
                  {m.deleted ? (
                    <span className="tg-recalled">{m.mine ? "你撤回了一条消息" : "对方撤回了一条消息"}</span>
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
                      {(m.videos || []).map((src) => (
                        <VideoPlayer key={src} src={src} compact className="tg-video" />
                      ))}
                    </>
                  )}
                  {m.deleted ? null : (
                    <em className="tg-meta">
                      {bubbleTime(m.createdAt)}
                      {m.mine ? <i className={`tg-status ${m.isRead ? "read" : ""}`}>{m.isRead ? "已读" : "已发送"}</i> : null}
                      {m.mine ? (
                        <button type="button" className="tg-recall" onClick={() => recall(m)}>撤回</button>
                      ) : null}
                    </em>
                  )}
                </BubbleSkin>
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
      {vids.length || videoBusy ? (
        <div className="tg-pending">
          {vids.map((src) => (
            <button type="button" key={src} className="tg-video-pending" onClick={() => setVids((cur) => cur.filter((x) => x !== src))}>
              <video src={src} muted playsInline preload="metadata" />
              <span>×</span>
            </button>
          ))}
          {videoBusy ? <span className="tg-uploading">视频 {videoPct}%</span> : null}
        </div>
      ) : null}
      <form className="tg-dock" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPic} />
        <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" hidden onChange={onVideo} />
        <button type="button" className="tg-pic-btn" onClick={() => videoRef.current && videoRef.current.click()} aria-label="视频" disabled={videoBusy}>
          <VideoIco size={20} />
        </button>
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
        <button type="submit" className="tg-send" disabled={sending || videoBusy || (!text.trim() && !pics.length && !vids.length)}>{sending ? "发送中" : "发送"}</button>
      </form>
      <Lightbox images={view.images} index={view.index} onClose={() => setView({ images: [], index: -1 })} onIndex={(i) => setView((v) => ({ ...v, index: i }))} />
    </div>
  );
}
