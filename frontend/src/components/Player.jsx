import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { CloseIco, MusicIco, PauseIco, PlayIco } from "../icons.jsx";

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    api("/api/tracks").then((d) => setTracks(d.tracks || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!current) {
      el.pause();
      return;
    }
    if (el.getAttribute("data-id") !== String(current.id)) {
      el.src = current.url;
      el.setAttribute("data-id", String(current.id));
    }
    if (playing) {
      const run = el.play();
      if (run && run.catch) run.catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [current, playing]);

  const apiBag = useMemo(() => {
    function play(track, list) {
      if (!track) return;
      if (list && list.length) setTracks(list);
      if (current && current.id === track.id) {
        setPlaying((on) => !on);
        return;
      }
      setCurrent(track);
      setPlaying(true);
    }
    function toggle() {
      if (!current) {
        if (tracks[0]) play(tracks[0], tracks);
        return;
      }
      setPlaying((on) => !on);
    }
    function jump(dir) {
      const pool = tracks.length ? tracks : (current ? [current] : []);
      if (!pool.length) return;
      const idx = current ? pool.findIndex((t) => t.id === current.id) : -1;
      const next = pool[(idx + dir + pool.length) % pool.length];
      setCurrent(next);
      setPlaying(true);
    }
    function stop() {
      setPlaying(false);
      setCurrent(null);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
    }
    function seek(ratio) {
      const el = audioRef.current;
      if (!el || !el.duration) return;
      const t = Math.min(1, Math.max(0, Number(ratio) || 0)) * el.duration;
      el.currentTime = t;
      setCurrentTime(t);
      setProgress(el.duration ? t / el.duration : 0);
    }
    function reload() {
      return api("/api/tracks").then((d) => {
        const list = d.tracks || [];
        setTracks(list);
        return list;
      });
    }
    return { tracks, current, playing, progress, currentTime, duration, play, toggle, jump, stop, seek, setTracks, reload };
  }, [tracks, current, playing, progress, currentTime, duration]);

  return (
    <PlayerCtx.Provider value={apiBag}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const el = e.target;
          setProgress(el.duration ? el.currentTime / el.duration : 0);
          setCurrentTime(el.currentTime || 0);
          setDuration(el.duration || 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onEnded={() => apiBag.jump(1)}
      />
    </PlayerCtx.Provider>
  );
}

export function MiniPlayer({ hidden }) {
  const p = usePlayer();
  if (hidden || !p || !p.current) return null;
  const t = p.current;
  return (
    <div className="mini-player">
      <SeekBar className="mini-seek" progress={p.progress} onSeek={p.seek} />
      <Link className="mini-cover" to="/music/now">
        {t.cover ? <img src={t.cover} alt="" /> : <MusicIco size={18} />}
      </Link>
      <Link className="mini-meta" to="/music/now">
        <b>{t.title}</b>
        <span>{t.artist}</span>
      </Link>
      <button type="button" onClick={() => p.jump(-1)} aria-label="上一首">上</button>
      <button type="button" className="mini-play" onClick={p.toggle} aria-label={p.playing ? "暂停" : "播放"}>
        {p.playing ? <PauseIco size={18} /> : <PlayIco size={18} />}
      </button>
      <button type="button" onClick={() => p.jump(1)} aria-label="下一首">下</button>
      <button type="button" className="mini-x" onClick={p.stop} aria-label="关闭"><CloseIco size={16} /></button>
    </div>
  );
}

export function SeekBar({ progress, onSeek, className }) {
  function at(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)) || 0;
    onSeek((x - box.left) / Math.max(1, box.width));
  }
  return (
    <div
      className={className || "seek-bar"}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((progress || 0) * 100)}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); at(e); }}
      onPointerMove={(e) => { if (e.buttons) at(e); }}
    >
      <i style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
    </div>
  );
}

export function fmtTime(s) {
  const n = Math.max(0, Math.floor(Number(s) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
