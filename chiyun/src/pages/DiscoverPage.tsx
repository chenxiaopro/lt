import { ChevronRight, Clapperboard, Disc3, Radio, Search, Sparkles, Trophy, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchBanners,
  fetchHotArtists,
  fetchHotRadios,
  fetchNewSongs,
  fetchPersonalized,
  fetchNewAlbums,
  fetchPersonalizedMv,
  fetchSongDetail,
} from "../api/client";
import type { AlbumCard, BannerItem, MvItem, PlaylistCard as PlaylistCardType, RadioItem, Track } from "../api/types";
import Cover from "../components/Cover";
import { AlbumTile, MvTile } from "../components/MediaCard";
import PlaylistCard from "../components/PlaylistCard";
import Section from "../components/Section";
import { Line, Rect } from "../components/Skeleton";
import SongRow from "../components/SongRow";
import { imgUrl } from "../utils/format";
import { usePlayer } from "../store/PlayerContext";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistCardType[]>([]);
  const [songs, setSongs] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Array<{ id: number; name: string; picUrl: string }>>([]);
  const [radios, setRadios] = useState<RadioItem[]>([]);
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [mvs, setMvs] = useState<MvItem[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchBanners().catch(() => [] as BannerItem[]),
      fetchPersonalized(12).catch(() => [] as PlaylistCardType[]),
      fetchNewSongs(8).catch(() => [] as Track[]),
      fetchHotArtists(10).catch(() => []),
      fetchHotRadios().catch(() => [] as RadioItem[]),
      fetchNewAlbums().catch(() => [] as AlbumCard[]),
      fetchPersonalizedMv().catch(() => [] as MvItem[]),
    ])
      .then(([b, p, s, a, r, albums, mvs]) => {
        if (!alive) return;
        setBanners(b);
        setPlaylists(p);
        setSongs(s);
        setArtists(a);
        setRadios(r.slice(0, 8));
        setAlbums(albums.slice(0, 6));
        setMvs(mvs.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const openBanner = (item: BannerItem) => {
    if (item.targetType === 1 && item.targetId) {
      void fetchSongDetail([item.targetId]).then((list) => {
        if (list[0]) playTracks(list, 0);
      });
      return;
    }
    if (item.targetType === 10 && item.targetId) navigate(`/album/${item.targetId}`);
    else if (item.targetType === 100 && item.targetId) navigate(`/artist/${item.targetId}`);
    else if (item.targetType === 1000 && item.targetId) navigate(`/playlist/${item.targetId}`);
    else if (item.targetType === 1004 && item.targetId) navigate(`/mv/${item.targetId}`);
    else if (item.targetType === 1009 && item.targetId) navigate(`/radio/${item.targetId}`);
    else if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#09090B]/90 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E83C3C] text-white">
            <Disc3 className="h-4 w-4" />
          </span>
          <span className="logo-font text-xl font-extrabold tracking-tight">赤云</span>
        </div>
        <Link
          to="/search"
          className="flex h-10 flex-1 items-center gap-2 rounded-full bg-[#1c1c22] px-4 text-sm text-[#8E8A96]"
        >
          <Search className="h-4 w-4" />
          搜索歌曲、歌手、歌单
        </Link>
      </header>

      <div className="px-4">
        {loading ? (
          <Rect className="aspect-[16/7] w-full" />
        ) : banners.length ? (
          <div className="relative overflow-hidden rounded-2xl">
            <button type="button" onClick={() => openBanner(banners[bannerIndex])} className="block w-full">
              <img
                src={imgUrl(banners[bannerIndex].imageUrl, 800)}
                alt={banners[bannerIndex].typeTitle || "推荐"}
                className="aspect-[16/7] w-full object-cover"
              />
            </button>
            <span className="absolute bottom-2 right-2 rounded bg-[#E83C3C] px-1.5 py-0.5 text-[10px] text-white">
              {banners[bannerIndex].typeTitle}
            </span>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 张`}
                  onClick={() => setBannerIndex(i)}
                  className={`h-1.5 rounded-full ${i === bannerIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-4 px-2">
        {[
          { to: "/daily", label: "每日推荐", icon: Sparkles, tone: "from-[#E83C3C] to-[#ff7a59]" },
          { to: "/fm", label: "私人FM", icon: Waves, tone: "from-[#5b6cff] to-[#8ea2ff]" },
          { to: "/square", label: "歌单", icon: Disc3, tone: "from-[#21c07a] to-[#7ee0b0]" },
          { to: "/rank", label: "排行榜", icon: Trophy, tone: "from-[#f0b429] to-[#f7d27c]" },
          { to: "/albums", label: "新碟", icon: Disc3, tone: "from-[#c45cff] to-[#f0a0ff]" },
          { to: "/mv", label: "MV", icon: Clapperboard, tone: "from-[#ff5d8f] to-[#ff9bb8]" },
          { to: "/radio/hot", label: "播客", icon: Radio, tone: "from-[#2ec4b6] to-[#7ee0d6]" },
          { to: "/search", label: "搜索", icon: Search, tone: "from-[#8E8A96] to-[#c9c6cf]" },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="pressable flex flex-col items-center gap-2 py-2">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}
            >
              <item.icon className="h-5 w-5" />
            </span>
            <span className="text-xs text-[#F4F1EA]">{item.label}</span>
          </Link>
        ))}
      </div>

      <Section
        title="推荐歌单"
        extra={
          <Link to="/square" className="flex items-center text-xs text-[#8E8A96]">
            更多 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="grid grid-cols-3 gap-3 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Rect className="aspect-square" />
                <Line className="mt-2 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 px-4">
            {playlists.slice(0, 6).map((item) => (
              <PlaylistCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </Section>

      <Section title="新歌速递">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <Rect className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Line className="w-2/3" />
                  <Line className="mt-2 w-1/3" />
                </div>
              </div>
            ))
          : songs.map((track, i) => (
              <SongRow key={track.id} track={track} tracks={songs} index={i} />
            ))}
      </Section>

      <Section
        title="新碟上架"
        extra={
          <Link to="/albums" className="flex items-center text-xs text-[#8E8A96]">
            更多 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid grid-cols-3 gap-3 px-4">
          {albums.slice(0, 6).map((item) => (
            <AlbumTile key={item.id} item={item} />
          ))}
        </div>
      </Section>

      <Section
        title="推荐 MV"
        extra={
          <Link to="/mv" className="flex items-center text-xs text-[#8E8A96]">
            更多 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 px-4">
          {mvs.slice(0, 4).map((item) => (
            <MvTile key={item.id} item={item} />
          ))}
        </div>
      </Section>

      <Section title="热门歌手">
        <div className="hide-scrollbar flex gap-4 overflow-x-auto px-4">
          {artists.map((artist) => (
            <Link key={artist.id} to={`/artist/${artist.id}`} className="pressable w-20 shrink-0 text-center">
              <Cover
                src={artist.picUrl}
                alt={artist.name}
                size={200}
                rounded="rounded-full"
                className="mx-auto h-20 w-20"
              />
              <p className="mt-2 truncate text-xs">{artist.name}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="精选播客">
        <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4">
          {radios.map((radio) => (
            <Link key={radio.id} to={`/radio/${radio.id}`} className="pressable w-28 shrink-0">
              <Cover src={radio.picUrl} alt={radio.name} size={240} rounded="rounded-2xl" className="h-28 w-28" />
              <p className="mt-2 line-clamp-2 text-xs leading-5">{radio.name}</p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
