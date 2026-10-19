import { Heart, Pause, Play } from "lucide-react";
import { artistText } from "../api/client";
import { usePlayer, usePlayerTime } from "../store/PlayerContext";
import Cover from "./Cover";

export default function MiniPlayer() {
  const { current, playing, loading, toggle, setFullOpen, toggleLike, isLiked } = usePlayer();
  const { currentTime, duration } = usePlayerTime();
  if (!current) return null;

  const played = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="relative border-t border-white/5 bg-[#121218]/95 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFullOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Cover
            src={current.album.picUrl}
            alt={current.name}
            size={120}
            className={`h-11 w-11 ${playing ? "vinyl" : "vinyl is-paused"}`}
            rounded="rounded-full"
          />
          <div className="min-w-0">
            <div className="truncate text-sm">{current.name}</div>
            <div className="truncate text-xs text-[#8E8A96]">{artistText(current)}</div>
          </div>
        </button>
        <button
          type="button"
          aria-label={isLiked(current.id) ? "取消喜欢" : "喜欢"}
          onClick={() => toggleLike(current)}
          className="flex h-11 w-11 items-center justify-center"
        >
          <Heart
            className={`h-5 w-5 ${isLiked(current.id) ? "fill-[#E83C3C] text-[#E83C3C]" : "text-[#F4F1EA]"}`}
          />
        </button>
        <button
          type="button"
          aria-label={playing ? "暂停" : "播放"}
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E83C3C] text-white"
        >
          {playing && !loading ? (
            <Pause className="h-5 w-5 fill-white" />
          ) : (
            <Play className="h-5 w-5 fill-white pl-0.5" />
          )}
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
        <div className="h-full bg-[#E83C3C]" style={{ width: `${played}%` }} />
      </div>
    </div>
  );
}
