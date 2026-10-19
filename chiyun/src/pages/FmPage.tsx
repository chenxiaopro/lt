import { ChevronLeft, Radio, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { artistText, fetchPersonalFm } from "../api/client";
import type { Track } from "../api/types";
import Cover from "../components/Cover";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";

export default function FmPage() {
  const navigate = useNavigate();
  const { playTracks, next, current, playing, toggle } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState("");

  const load = (autoPlay: boolean) => {
    fetchPersonalFm()
      .then((list) => {
        setTracks(list);
        setError(list.length ? "" : "暂时没有私人 FM 内容");
        if (autoPlay && list.length) playTracks(list, 0);
      })
      .catch(() => setError("私人 FM 暂不可用"));
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (tracks.length < 2) {
      load(true);
      return;
    }
    next();
  };

  const coverTrack = current && tracks.some((t) => t.id === current.id) ? current : tracks[0];

  return (
    <div>
      <div className="bg-gradient-to-b from-[#5b6cff] to-[#09090B] px-4 pb-8 pt-[max(10px,env(safe-area-inset-top))]">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="mt-4 flex items-center gap-2 text-white/80">
          <Radio className="h-4 w-4" />
          <span className="text-sm tracking-[0.2em]">PRIVATE FM</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold">私人 FM</h1>
        <p className="mt-2 text-sm text-white/75">随心听，下一首就是新口味</p>
        {coverTrack ? (
          <div className="mt-6 flex items-center gap-4">
            <Cover src={coverTrack.album.picUrl} alt={coverTrack.name} size={320} className="h-28 w-28 shadow-2xl" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-semibold">{coverTrack.name}</div>
              <div className="mt-1 truncate text-sm text-white/70">{artistText(coverTrack)}</div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded-full bg-white px-4 py-2 text-sm text-black"
                >
                  {playing ? "暂停" : "继续播放"}
                </button>
                <button
                  type="button"
                  onClick={skip}
                  className="flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-sm"
                >
                  <SkipForward className="h-4 w-4" /> 下一首
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="px-4 py-6 text-sm text-[#8E8A96]">{error}</p> : null}
      {tracks.map((track, i) => (
        <SongRow key={track.id} track={track} tracks={tracks} index={i} />
      ))}
    </div>
  );
}
