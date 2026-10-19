import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

const NAMES = {
  douyin: "抖音",
  kuaishou: "快手",
  xiaohongshu: "小红书",
  bilibili: "哔哩哔哩",
  weibo: "微博",
  pipix: "皮皮虾",
  toutiao: "头条",
  tiktok: "TikTok",
  unknown: "未知平台"
};

const KINDS = {
  video: "视频",
  images: "图文",
  live: "实况"
};

const PLATS = [
  { id: "douyin", name: "抖音" },
  { id: "kuaishou", name: "快手" },
  { id: "xiaohongshu", name: "小红书" },
  { id: "bilibili", name: "哔哩哔哩" },
  { id: "weibo", name: "微博" },
  { id: "pipix", name: "皮皮虾" },
  { id: "toutiao", name: "头条" },
  { id: "tiktok", name: "TikTok" }
];

const TYPES = [
  { id: "auto", name: "自动识别" },
  { id: "video", name: "短视频" },
  { id: "images", name: "图集" }
];

function detectFront(text) {
  const s = String(text || "").toLowerCase();
  if (/douyin|iesdouyin|v\.douyin/.test(s)) return "douyin";
  if (/kuaishou|gifshow|chenzhongtech|v\.kuaishou/.test(s)) return "kuaishou";
  if (/xiaohongshu|xhslink|xhscdn/.test(s)) return "xiaohongshu";
  if (/bilibili|b23\.tv/.test(s)) return "bilibili";
  if (/weibo\.|miaopai/.test(s)) return "weibo";
  if (/pipix/.test(s)) return "pipix";
  if (/toutiao/.test(s)) return "toutiao";
  if (/tiktok/.test(s)) return "tiktok";
  return "";
}

function pickShare(text) {
  const m = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[),.;]+$/, "") : "";
}

async function saveFile(url, name) {
  const token = localStorage.getItem("qh_token");
  const res = await fetch(`/api/parse/proxy?url=${encodeURIComponent(url)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "下载失败");
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name || "media";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function ResultView({ data, onSave, onSaveAll, onCopy, busy }) {
  if (!data) return null;
  const platform = NAMES[data.platform] || data.platform || "";
  const kind = KINDS[data.kind] || "";
  const clips = data.clips || [];
  const pics = data.pics || [];
  const cover = data.cover || pics[0] || "";
  const initial = (data.author || "?").slice(0, 1);
  return (
    <article className="parse-result">
      {cover ? (
        <div className="parse-hero">
          <img src={cover} alt="" referrerPolicy="no-referrer" />
          {kind ? <i className="parse-kind">{kind}</i> : null}
        </div>
      ) : null}
      <div className="parse-who">
        {data.avatar ? (
          <img className="parse-av" src={data.avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="parse-av ph">{initial}</span>
        )}
        <div className="parse-who-txt">
          <b>{data.author || "未知作者"}</b>
          <span>{[platform, kind].filter(Boolean).join(" · ") || "解析结果"}</span>
        </div>
      </div>
      {data.title ? <h3 className="parse-title">{data.title}</h3> : null}
      {data.video && !clips.length ? (
        <video className="parse-video" src={data.video} controls playsInline referrerPolicy="no-referrer" />
      ) : null}
      {clips.length ? (
        <div className="parse-lives">
          <div className="parse-pics">
            {clips.map((u, i) => (
              <button key={u + i} type="button" onClick={() => onSave(u, `实况${i + 1}.mp4`)}>
                {pics[i] ? <img src={pics[i]} alt="" referrerPolicy="no-referrer" /> : <span className="parse-clip-ph">{i + 1}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : pics.length ? (
        <div className="parse-pics">
          {pics.map((u, i) => (
            <button key={u + i} type="button" onClick={() => onSave(u, `图${i + 1}.jpg`)}>
              <img src={u} alt="" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      ) : null}
      {data.music ? <audio className="parse-audio" src={data.music} controls /> : null}
      <div className="parse-actions">
        {data.video && !clips.length ? (
          <button className="btn btn-gourd" type="button" disabled={busy} onClick={() => onSave(data.video, "video.mp4")}>下载视频</button>
        ) : null}
        {clips.length ? (
          <button className="btn btn-gourd" type="button" disabled={busy} onClick={() => onSaveAll && onSaveAll(clips, "实况", "mp4")}>下载全部实况</button>
        ) : null}
        {pics.length && !clips.length ? (
          <button className="btn btn-gourd" type="button" disabled={busy} onClick={() => onSaveAll && onSaveAll(pics, "图", "jpg")}>下载全部图片</button>
        ) : null}
        {data.music ? (
          <button className="btn btn-line" type="button" disabled={busy} onClick={() => onSave(data.music, "audio.mp3")}>下载音频</button>
        ) : null}
        {data.videoBackup ? (
          <button className="btn btn-line" type="button" disabled={busy} onClick={() => onSave(data.videoBackup, "video-backup.mp4")}>备用下载</button>
        ) : null}
        {data.shareUrl ? (
          <button className="btn btn-line" type="button" onClick={() => onCopy && onCopy(data.shareUrl)}>复制原链</button>
        ) : null}
        {data.title ? (
          <button className="btn btn-line" type="button" onClick={() => onCopy && onCopy(data.title)}>复制文案</button>
        ) : null}
      </div>
    </article>
  );
}

export default function Parse() {
  const { user, toast, setUser } = useAuth();
  const [text, setText] = useState("");
  const [parseType, setParseType] = useState("auto");
  const [cost, setCost] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [openRow, setOpenRow] = useState(null);

  function loadLogs() {
    api("/api/parse/logs")
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]));
  }

  useEffect(() => {
    if (!user) return;
    api("/api/parse/config")
      .then((d) => setCost(d.cost ?? 1))
      .catch(() => {});
    loadLogs();
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const d = await api("/api/parse", { method: "POST", body: { text, parseType } });
      setResult(d.result);
      if (typeof d.gourd === "number") setUser((u) => (u ? { ...u, gourd: d.gourd } : u));
      toast(d.cost ? `解析成功，扣 ${d.cost} 葫芦` : "解析成功");
      loadLogs();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAll(urls, prefix, ext) {
    if (busy || !urls || !urls.length) return;
    setBusy(true);
    try {
      for (let i = 0; i < urls.length; i++) {
        await saveFile(urls[i], `${prefix}${i + 1}.${ext}`);
      }
      toast(`已下载 ${urls.length} 个文件`);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSave(url, name) {
    if (busy) return;
    setBusy(true);
    try {
      await saveFile(url, name);
      toast("已开始下载");
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyText(value) {
    navigator.clipboard.writeText(value).then(
      () => toast("已复制"),
      () => toast("复制失败")
    );
  }

  async function openLog(id) {
    if (openId === id) {
      setOpenId(null);
      setOpenRow(null);
      return;
    }
    try {
      const d = await api(`/api/parse/logs/${id}`);
      setOpenId(id);
      setOpenRow(d.log);
    } catch (err) {
      toast(err.message);
    }
  }

  if (!user) {
    return (
      <div className="layout single">
        <div className="parse-page">
          <div className="soft-hero">
            <h2>去水印</h2>
            <p>登录后粘贴抖音、快手等分享内容，预览并保存无水印媒体。</p>
            <Link className="btn btn-gourd" to="/login">去登录</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout single">
      <div className="parse-page">
        <div className="soft-hero">
          <h2>去水印</h2>
          <p>粘贴分享口令或链接，解析抖音视频、图文、实况和无水印音频。</p>
        </div>
        <div className="parse-desk">
          <div className="parse-main">
            <form className="parse-box" onSubmit={submit}>
              <div className="parse-types">
                {TYPES.map((t) => (
                  <button key={t.id} type="button" className={`chip${parseType === t.id ? " on" : ""}`} onClick={() => setParseType(t.id)}>{t.name}</button>
                ))}
              </div>
              <div className="parse-plats">
                {PLATS.map((p) => (
                  <i key={p.id} className={detectFront(text) === p.id ? "on" : ""}>{p.name}</i>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="粘贴抖音、快手、小红书等分享内容"
                maxLength={2000}
              />
              <div className="parse-meta">
                <span>本次消耗 {cost} 葫芦 · 余额 {user.gourd || 0}</span>
                <div className="parse-meta-btns">
                  <button className="btn btn-line" type="button" onClick={async () => {
                    try {
                      const t = await navigator.clipboard.readText();
                      if (t && t.trim()) setText(t.trim());
                      else toast("剪贴板是空的");
                    } catch {
                      toast("请长按输入框粘贴");
                    }
                  }}>粘贴</button>
                  {pickShare(text) ? (
                    <button className="btn btn-line" type="button" onClick={() => copyText(pickShare(text))}>复制链接</button>
                  ) : null}
                  <button className="btn btn-gourd" type="submit" disabled={busy}>{busy ? "解析中" : "解析"}</button>
                </div>
              </div>
            </form>
            <ResultView data={result} onSave={onSave} onSaveAll={onSaveAll} onCopy={copyText} busy={busy} />
          </div>
          <aside className="parse-side">
            <h3 className="parse-h">最近记录</h3>
            <p className="parse-note">超过一天的记录会自动清空</p>
            {logs.length ? logs.map((l) => (
              <div key={l.id}>
                <button type="button" className="parse-log" onClick={() => openLog(l.id)}>
                  <div className="grow">
                    <b>{l.ok ? (l.title || "解析成功") : (l.error || "失败")}</b>
                    <span>{NAMES[l.platform] || l.platform || "—"} · {l.ok ? `扣 ${l.cost} 葫芦` : "未扣葫芦"}</span>
                  </div>
                  <em>{String(l.createdAt || "").slice(0, 16).replace("T", " ")}</em>
                </button>
                {openId === l.id && openRow && openRow.result ? (
                  <ResultView data={openRow.result} onSave={onSave} onSaveAll={onSaveAll} onCopy={copyText} busy={busy} />
                ) : null}
              </div>
            )) : <div className="empty">还没有解析记录</div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
