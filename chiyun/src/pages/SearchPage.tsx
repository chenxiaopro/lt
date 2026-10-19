import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchHotSearch,
  fetchSuggest,
  searchArtists,
  searchPlaylists,
  searchSongs,
  searchAlbums,
  searchMvs,
  searchRadios,
} from "../api/client";
import type { AlbumCard, MvItem, PlaylistCard as PlaylistCardType, RadioItem, Track } from "../api/types";
import Cover from "../components/Cover";
import { AlbumTile, MvTile, RadioTile } from "../components/MediaCard";
import PlaylistCard from "../components/PlaylistCard";
import SongRow from "../components/SongRow";

const tabs = ["单曲", "歌单", "专辑", "歌手", "MV", "播客"] as const;

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [hot, setHot] = useState<Array<{ searchWord: string; content?: string }>>([]);
  const [suggest, setSuggest] = useState<Array<{ keyword: string }>>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]>("单曲");
  const [songs, setSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistCardType[]>([]);
  const [artists, setArtists] = useState<Array<{ id: number; name: string; picUrl: string }>>([]);
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [mvs, setMvs] = useState<MvItem[]>([]);
  const [radios, setRadios] = useState<RadioItem[]>([]);
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHotSearch().then(setHot).catch(() => {});
  }, []);

  useEffect(() => {
    if (!keyword.trim()) {
      setSuggest([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetchSuggest(keyword.trim()).then(setSuggest).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const runSearch = async (text: string, nextTab = tab) => {
    const q = text.trim();
    if (!q) return;
    setKeyword(q);
    setSearched(q);
    setSuggest([]);
    setLoading(true);
    try {
      if (nextTab === "单曲") {
        const res = await searchSongs(q);
        setSongs(res.songs);
      } else if (nextTab === "歌单") {
        const res = await searchPlaylists(q);
        setPlaylists(res.playlists);
      } else if (nextTab === "专辑") {
        const res = await searchAlbums(q);
        setAlbums(res.albums);
      } else if (nextTab === "MV") {
        const res = await searchMvs(q);
        setMvs(res.mvs);
      } else if (nextTab === "播客") {
        const res = await searchRadios(q);
        setRadios(res.radios);
      } else {
        const res = await searchArtists(q);
        setArtists(res.artists);
      }
    } finally {
      setLoading(false);
    }
  };

  const empty = useMemo(() => {
    if (!searched || loading) return false;
    if (tab === "单曲") return songs.length === 0;
    if (tab === "歌单") return playlists.length === 0;
    if (tab === "专辑") return albums.length === 0;
    if (tab === "MV") return mvs.length === 0;
    if (tab === "播客") return radios.length === 0;
    return artists.length === 0;
  }, [albums.length, artists.length, loading, mvs.length, playlists.length, radios.length, searched, songs.length, tab]);

  return (
    <div>
      <header className="sticky top-0 z-20 bg-[#09090B]/90 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(keyword);
          }}
          className="flex items-center gap-2"
        >
          <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#1c1c22] px-4">
            <Search className="h-4 w-4 text-[#8E8A96]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="歌曲、歌手、歌单、专辑、MV"
              className="h-full w-full bg-transparent text-sm outline-none"
              enterKeyHint="search"
            />
            {keyword ? (
              <button type="button" aria-label="清空" onClick={() => setKeyword("")}>
                <X className="h-4 w-4 text-[#8E8A96]" />
              </button>
            ) : null}
          </label>
          <button type="submit" className="text-sm text-[#E83C3C]">
            搜索
          </button>
        </form>
      </header>

      {!searched ? (
        <div className="px-4">
          {suggest.length ? (
            <div className="mb-4 overflow-hidden rounded-2xl bg-[#141418]">
              {suggest.map((item) => (
                <button
                  key={item.keyword}
                  type="button"
                  onClick={() => void runSearch(item.keyword)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
                >
                  <Search className="h-4 w-4 text-[#8E8A96]" />
                  {item.keyword}
                </button>
              ))}
            </div>
          ) : null}
          <h2 className="mb-3 text-sm text-[#8E8A96]">热搜榜</h2>
          <div className="flex flex-wrap gap-2">
            {hot.map((item, i) => (
              <button
                key={item.searchWord}
                type="button"
                onClick={() => void runSearch(item.searchWord)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  i < 3 ? "bg-[#E83C3C]/15 text-[#E83C3C]" : "bg-[#1c1c22] text-[#F4F1EA]"
                }`}
              >
                {item.searchWord}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="hide-scrollbar flex gap-6 overflow-x-auto px-4">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                  void runSearch(searched, item);
                }}
                className={`shrink-0 pb-2 text-sm ${
                  tab === item ? "border-b-2 border-[#E83C3C] font-medium text-white" : "text-[#8E8A96]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {loading ? <p className="px-4 py-8 text-sm text-[#8E8A96]">正在搜索...</p> : null}
          {empty ? <p className="px-4 py-8 text-sm text-[#8E8A96]">没有找到相关内容</p> : null}
          {tab === "单曲" && !loading
            ? songs.map((track, i) => <SongRow key={track.id} track={track} tracks={songs} index={i} />)
            : null}
          {tab === "歌单" && !loading ? (
            <div className="grid grid-cols-3 gap-3 px-4 pt-3">
              {playlists.map((item) => (
                <PlaylistCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
          {tab === "歌手" && !loading ? (
            <div className="px-2 pt-2">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artist/${artist.id}`}
                  className="flex items-center gap-3 px-2 py-2.5"
                >
                  <Cover src={artist.picUrl} alt={artist.name} size={120} rounded="rounded-full" className="h-12 w-12" />
                  <span>{artist.name}</span>
                </Link>
              ))}
            </div>
          ) : null}
          {tab === "专辑" && !loading ? (
            <div className="grid grid-cols-3 gap-3 px-4 pt-3">
              {albums.map((item) => (
                <AlbumTile key={item.id} item={item} />
              ))}
            </div>
          ) : null}
          {tab === "MV" && !loading ? (
            <div className="grid grid-cols-2 gap-3 px-4 pt-3">
              {mvs.map((item) => (
                <MvTile key={item.id} item={item} />
              ))}
            </div>
          ) : null}
          {tab === "播客" && !loading ? (
            <div className="grid grid-cols-2 gap-3 px-4 pt-3">
              {radios.map((item) => (
                <RadioTile key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
