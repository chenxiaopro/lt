import { ChevronLeft, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDailySongs } from "../api/client";
import type { Track } from "../api/types";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";

export default function DailyPage() {
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const day = new Date().getDate();

  useEffect(() => {
    fetchDailySongs().then(setTracks).catch(() => setTracks([]));
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-b from-[#E83C3C] to-[#09090B] px-4 pb-6 pt-[max(10px,env(safe-area-inset-top))]">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="mt-6 text-7xl font-semibold leading-none">{day}</p>
        <h1 className="mt-3 text-2xl font-semibold">每日推荐</h1>
        <p className="mt-2 text-sm text-white/75">根据你的口味生成，每天 6:00 更新</p>
        <button
          type="button"
          onClick={() => playTracks(tracks, 0)}
          className="mt-5 flex h-11 items-center gap-2 rounded-full bg-white px-5 text-black"
        >
          <Play className="h-4 w-4 fill-black" /> 播放全部
        </button>
      </div>
      {tracks.map((track, i) => (
        <SongRow key={track.id} track={track} tracks={tracks} index={i} />
      ))}
    </div>
  );
}
