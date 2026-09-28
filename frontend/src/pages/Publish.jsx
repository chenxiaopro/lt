import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Publish() {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState(sp.get("board") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState([]);
  const [link, setLink] = useState("");
  const [version, setVersion] = useState("");
  const [tracks, setTracks] = useState([]);
  const [trackId, setTrackId] = useState(sp.get("track") || "");
  const [softId, setSoftId] = useState(sp.get("soft") || "");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("工具");
  const [songQ, setSongQ] = useState("");
  const [songHits, setSongHits] = useState([]);
  const [songBusy, setSongBusy] = useState(false);
  const type = sp.get("type") || "post";
  const TYPE_META = {
    moment: { heading: "发动态", slug: "pool", titlePh: "这一刻想说的（可空）", bodyPh: "配图、心情、随手记。", needTitle: false, tag: "动态" },
    goods: { heading: "发商品", slug: "share", titlePh: "商品标题", bodyPh: "成色、价格、交易方式写清楚。", needTitle: true, tag: "商品" },
    software: { heading: "发软件", slug: "android", titlePh: "软件名称", bodyPh: "版本、用途、安装注意。", needTitle: true, tag: "软件" },
    post: { heading: "发到三楼", slug: null, titlePh: "标题写清楚，后来人才能搜到", bodyPh: "正文。攻略配步骤，求助配机型和已试过的方法。", needTitle: true, tag: "" }
  };
  const meta = TYPE_META[type] || TYPE_META.post;

  useEffect(() => {
    if (!user) nav("/login");
  }, [user]);

  useEffect(() => {
    api("/api/boards").then((d) => {
      const list = d.boards || [];
      setBoards(list);
      if (!sp.get("board") && meta.slug) {
        const hit = list.find((b) => b.slug === meta.slug);
        if (hit) setBoardId(String(hit.id));
      }
    }).catch(() => {});
  }, [type]);

  useEffect(() => {
    api("/api/tracks").then((d) => setTracks(d.tracks || [])).catch(() => {});
    const sid = sp.get("soft");
    if (!sid) return;
    api(`/api/softwares/${sid}`).then((d) => {
      const s = d.software;
      if (!s) return;
      setSoftId(String(s.id));
      setTitle((t) => t || s.name);
      setVersion((v) => v || s.version || "");
      setLink((l) => l || s.link || "");
      setContent((c) => c || s.summary || "");
      setCategory(s.category || "工具");
    }).catch(() => {});
  }, []);

  async function onFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      const d = await api("/api/upload", { method: "POST", body: fd });
      setImages([...images, ...d.urls]);
    } catch (err) {
      toast(err.message);
    }
  }

  async function searchSongs() {
    const key = songQ.trim();
    if (!key) {
      toast("输入歌名");
      return;
    }
    setSongBusy(true);
    try {
      const d = await api(`/api/music/search?q=${encodeURIComponent(key)}`);
      setSongHits(d.songs || []);
      if (!(d.songs || []).length) toast("没有搜到可播放的歌");
    } catch (err) {
      toast(err.message);
    } finally {
      setSongBusy(false);
    }
  }

  async function pickSong(song) {
    if (!song.url) {
      toast("这首没有试听，换一首");
      return;
    }
    setSongBusy(true);
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
      const next = await api("/api/tracks");
      setTracks(next.tracks || []);
      if (d.track) setTrackId(String(d.track.id));
      setSongHits([]);
      toast(d.existed ? "已挂上曲库里的歌" : "已挂上");
    } catch (err) {
      toast(err.message);
    } finally {
      setSongBusy(false);
    }
  }

  async function submit() {
    try {
      const bid = Number(boardId);
      if (!bid) {
        toast("请选择版块");
        return;
      }
      const autoTitle = (title || content || meta.heading).trim().slice(0, 48);
      const body = content.trim() || (type === "software" && link ? "软件分享" : "");
      if (!body) {
        toast(type === "software" ? "请填写介绍或下载链接" : "请填写正文");
        return;
      }
      const extra = meta.tag ? [meta.tag] : [];
      const d = await api("/api/posts", {
        method: "POST",
        body: {
          boardId: bid,
          title: autoTitle,
          content: body,
          images,
          tags: [...extra, ...tags.split(/[,，\s]+/).filter(Boolean)].slice(0, 5),
          link: type === "software" && !softId ? link : "",
          version: type === "software" ? version : "",
          size: type === "software" ? size : "",
          category: type === "software" ? category : "",
          softId: Number(softId) || 0,
          trackId: Number(trackId) || 0
        }
      });
      toast("已发到三楼，经验 +12");
      nav(type === "moment" ? "/?view=moment" : `/post/${d.post.id}`);
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="layout single">
      <div className="card pub-card">
        <div className="stack">
          <label className="field-lab">
            发到版块
            <select className="select" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
              <option value="">选择版块</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          </label>
          {type === "software" ? (
            <>
              {softId ? <p className="hint">引用软件库 #{softId}</p> : null}
              <label className="field-lab">
                版本
                <input className="field" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="例如 1.2.0" />
              </label>
              <label className="field-lab">
                体积
                <input className="field" value={size} onChange={(e) => setSize(e.target.value)} placeholder="例如 12 MB" />
              </label>
              <label className="field-lab">
                分类
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["工具", "美化", "系统", "娱乐"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field-lab">
                下载链接
                <input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https:// 或网盘链接" />
              </label>
            </>
          ) : null}
          <label className="field-lab">
            挂载音乐
            <div className="music-search pub-song-search">
              <input
                className="field"
                value={songQ}
                onChange={(e) => setSongQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchSongs(); } }}
                placeholder="搜歌名挂上"
              />
              <button className="btn btn-fill" type="button" disabled={songBusy} onClick={searchSongs}>
                {songBusy ? "搜..." : "搜索"}
              </button>
            </div>
            {songHits.length ? (
              <div className="pub-hits">
                {songHits.map((s) => (
                  <button
                    type="button"
                    className="pub-hit"
                    key={`${s.source}-${s.sourceId || s.title}`}
                    disabled={songBusy || !s.url}
                    onClick={() => pickSong(s)}
                  >
                    {s.cover ? <img src={s.cover} alt="" /> : <i>{s.title.slice(0, 1)}</i>}
                    <span className="grow">
                      <b>{s.title}</b>
                      <em>{s.artist}{s.url ? " · 可试听" : " · 无试听"}</em>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <select className="select" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">不挂音乐</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.artist}</option>)}
            </select>
          </label>
          <Link className="hint soft-link" to="/music?upload=1">没有想听的，去传一首</Link>
          {meta.needTitle !== false ? (
            <label className="field-lab">
              标题
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.titlePh} maxLength={48} />
            </label>
          ) : (
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.titlePh} maxLength={48} />
          )}
          <label className="field-lab">
            正文
            <textarea className="field pub-body" value={content} onChange={(e) => setContent(e.target.value)} placeholder={meta.bodyPh} />
          </label>
          <label className="field-lab">
            标签
            <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="空格或逗号分开" />
          </label>
          <div className="preview-row">
            {images.map((src) => <img key={src} src={src} alt="" />)}
            {images.length < 9 ? (
              <label className="upload">
                <span>+</span>
                <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
              </label>
            ) : null}
          </div>
          <button className="btn btn-gourd auth-go" onClick={submit}>发布</button>
        </div>
      </div>
    </div>
  );
}
