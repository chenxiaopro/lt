import { ChevronLeft, Heart, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchAlbumDetail,
  fetchCommentsByType,
  fetchMvDetail,
  fetchPlaylistDetail,
  fetchSongDetail,
} from "../api/client";
import type { CommentItem, Track } from "../api/types";
import Cover from "../components/Cover";
import { usePlayer } from "../store/PlayerContext";
import { formatCount, imgUrl } from "../utils/format";

type CommentKind = "music" | "playlist" | "album" | "mv";

export default function CommentsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const kind = (params.get("type") as CommentKind) || "music";
  const [cover, setCover] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [track, setTrack] = useState<Track | null>(null);
  const [hot, setHot] = useState<CommentItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!id) return;
    const songId = Number(id);
    setTrack(null);
    if (kind === "music") {
      fetchSongDetail([songId])
        .then((songs) => {
          const song = songs[0];
          if (!song) return;
          setTrack(song);
          setCover(song.album.picUrl);
          setTitle(song.name);
          setSubtitle(song.artists.map((a) => a.name).join(" / "));
        })
        .catch(() => {});
    } else if (kind === "playlist") {
      fetchPlaylistDetail(id)
        .then((detail) => {
          setCover(detail.coverImgUrl);
          setTitle(detail.name);
          setSubtitle(`${formatCount(detail.playCount)} 次播放`);
        })
        .catch(() => {});
    } else if (kind === "album") {
      fetchAlbumDetail(id)
        .then((res) => {
          setCover(res.album?.picUrl || "");
          setTitle(res.album?.name || "专辑");
          setSubtitle(res.album?.artist?.name || "");
        })
        .catch(() => {});
    } else {
      fetchMvDetail(id)
        .then((mv) => {
          setCover(mv?.cover || "");
          setTitle(mv?.name || "MV");
          setSubtitle(mv?.artistName || "");
        })
        .catch(() => {});
    }
    fetchCommentsByType(songId, kind, 0, 30).then((res) => {
      setHot(res.hot);
      setComments(res.comments);
      setTotal(res.total);
    });
  }, [id, kind]);

  const playThis = () => {
    if (track) playTracks([track], 0);
  };

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-[#09090B]/90 px-2 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">评论 {total ? `(${formatCount(total)})` : ""}</h1>
      </header>

      {title ? (
        <button
          type="button"
          onClick={playThis}
          className="mx-4 mb-4 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl bg-[#141418] p-3 text-left"
        >
          <Cover src={cover} alt={title} size={120} className="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <div className="truncate">{title}</div>
            <div className="truncate text-xs text-[#8E8A96]">{subtitle}</div>
          </div>
          {track ? <Play className="h-5 w-5 text-[#E83C3C]" /> : null}
        </button>
      ) : null}

      {hot.length ? (
        <section className="px-4">
          <h2 className="mb-2 text-sm text-[#8E8A96]">精彩评论</h2>
          {hot.map((item) => (
            <CommentCard key={item.commentId} item={item} />
          ))}
        </section>
      ) : null}

      <section className="mt-4 px-4">
        <h2 className="mb-2 text-sm text-[#8E8A96]">最新评论</h2>
        {comments.map((item) => (
          <CommentCard key={item.commentId} item={item} />
        ))}
      </section>
    </div>
  );
}

function CommentCard({ item }: { item: CommentItem }) {
  return (
    <article className="border-b border-white/5 py-3">
      <div className="flex items-center gap-2">
        <img
          src={imgUrl(item.user.avatarUrl, 80)}
          alt={item.user.nickname}
          className="h-8 w-8 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.user.nickname}</div>
          <div className="text-[11px] text-[#8E8A96]">{item.timeStr}</div>
        </div>
        <span className="flex items-center gap-1 text-xs text-[#8E8A96]">
          <Heart className="h-3.5 w-3.5" />
          {formatCount(item.likedCount)}
        </span>
      </div>
      <p className="mt-2 text-[15px] leading-6 text-[#F4F1EA]/90">{item.content}</p>
    </article>
  );
}
