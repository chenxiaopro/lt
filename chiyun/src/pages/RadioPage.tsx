import { ChevronLeft, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchHotRadios, fetchRadioDetail, fetchRadioPrograms } from "../api/client";
import type { RadioItem, Track } from "../api/types";
import Cover from "../components/Cover";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";
import { formatCount } from "../utils/format";

export default function RadioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [hot, setHot] = useState<RadioItem[]>([]);
  const [detail, setDetail] = useState<(RadioItem & { desc?: string }) | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!id || id === "hot") {
      fetchHotRadios().then(setHot);
      return;
    }
    const rid = Number(id);
    Promise.all([fetchRadioDetail(rid), fetchRadioPrograms(rid)]).then(([radio, programs]) => {
      setDetail(radio ?? null);
      setTracks(programs.map((p) => p.track).filter((t): t is Track => Boolean(t)));
    });
  }, [id]);

  if (!id || id === "hot") {
    return (
      <div>
        <header className="flex items-center gap-1 px-2 pt-[max(10px,env(safe-area-inset-top))]">
          <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">精选播客</h1>
        </header>
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {hot.map((radio) => (
            <Link key={radio.id} to={`/radio/${radio.id}`} className="pressable">
              <Cover src={radio.picUrl} alt={radio.name} size={320} className="aspect-square w-full" rounded="rounded-2xl" />
              <p className="mt-2 line-clamp-2 text-sm">{radio.name}</p>
              <p className="text-xs text-[#8E8A96]">{radio.category}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) return <p className="px-4 pt-16 text-sm text-[#8E8A96]">播客加载中...</p>;

  return (
    <div>
      <button
        type="button"
        aria-label="返回"
        onClick={() => navigate(-1)}
        className="ml-2 mt-[max(10px,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <div className="flex gap-4 px-4">
        <Cover src={detail.picUrl} alt={detail.name} size={280} className="h-28 w-28" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{detail.name}</h1>
          <p className="mt-2 text-xs text-[#8E8A96]">
            {detail.dj?.nickname} · {formatCount(detail.playCount)} 播放
          </p>
          <p className="mt-2 line-clamp-3 text-xs text-white/70">{detail.desc || detail.rcmdtext}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => playTracks(tracks, 0)}
        className="mx-4 mt-4 flex h-11 w-[calc(100%-32px)] items-center justify-center gap-2 rounded-full bg-[#E83C3C]"
      >
        <Play className="h-4 w-4 fill-white" /> 播放节目
      </button>
      <div className="mt-4">
        {tracks.map((track, i) => (
          <SongRow key={`${track.id}-${i}`} track={track} tracks={tracks} index={i} />
        ))}
      </div>
    </div>
  );
}
