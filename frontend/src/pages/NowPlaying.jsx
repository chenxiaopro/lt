import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtTime, SeekBar, usePlayer } from "../components/Player.jsx";
import { MusicIco, PauseIco, PlayIco } from "../icons.jsx";

function parseLrc(raw) {
  const out = [];
  String(raw || "").split(/\r?\n/).forEach((row) => {
    const tags = [...row.matchAll(/\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]/g)];
    const text = row.replace(/\[[^\]]+\]/g, "").trim();
    if (!tags.length) {
      if (text) out.push({ t: out.length ? out[out.length - 1].t : 0, text });
      return;
    }
    tags.forEach((m) => out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: text || " " }));
  });
  return out.sort((a, b) => a.t - b.t);
}

export default function NowPlaying() {
  const p = usePlayer();
  const t = p && p.current;
  const [lyrics, setLyrics] = useState("");
  const activeRef = useRef(null);

  useEffect(() => {
    if (!t) return;
    setLyrics(t.lyrics || "");
    if (t.lyrics) return;
    api(`/api/tracks/${t.id}/lyrics`)
      .then((d) => setLyrics((d.lyrics || d.track && d.track.lyrics) || ""))
      .catch(() => {});
  }, [t && t.id]);

  const lines = useMemo(() => parseLrc(lyrics), [lyrics]);
  let active = -1;
  lines.forEach((row, i) => {
    if (row.t <= (p.currentTime || 0)) active = i;
  });

  useEffect(() => {
    if (activeRef.current && activeRef.current.scrollIntoView) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active]);

  if (!t) {
    return (
      <div className="layout single">
        <div className="empty now-empty">
          还没在播
          <Link className="btn btn-gourd" to="/music">去电台</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="now-page">
      <div className="now-bg" style={t.cover ? { backgroundImage: `url(${t.cover})` } : undefined} />
      <div className="now-cover">{t.cover ? <img src={t.cover} alt="" /> : <MusicIco size={48} />}</div>
      <h2>{t.title}</h2>
      <p>{t.artist}</p>
      <div className="now-lrc">
        {lines.length ? lines.map((row, i) => (
          <p key={`${row.t}-${i}`} className={i === active ? "on" : ""} ref={i === active ? activeRef : undefined}>{row.text}</p>
        )) : <p className="on">暂无歌词</p>}
      </div>
      <div className="now-ctrl">
        <div className="now-times">
          <span>{fmtTime(p.currentTime)}</span>
          <SeekBar progress={p.progress} onSeek={p.seek} />
          <span>{fmtTime(p.duration)}</span>
        </div>
        <div className="now-btns">
          <button type="button" onClick={() => p.jump(-1)}>上一首</button>
          <button type="button" className="now-play" onClick={p.toggle} aria-label={p.playing ? "暂停" : "播放"}>
            {p.playing ? <PauseIco size={28} /> : <PlayIco size={28} />}
          </button>
          <button type="button" onClick={() => p.jump(1)}>下一首</button>
        </div>
        <Link className="now-lib" to="/music">曲库</Link>
      </div>
    </div>
  );
}
