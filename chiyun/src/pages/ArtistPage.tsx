import { ChevronLeft, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchArtistAlbums, fetchArtistDesc, fetchArtistDetail, fetchArtistMvs } from "../api/client";
import type { AlbumCard, MvItem, Track } from "../api/types";
import { AlbumTile, MvTile } from "../components/MediaCard";
import SongRow from "../components/SongRow";
import { usePlayer } from "../store/PlayerContext";
import { imgUrl } from "../utils/format";

const tabs = ["歌曲", "专辑", "MV"] as const;

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [artist, setArtist] = useState<{
    name: string;
    picUrl?: string;
    img1v1Url?: string;
    briefDesc?: string;
  } | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [mvs, setMvs] = useState<MvItem[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]>("歌曲");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchArtistDetail(id),
      fetchArtistAlbums(id, 30).catch(() => []),
      fetchArtistMvs(id, 20).catch(() => []),
      fetchArtistDesc(id).catch(() => ""),
    ]).then(([detail, albumList, mvList, desc]) => {
      setArtist({
        ...(detail.artist ?? { name: "歌手" }),
        briefDesc: detail.artist?.briefDesc || desc,
      });
      setTracks(detail.tracks);
      setAlbums(albumList);
      setMvs(mvList);
    });
  }, [id]);

  if (!artist) return <p className="px-4 pt-16 text-sm text-[#8E8A96]">歌手加载中...</p>;
  const pic = artist.picUrl || artist.img1v1Url || "";

  return (
    <div>
      <div className="relative h-64 overflow-hidden">
        <img src={imgUrl(pic, 800)} alt={artist.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/20 to-black/20" />
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate(-1)}
          className="absolute left-2 top-[max(10px,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-3xl font-semibold">{artist.name}</h1>
          <p className="mt-2 line-clamp-2 text-xs text-white/70">{artist.briefDesc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex gap-5">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`pb-1 text-sm ${
                tab === item ? "border-b-2 border-[#E83C3C] font-medium text-white" : "text-[#8E8A96]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "歌曲" ? (
          <button
            type="button"
            onClick={() => playTracks(tracks, 0)}
            className="flex items-center gap-1 rounded-full bg-[#E83C3C] px-3 py-1.5 text-sm"
          >
            <Play className="h-3.5 w-3.5 fill-white" /> 播放
          </button>
        ) : null}
      </div>
      {tab === "歌曲"
        ? tracks.map((track, i) => (
            <SongRow key={track.id} track={track} tracks={tracks} index={i} showIndex />
          ))
        : null}
      {tab === "专辑" ? (
        <div className="grid grid-cols-3 gap-3 px-4 pb-4">
          {albums.map((item) => (
            <AlbumTile key={item.id} item={item} />
          ))}
        </div>
      ) : null}
      {tab === "MV" ? (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {mvs.map((item) => (
            <MvTile key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
