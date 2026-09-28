import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { usePlayer } from "../components/Player.jsx";
import { MusicIco, PauseIco, PlayIco } from "../icons.jsx";

export function TrackChip({ track }) {
  const p = usePlayer();
  if (!track) return null;
  const on = p && p.current && p.current.id === track.id && p.playing;
  return (
    <button type="button" className={`track-chip ${on ? "on" : ""}`} onClick={() => p && p.play(track)}>
      <MusicIco size={16} />
      <span>{track.title}</span>
      <em>{on ? "播放中" : "播放"}</em>
    </button>
  );
}

function Cover({ track }) {
  if (track && track.cover) return <img src={track.cover} alt="" />;
  return <i className="music-ph">{((track && track.title) || "曲").slice(0, 1)}</i>;
}

export default function Music() {
  const p = usePlayer();
  const { user, toast } = useAuth();
  const [sp] = useSearchParams();
  const [open, setOpen] = useState(sp.get("upload") === "1");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const list = (p && p.tracks) || [];
  const mine = user ? list.filter((t) => t.userId === user.id) : [];
  const rest = user ? list.filter((t) => t.userId !== user.id) : list;

  async function submit() {
    if (!user) return;
    if (!audio && !String(url).trim()) {
      toast("请选择音频或填写链接");
      return;
    }
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("artist", artist.trim());
    if (String(url).trim()) fd.append("url", url.trim());
    if (audio) fd.append("audio", audio);
    if (cover) fd.append("cover", cover);
    setBusy(true);
    try {
      const d = await api("/api/tracks", { method: "POST", body: fd });
      toast("已加入电台");
      setTitle("");
      setArtist("");
      setUrl("");
      setAudio(null);
      setCover(null);
      setOpen(false);
      const next = p.reload ? await p.reload() : list;
      if (d.track) p.play(d.track, next && next.length ? next : [d.track]);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    const key = q.trim();
    if (!key) return toast("输入歌名");
    setSearching(true);
    try {
      const d = await api(`/api/music/search?q=${encodeURIComponent(key)}`);
      setHits(d.songs || []);
      if (!(d.songs || []).length) toast("没有搜到可播放的歌");
    } catch (err) {
      toast(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function onImport(song) {
    if (!user) return;
    if (!song.url) return toast("这首没有试听，换一首或自己上传");
    setBusy(true);
    try {
      const d = await api("/api/tracks/import", {
        method: "POST",
        body: {
          title: song.title,
          artist: song.artist,
          url: song.url,
          cover: song.cover,
          lyrics: song.lyrics || "",
          source: song.source,
          sourceId: song.sourceId
        }
      });
      toast(d.existed ? "曲库里已有" : "已加入电台");
      const next = p.reload ? await p.reload() : list;
      if (d.track) p.play(d.track, next && next.length ? next : [d.track]);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDel(t) {
    try {
      await api(`/api/tracks/${t.id}`, { method: "DELETE" });
      if (p.current && p.current.id === t.id) p.stop();
      toast("已从电台拿下");
      if (p.reload) p.reload();
    } catch (e) {
      toast(e.message);
    }
  }

  function row(t) {
    const on = p.current && p.current.id === t.id;
    const canDel = user && (t.userId === user.id || user.isAdmin);
    return (
      <div className={`music-row ${on ? "on" : ""}`} key={t.id}>
        <button type="button" className="music-main" onClick={() => p.play(t, list)}>
          <Cover track={t} />
          <div className="grow">
            <b>{t.title}</b>
            <span>{t.artist}{t.userId ? " · 自制" : ""}</span>
          </div>
          <i className="music-go">{on && p.playing ? <PauseIco size={18} /> : <PlayIco size={18} />}</i>
        </button>
        <Link className="music-pin" to={`/publish?track=${t.id}`}>挂帖</Link>
        {canDel ? <button type="button" className="music-del" onClick={() => onDel(t)}>删除</button> : null}
      </div>
    );
  }

  return (
    <div className="layout single">
      <div className="music-page">
        <div className="soft-hero music-hero">
          <h2>三楼电台</h2>
          <p>传自己的歌，边刷帖边听，发帖也能挂上。</p>
          {user ? (
            <button type="button" className="btn btn-ghost music-add" onClick={() => setOpen((v) => !v)}>
              {open ? "收起" : "传一首"}
            </button>
          ) : (
            <Link className="btn btn-ghost music-add" to="/login">登录后上传</Link>
          )}
        </div>
        {user ? (
          <form className="music-search" onSubmit={onSearch}>
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜歌名，加入电台" />
            <button className="btn btn-fill" type="submit" disabled={searching}>{searching ? "搜..." : "搜索"}</button>
          </form>
        ) : null}
        {hits.length ? (
          <div className="music-hits">
            {hits.map((s) => (
              <div className="music-row" key={`${s.source}-${s.sourceId || s.title}`}>
                <button type="button" className="music-main" onClick={() => s.url && onImport(s)}>
                  {s.cover ? <img src={s.cover} alt="" /> : <i className="music-ph">{s.title.slice(0, 1)}</i>}
                  <div className="grow">
                    <b>{s.title}</b>
                    <span>{s.artist}{s.lyrics ? " · 有歌词" : ""}{s.url ? " · 可试听" : " · 无试听"}</span>
                  </div>
                </button>
                <button type="button" className="music-pin" disabled={busy || !s.url} onClick={() => onImport(s)}>加入</button>
              </div>
            ))}
          </div>
        ) : null}
        {open && user ? (
          <div className="card music-form">
            <label className="field-lab">
              歌名
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="不填则用文件名" maxLength={40} />
            </label>
            <label className="field-lab">
              歌手 / 电台名
              <input className="field" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={user.nickname || "三楼电台"} maxLength={32} />
            </label>
            <label className="field-lab">
              音频文件
              <input className="field" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" onChange={(e) => setAudio((e.target.files && e.target.files[0]) || null)} />
            </label>
            <label className="field-lab">
              或音频链接
              <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// 直链 mp3" />
            </label>
            <label className="field-lab">
              封面（可选）
              <input className="field" type="file" accept="image/*" onChange={(e) => setCover((e.target.files && e.target.files[0]) || null)} />
            </label>
            <button className="btn btn-gourd auth-go" type="button" disabled={busy} onClick={submit}>{busy ? "上传中..." : "加入电台"}</button>
          </div>
        ) : null}
        {mine.length ? <h3 className="music-sec">我上传的</h3> : null}
        {mine.map(row)}
        {rest.length ? <h3 className="music-sec">{mine.length ? "大家在听" : "曲库"}</h3> : null}
        {rest.map(row)}
        {list.length === 0 ? <div className="empty">还没有歌，先传一首</div> : null}
      </div>
    </div>
  );
}
