import { ChevronLeft, MessageCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchPlaylistDetail, fetchRelatedPlaylists } from "../api/client";
import type { PlaylistCard as PlaylistCardType, Track } from "../api/types";
import Cover from "../components/Cover";
import PlaylistCard from "../components/PlaylistCard";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";
import { formatCount, imgUrl } from "../utils/format";

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{
    name: string;
    coverImgUrl: string;
    description?: string;
    playCount: number;
    trackCount: number;
    tags?: string[];
    creator?: { nickname?: string; avatarUrl?: string };
    tracks: Track[];
  } | null>(null);
  const [related, setRelated] = useState<PlaylistCardType[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPlaylistDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    fetchRelatedPlaylists(id).then(setRelated).catch(() => setRelated([]));
  }, [id]);

  if (loading) return <p className="px-4 pt-16 text-sm text-[#8E8A96]">歌单加载中...</p>;
  if (!detail) return <p className="px-4 pt-16 text-sm text-[#8E8A96]">歌单走丢了</p>;

  return (
    <div>
      <div className="relative overflow-hidden pb-5">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: `url(${imgUrl(detail.coverImgUrl, 400)})` }}
        />
        <div className="absolute inset-0 bg-[#09090B]/55" />
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate(-1)}
          className="relative z-10 ml-2 mt-[max(10px,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="relative z-10 flex gap-4 px-4 pt-2">
          <Cover src={detail.coverImgUrl} alt={detail.name} size={320} className="h-32 w-32 shadow-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-7">{detail.name}</h1>
            <p className="mt-2 text-xs text-white/70">
              {detail.creator?.nickname ?? "歌单"} · {formatCount(detail.playCount)} 次播放
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(detail.tags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        {detail.description ? (
          <p className="relative z-10 mt-4 line-clamp-2 px-4 text-xs leading-5 text-white/70">
            {detail.description}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => playTracks(detail.tracks, 0)}
          className="relative z-10 mx-4 mt-4 flex h-11 w-[calc(100%-32px)] items-center justify-center gap-2 rounded-full bg-[#E83C3C] font-medium"
        >
          <Play className="h-4 w-4 fill-white" /> 播放全部 · {detail.tracks.length} 首
        </button>
        <Link
          to={`/comments/${id}?type=playlist`}
          className="relative z-10 mx-4 mt-3 flex items-center justify-center gap-1 text-sm text-white/75"
        >
          <MessageCircle className="h-4 w-4" /> 评论
        </Link>
      </div>
      <div className="pt-2">
        {detail.tracks.map((track, i) => (
          <SongRow key={track.id} track={track} tracks={detail.tracks} index={i} showIndex showCover={false} />
        ))}
      </div>
      {related.length ? (
        <section className="mt-6 px-4 pb-4">
          <h2 className="mb-3 text-sm text-[#8E8A96]">相似歌单</h2>
          <div className="grid grid-cols-3 gap-3">
            {related.slice(0, 6).map((item) => (
              <PlaylistCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
