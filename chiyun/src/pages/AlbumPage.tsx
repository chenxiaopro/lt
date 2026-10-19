import { ChevronLeft, MessageCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAlbumDetail } from "../api/client";
import type { Track } from "../api/types";
import Cover from "../components/Cover";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [album, setAlbum] = useState<{
    name: string;
    picUrl: string;
    description?: string;
    artist?: { id: number; name: string };
  } | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchAlbumDetail(id).then((res) => {
      setAlbum(res.album ?? null);
      setTracks(res.tracks);
    });
  }, [id]);

  if (!album) return <p className="px-4 pt-16 text-sm text-[#8E8A96]">专辑加载中...</p>;

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
      <div className="flex flex-col items-center px-6">
        <Cover src={album.picUrl} alt={album.name} size={400} className="h-52 w-52 shadow-2xl" />
        <h1 className="mt-4 text-center text-2xl font-semibold">{album.name}</h1>
        {album.artist ? (
          <Link to={`/artist/${album.artist.id}`} className="mt-2 text-sm text-[#E83C3C]">
            {album.artist.name}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => playTracks(tracks, 0)}
          className="mt-4 flex h-11 items-center gap-2 rounded-full bg-[#E83C3C] px-6"
        >
          <Play className="h-4 w-4 fill-white" /> 播放全部
        </button>
        {id ? (
          <Link to={`/comments/${id}?type=album`} className="mt-3 flex items-center gap-1 text-sm text-[#8E8A96]">
            <MessageCircle className="h-4 w-4" /> 评论
          </Link>
        ) : null}
      </div>
      <div className="mt-6">
        {tracks.map((track, i) => (
          <SongRow key={track.id} track={track} tracks={tracks} index={i} showIndex showCover={false} />
        ))}
      </div>
    </div>
  );
}
