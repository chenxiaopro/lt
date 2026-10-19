import {
  ChevronDown,
  Heart,
  ListMusic,
  MessageCircle,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useRef, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { artistText, fetchSimiSongs } from "../api/client";
import { usePlayer, usePlayerTime } from "../store/PlayerContext";
import { imgUrl } from "../utils/format";
import Cover from "./Cover";
import LyricScroller, { LyricPreview } from "./LyricScroller";
import SeekBar from "./SeekBar";
import SongRow from "./SongRow";

const QUALITY_LABEL = {
  standard: "标准",
  higher: "较高",
  exhigh: "极高",
  lossless: "无损",
} as const;

export default function FullPlayer() {
  const navigate = useNavigate();
  const gesture = useRef({ x: 0, y: 0, swiped: false });
  const {
    current,
    playing,
    loading,
    mode,
    quality,
    fullOpen,
    lyricsOpen,
    queueOpen,
    lyrics,
    queue,
    toggle,
    next,
    prev,
    seek,
    cycleMode,
    cycleQuality,
    playTracks,
    setFullOpen,
    setLyricsOpen,
    setQueueOpen,
    toggleLike,
    isLiked,
  } = usePlayer();
  const { currentTime, duration, buffered } = usePlayerTime();

  if (!current || !fullOpen) return null;

  const cover = imgUrl(current.album.picUrl, 800);

  const onSwipeStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    gesture.current = { x: touch.clientX, y: touch.clientY, swiped: false };
  };

  const onSwipeEnd = (event: TouchEvent) => {
    const start = gesture.current;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    gesture.current.swiped = true;
    if (dx < 0 && !lyricsOpen) setLyricsOpen(true);
    if (dx > 0 && lyricsOpen) setLyricsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/70">
      <div className="relative flex h-dvh w-full max-w-[480px] flex-col overflow-hidden text-[#F4F1EA]">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: cover ? `url(${cover})` : undefined }}
        />
        <div className="absolute inset-0 bg-[#09090B]/72" />

        <header className="relative z-10 flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="收起播放器"
            onClick={() => setFullOpen(false)}
            className="flex h-11 w-11 items-center justify-center"
          >
            <ChevronDown className="h-7 w-7" />
          </button>
          <div className="text-center">
            <div className="text-xs tracking-[0.3em] text-white/70">{lyricsOpen ? "歌词" : "正在播放"}</div>
            <div className="max-w-[180px] truncate text-sm text-white/90">{current.album.name}</div>
          </div>
          <button
            type="button"
            aria-label="评论"
            onClick={() => {
              setFullOpen(false);
              navigate(`/comments/${current.id}`);
            }}
            className="flex h-11 w-11 items-center justify-center"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </header>

        <div
          className="relative z-10 mx-auto mt-2 flex min-h-0 w-full flex-1 flex-col"
          onTouchStart={onSwipeStart}
          onTouchEnd={onSwipeEnd}
        >
          {lyricsOpen ? (
            <LyricScroller lines={lyrics} currentTime={currentTime} onSeek={seek} />
          ) : (
            <div
              className="flex h-full flex-col items-center justify-center px-6"
              onClick={() => {
                if (gesture.current.swiped) return;
                setLyricsOpen(true);
              }}
            >
              <div className="relative">
                <div className="absolute inset-3 rounded-full bg-black/50 blur-md" />
                <Cover
                  src={current.album.picUrl}
                  alt={current.name}
                  size={640}
                  rounded="rounded-full"
                  className={`relative h-[62vw] max-h-[300px] w-[62vw] max-w-[300px] ring-8 ring-black/40 ${
                    playing ? "vinyl" : "vinyl is-paused"
                  }`}
                />
              </div>
              <LyricPreview lines={lyrics} currentTime={currentTime} onOpen={() => setLyricsOpen(true)} />
            </div>
          )}
        </div>

        <div className="relative z-10 flex justify-center gap-1.5 py-2">
          <span className={`h-1 rounded-full ${lyricsOpen ? "w-1 bg-white/35" : "w-3 bg-white"}`} />
          <span className={`h-1 rounded-full ${lyricsOpen ? "w-3 bg-white" : "w-1 bg-white/35"}`} />
        </div>

        <div className="relative z-10 px-6 pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <button type="button" className="min-w-0 text-left" onClick={() => setLyricsOpen(!lyricsOpen)}>
              <h1 className="truncate text-2xl font-semibold">{current.name}</h1>
              <p className="mt-1 truncate text-sm text-white/70">{artistText(current)}</p>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleQuality}
                className="rounded-full border border-white/25 px-2.5 py-1 text-[11px] tracking-wide"
              >
                {QUALITY_LABEL[quality]}
              </button>
              {current.mv ? (
                <button
                  type="button"
                  onClick={() => {
                    setFullOpen(false);
                    navigate(`/mv/${current.mv}`);
                  }}
                  className="rounded-full border border-white/25 px-2.5 py-1 text-[11px]"
                >
                  MV
                </button>
              ) : null}
              <button
                type="button"
                aria-label={isLiked(current.id) ? "取消喜欢" : "喜欢"}
                onClick={() => toggleLike(current)}
                className="flex h-11 w-11 items-center justify-center"
              >
                <Heart
                  className={`h-6 w-6 ${
                    isLiked(current.id) ? "fill-[#E83C3C] text-[#E83C3C]" : "text-white"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <SeekBar
              currentTime={currentTime}
              duration={duration}
              buffered={buffered}
              onSeek={seek}
            />
          </div>

          <div className="mt-2 flex items-center justify-between px-2">
            <button type="button" aria-label="播放模式" onClick={cycleMode} className="h-11 w-11">
              {mode === "shuffle" ? (
                <Shuffle className="mx-auto h-5 w-5" />
              ) : mode === "single" ? (
                <Repeat1 className="mx-auto h-5 w-5" />
              ) : (
                <Repeat className="mx-auto h-5 w-5" />
              )}
            </button>
            <button type="button" aria-label="上一首" onClick={prev} className="h-12 w-12">
              <SkipBack className="mx-auto h-7 w-7 fill-white" />
            </button>
            <button
              type="button"
              aria-label={playing ? "暂停" : "播放"}
              onClick={toggle}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,.35)]"
            >
              {playing && !loading ? (
                <Pause className="h-8 w-8 fill-black" />
              ) : (
                <Play className="h-8 w-8 fill-black pl-1" />
              )}
            </button>
            <button type="button" aria-label="下一首" onClick={next} className="h-12 w-12">
              <SkipForward className="mx-auto h-7 w-7 fill-white" />
            </button>
            <button
              type="button"
              aria-label="播放列表"
              onClick={() => setQueueOpen(true)}
              className="h-11 w-11"
            >
              <ListMusic className="mx-auto h-5 w-5" />
            </button>
          </div>
        </div>

        {queueOpen ? (
          <div className="absolute inset-0 z-20 bg-black/50" onClick={() => setQueueOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 max-h-[70%] overflow-y-auto rounded-t-3xl bg-[#141418] pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#141418] px-4 py-3">
                <h3 className="font-medium">当前播放 · {queue.length}</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm text-[#E83C3C]"
                    onClick={() => {
                      void fetchSimiSongs(current.id).then((songs) => {
                        if (songs.length) playTracks([current, ...songs.filter((s) => s.id !== current.id)], 0);
                      });
                    }}
                  >
                    相似歌曲
                  </button>
                  <button type="button" onClick={() => setQueueOpen(false)} className="text-sm text-[#8E8A96]">
                    关闭
                  </button>
                </div>
              </div>
              {queue.map((track, i) => (
                <SongRow key={`${track.id}-${i}`} track={track} tracks={queue} index={i} showIndex />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
