import { Clock3, Heart, Play } from "lucide-react";
import { useMemo } from "react";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";
import { loadJson } from "../utils/format";
import type { Track } from "../api/types";

export default function MinePage() {
  const { recent, playTracks, likedIds } = usePlayer();
  const likedTracks = useMemo(
    () => loadJson<Track[]>("chiyun-liked-tracks", []).filter((t) => likedIds.includes(t.id)),
    [likedIds],
  );

  return (
    <div>
      <header className="px-4 pb-4 pt-[max(20px,env(safe-area-inset-top))]">
        <div className="rounded-3xl bg-gradient-to-br from-[#E83C3C] via-[#b4232a] to-[#3a1014] p-5">
          <p className="logo-font text-sm tracking-[0.4em] text-white/70">CHIYUN</p>
          <h1 className="mt-2 text-3xl font-semibold">我的音乐库</h1>
          <p className="mt-2 text-sm text-white/75">本地收藏与最近播放，跟着感觉走</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => likedTracks.length && playTracks(likedTracks, 0)}
            className="pressable flex items-center gap-3 rounded-2xl bg-[#141418] p-4 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E83C3C]/20 text-[#E83C3C]">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <span>
              <div className="text-sm">我喜欢</div>
              <div className="text-xs text-[#8E8A96]">{likedTracks.length} 首</div>
            </span>
          </button>
          <button
            type="button"
            onClick={() => recent.length && playTracks(recent, 0)}
            className="pressable flex items-center gap-3 rounded-2xl bg-[#141418] p-4 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
              <Clock3 className="h-5 w-5" />
            </span>
            <span>
              <div className="text-sm">最近播放</div>
              <div className="text-xs text-[#8E8A96]">{recent.length} 首</div>
            </span>
          </button>
        </div>
      </header>

      <section>
        <div className="mb-1 flex items-center justify-between px-4">
          <h2 className="text-lg font-semibold">我喜欢的音乐</h2>
          {likedTracks.length ? (
            <button
              type="button"
              onClick={() => playTracks(likedTracks, 0)}
              className="flex items-center gap-1 text-xs text-[#E83C3C]"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> 播放
            </button>
          ) : null}
        </div>
        {likedTracks.length ? (
          likedTracks.map((track, i) => (
            <SongRow key={track.id} track={track} tracks={likedTracks} index={i} />
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-[#8E8A96]">还没有喜欢的歌，去发现页点红心吧</p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="mb-1 px-4 text-lg font-semibold">最近播放</h2>
        {recent.length ? (
          recent.map((track, i) => <SongRow key={`${track.id}-${i}`} track={track} tracks={recent} index={i} />)
        ) : (
          <p className="px-4 py-6 text-sm text-[#8E8A96]">听过的歌会出现在这里</p>
        )}
      </section>
    </div>
  );
}
