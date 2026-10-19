import { Play } from "lucide-react";
import { artistText } from "../api/client";
import type { Track } from "../api/types";
import { formatDuration } from "../utils/format";
import { usePlayer } from "../store/PlayerContext";
import Cover from "./Cover";

export default function SongRow({
  track,
  tracks,
  index,
  showCover = true,
  showIndex = false,
}: {
  track: Track;
  tracks: Track[];
  index: number;
  showCover?: boolean;
  showIndex?: boolean;
}) {
  const { playTracks, current, playing } = usePlayer();
  const active = current?.id === track.id;

  return (
    <button
      type="button"
      onClick={() => playTracks(tracks, index)}
      className="pressable flex w-full items-center gap-3 px-4 py-2.5 text-left"
    >
      {showIndex ? (
        <span
          className={`w-6 shrink-0 text-center text-sm tabular-nums ${
            active ? "text-[#E83C3C]" : "text-[#8E8A96]"
          }`}
        >
          {index + 1}
        </span>
      ) : null}
      {showCover ? (
        <div className="relative h-12 w-12 shrink-0">
          <Cover src={track.album.picUrl} alt={track.name} size={120} className="h-12 w-12" />
          {active && playing ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Play className="h-4 w-4 fill-white text-white" />
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[15px] ${active ? "text-[#E83C3C]" : "text-[#F4F1EA]"}`}>
          {track.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-[#8E8A96]">
          {artistText(track)} · {track.album.name}
        </div>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-[#8E8A96]">
        {formatDuration(track.duration)}
      </span>
    </button>
  );
}
