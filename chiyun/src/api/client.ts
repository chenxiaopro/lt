import type {
  AlbumCard,
  BannerItem,
  CommentItem,
  MvItem,
  PlaylistCard,
  RadioItem,
  RankItem,
  Track,
} from "./types";
import { imgUrl } from "../utils/format";

const BASE = "/api/chiyun";

export async function api<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
  }
  const qs = search.toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`请求失败 ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

type SongLike = {
  id: number;
  name: string;
  dt?: number;
  duration?: number;
  mv?: number;
  picUrl?: string;
  ar?: { id: number; name: string }[];
  artists?: { id: number; name: string }[];
  al?: { id: number; name: string; picUrl?: string };
  album?: { id: number; name: string; picUrl?: string };
  song?: SongLike;
};

export function normalizeTrack(raw: SongLike): Track {
  const song = raw.song ?? raw;
  const artists = song.ar ?? song.artists ?? [];
  const album = song.al ?? song.album ?? { id: 0, name: "", picUrl: "" };
  return {
    id: song.id,
    name: song.name,
    artists: artists.map((a) => ({ id: a.id, name: a.name })),
    album: {
      id: album.id || 0,
      name: album.name || "",
      picUrl: album.picUrl || raw.picUrl || "",
    },
    duration: song.dt ?? song.duration ?? 0,
    mv: song.mv,
  };
}

export function artistText(track: Track) {
  return track.artists.map((a) => a.name).join(" / ") || "未知艺人";
}

export async function fetchBanners(): Promise<BannerItem[]> {
  const data = await api<{ banners?: Array<Record<string, unknown>> }>("/banner", {
    type: 1,
  });
  return (data.banners ?? []).map((b) => ({
    imageUrl: String(b.pic || b.imageUrl || ""),
    targetId: Number(b.targetId || 0),
    targetType: Number(b.targetType || 0),
    typeTitle: String(b.typeTitle || ""),
    url: b.url ? String(b.url) : undefined,
    titleColor: b.titleColor ? String(b.titleColor) : undefined,
  }));
}

export async function fetchPersonalized(limit = 12): Promise<PlaylistCard[]> {
  const data = await api<{ result?: Array<Record<string, unknown>> }>("/personalized", {
    limit,
  });
  return (data.result ?? []).map((p) => ({
    id: Number(p.id),
    name: String(p.name),
    coverImgUrl: String(p.picUrl || p.coverImgUrl || ""),
    playCount: Number(p.playCount || 0),
    trackCount: Number(p.trackCount || 0),
    copywriter: p.copywriter ? String(p.copywriter) : undefined,
  }));
}

export async function fetchNewSongs(limit = 10): Promise<Track[]> {
  const data = await api<{ result?: SongLike[] }>("/personalized/newsong", { limit });
  return (data.result ?? []).map(normalizeTrack);
}

export async function fetchDailySongs(): Promise<Track[]> {
  const data = await api<{ data?: { dailySongs?: SongLike[] } }>("/recommend/songs");
  const daily = (data.data?.dailySongs ?? []).map(normalizeTrack);
  if (daily.length) return daily;
  const fallback = await api<{ data?: SongLike[] }>("/top/song", { type: 0 });
  return (fallback.data ?? []).slice(0, 30).map(normalizeTrack);
}

export async function fetchHotArtists(limit = 12) {
  const data = await api<{
    artists?: Array<{ id: number; name: string; picUrl?: string; img1v1Url?: string }>;
  }>("/top/artists", { limit, offset: 0 });
  return (data.artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    picUrl: a.picUrl || a.img1v1Url || "",
  }));
}

export async function fetchHotRadios(): Promise<RadioItem[]> {
  const data = await api<{ djRadios?: RadioItem[] }>("/dj/hot");
  return data.djRadios ?? [];
}

export async function fetchToplists(): Promise<RankItem[]> {
  const data = await api<{ list?: RankItem[] }>("/toplist/detail");
  return data.list ?? [];
}

export async function fetchHotSearch() {
  const data = await api<{
    data?: Array<{ searchWord: string; content?: string; iconUrl?: string; score?: number }>;
  }>("/search/hot/detail");
  return data.data ?? [];
}

export async function fetchSuggest(keywords: string) {
  const data = await api<{ result?: { allMatch?: Array<{ keyword: string }> } }>(
    "/search/suggest",
    { keywords, type: "mobile" },
  );
  return data.result?.allMatch ?? [];
}

export async function searchSongs(keywords: string, offset = 0, limit = 30): Promise<{
  songs: Track[];
  total: number;
}> {
  const data = await api<{ result?: { songs?: SongLike[]; songCount?: number } }>(
    "/cloudsearch",
    { keywords, type: 1, limit, offset },
  );
  return {
    songs: (data.result?.songs ?? []).map(normalizeTrack),
    total: data.result?.songCount ?? 0,
  };
}

export async function searchPlaylists(keywords: string, offset = 0, limit = 20) {
  const data = await api<{
    result?: {
      playlists?: Array<{
        id: number;
        name: string;
        coverImgUrl: string;
        playCount: number;
        trackCount: number;
      }>;
      playlistCount?: number;
    };
  }>("/cloudsearch", { keywords, type: 1000, limit, offset });
  return {
    playlists: (data.result?.playlists ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      coverImgUrl: p.coverImgUrl,
      playCount: p.playCount,
      trackCount: p.trackCount,
    })) as PlaylistCard[],
    total: data.result?.playlistCount ?? 0,
  };
}

export async function searchArtists(keywords: string, offset = 0, limit = 20) {
  const data = await api<{
    result?: {
      artists?: Array<{ id: number; name: string; picUrl?: string; img1v1Url?: string }>;
      artistCount?: number;
    };
  }>("/cloudsearch", { keywords, type: 100, limit, offset });
  return {
    artists: (data.result?.artists ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      picUrl: a.picUrl || a.img1v1Url || "",
    })),
    total: data.result?.artistCount ?? 0,
  };
}

export async function fetchPlaylistDetail(id: string | number) {
  const data = await api<{
    playlist?: {
      id: number;
      name: string;
      coverImgUrl: string;
      description?: string;
      playCount: number;
      subscribedCount?: number;
      trackCount: number;
      tags?: string[];
      creator?: { nickname?: string; avatarUrl?: string };
      tracks?: SongLike[];
    };
  }>("/playlist/detail", { id });
  const playlist = data.playlist;
  if (!playlist) throw new Error("歌单不存在");
  let tracks = (playlist.tracks ?? []).map(normalizeTrack);
  if ((playlist.trackCount || 0) > tracks.length) {
    const all = await api<{ songs?: SongLike[] }>("/playlist/track/all", {
      id,
      limit: Math.min(playlist.trackCount || 200, 400),
      offset: 0,
    }).catch(() => ({ songs: [] as SongLike[] }));
    if (all.songs?.length) tracks = all.songs.map(normalizeTrack);
  }
  return { ...playlist, tracks };
}

export async function fetchAlbumDetail(id: string | number) {
  const data = await api<{
    album?: {
      id: number;
      name: string;
      picUrl: string;
      description?: string;
      publishTime?: number;
      artist?: { id: number; name: string };
    };
    songs?: SongLike[];
  }>("/album", { id });
  return {
    album: data.album,
    tracks: (data.songs ?? []).map(normalizeTrack),
  };
}

export async function fetchArtistDetail(id: string | number) {
  const data = await api<{
    artist?: {
      id: number;
      name: string;
      picUrl?: string;
      img1v1Url?: string;
      briefDesc?: string;
      musicSize?: number;
      albumSize?: number;
    };
    hotSongs?: SongLike[];
  }>("/artists", { id });
  return {
    artist: data.artist,
    tracks: (data.hotSongs ?? []).map(normalizeTrack),
  };
}

export type Quality = "standard" | "higher" | "exhigh" | "lossless";

export async function fetchSongUrl(id: number, level: Quality = "exhigh") {
  const pick = async (
    path: string,
    params: Record<string, string | number | boolean | undefined>,
  ) => {
    const data = await api<{ data?: Array<{ url?: string | null }> }>(path, params);
    const url = data.data?.[0]?.url;
    return url ? url.replace(/^http:\/\//, "https://") : "";
  };
  return (
    (await pick("/song/url/v1", { id, level, unblock: true })) ||
    (await pick("/song/url/v1", { id, level })) ||
    (await pick("/song/url", { id, br: 320000 }))
  );
}

export async function fetchLyric(id: number) {
  type LyricPayload = {
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
    ytlrc?: { lyric?: string };
    yrc?: { lyric?: string };
  };

  const pick = (data: LyricPayload) => ({
    lrc: data.lrc?.lyric ?? "",
    tlyric: data.tlyric?.lyric ?? data.ytlrc?.lyric ?? "",
    yrc: data.yrc?.lyric ?? "",
  });

  const load = async (path: string, ms: number) => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(`${BASE}${path}?id=${id}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`请求失败 ${path} (${res.status})`);
      return pick((await res.json()) as LyricPayload);
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    const newer = await load("/lyric/new", 4500);
    if (newer.lrc || newer.yrc) return newer;
  } catch {
    /* fall back to /lyric */
  }
  try {
    return await load("/lyric", 4500);
  } catch {
    return { lrc: "", tlyric: "", yrc: "" };
  }
}

export async function fetchComments(id: number, offset = 0, limit = 20) {
  const data = await api<{
    hotComments?: CommentItem[];
    comments?: CommentItem[];
    total?: number;
  }>("/comment/music", { id, offset, limit });
  return {
    hot: data.hotComments ?? [],
    comments: data.comments ?? [],
    total: data.total ?? 0,
  };
}

export async function fetchRadioPrograms(rid: number) {
  const data = await api<{
    programs?: Array<{
      id: number;
      name: string;
      coverUrl?: string;
      listenerCount?: number;
      mainSong?: SongLike;
    }>;
  }>("/dj/program", { rid, limit: 40 });
  return (data.programs ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    coverUrl: p.coverUrl || "",
    listenerCount: p.listenerCount ?? 0,
    track: p.mainSong
      ? normalizeTrack({ ...p.mainSong, picUrl: p.coverUrl || p.mainSong.picUrl })
      : null,
  }));
}

export async function fetchRadioDetail(rid: number) {
  const data = await api<{
    djRadio?: RadioItem & { desc?: string; dj?: { nickname?: string; avatarUrl?: string } };
  }>("/dj/detail", { rid });
  return data.djRadio;
}

export function coverOf(track: Track, size = 400) {
  return imgUrl(track.album.picUrl, size);
}

function asMv(raw: Record<string, unknown>): MvItem {
  return {
    id: Number(raw.id || raw.vid || 0),
    name: String(raw.name || raw.title || ""),
    cover: String(raw.cover || raw.picUrl || raw.imgurl || ""),
    artistName: String(
      raw.artistName ||
        (raw.artist as { name?: string } | undefined)?.name ||
        (Array.isArray(raw.artists) ? (raw.artists as { name: string }[]).map((a) => a.name).join(" / ") : "") ||
        "",
    ),
    artistId: Number((raw.artist as { id?: number } | undefined)?.id || raw.artistId || 0) || undefined,
    playCount: Number(raw.playCount || raw.playCount || 0),
    duration: Number(raw.duration || 0),
  };
}

export async function fetchSongDetail(ids: Array<string | number>): Promise<Track[]> {
  const data = await api<{ songs?: SongLike[] }>("/song/detail", { ids: ids.join(",") });
  return (data.songs ?? []).map(normalizeTrack);
}

export async function fetchPlaylistSquare(cat = "全部", limit = 30, offset = 0) {
  const data = await api<{ playlists?: PlaylistCard[]; total?: number }>("/top/playlist", {
    cat,
    limit,
    offset,
    order: "hot",
  });
  return {
    playlists: (data.playlists ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      coverImgUrl: p.coverImgUrl,
      playCount: p.playCount,
      trackCount: p.trackCount,
    })),
    total: data.total ?? 0,
  };
}

export async function fetchHighqualityPlaylists(cat = "全部", limit = 20) {
  const data = await api<{ playlists?: PlaylistCard[] }>("/top/playlist/highquality", { cat, limit });
  return data.playlists ?? [];
}

export async function fetchPlaylistCats() {
  const data = await api<{
    all?: { name: string };
    sub?: Array<{ name: string; category: number }>;
    categories?: Record<string, string>;
  }>("/playlist/catlist");
  return data;
}

export async function fetchNewAlbums(): Promise<AlbumCard[]> {
  const data = await api<{ albums?: Array<Record<string, unknown>> }>("/album/newest");
  return (data.albums ?? []).map((a) => ({
    id: Number(a.id),
    name: String(a.name),
    picUrl: String(a.picUrl || a.blurPicUrl || ""),
    artistName: String((a.artist as { name?: string } | undefined)?.name || ""),
    publishTime: Number(a.publishTime || 0),
  }));
}

export async function fetchTopAlbums(limit = 20): Promise<AlbumCard[]> {
  const data = await api<{
    monthData?: Array<Record<string, unknown>>;
    weekData?: Array<Record<string, unknown>>;
  }>("/top/album", { limit, area: "ALL", type: "new" });
  const list = data.monthData?.length ? data.monthData : data.weekData ?? [];
  return list.map((a) => ({
    id: Number(a.id),
    name: String(a.name),
    picUrl: String(a.picUrl || ""),
    artistName: String((a.artist as { name?: string } | undefined)?.name || ""),
  }));
}

export async function fetchPersonalizedMv(): Promise<MvItem[]> {
  const data = await api<{ result?: Array<Record<string, unknown>> }>("/personalized/mv");
  return (data.result ?? []).map(asMv);
}

export async function fetchFirstMvs(limit = 12): Promise<MvItem[]> {
  const data = await api<{ data?: Array<Record<string, unknown>> }>("/mv/first", { limit });
  return (data.data ?? []).map(asMv);
}

export async function fetchMvDetail(id: string | number) {
  const data = await api<{
    data?: {
      id: number;
      name: string;
      cover?: string;
      desc?: string;
      playCount?: number;
      artistName?: string;
      artistId?: number;
      artists?: Array<{ id: number; name: string }>;
      duration?: number;
    };
  }>("/mv/detail", { mvid: id });
  return data.data;
}

export async function fetchMvUrl(id: string | number) {
  const data = await api<{ data?: { url?: string | null } }>("/mv/url", { id });
  const url = data.data?.url;
  return url ? url.replace(/^http:\/\//, "https://") : "";
}

export async function fetchSimiSongs(id: number): Promise<Track[]> {
  const data = await api<{ songs?: SongLike[] }>("/simi/song", { id });
  return (data.songs ?? []).map(normalizeTrack);
}

export async function fetchRelatedPlaylists(id: string | number): Promise<PlaylistCard[]> {
  const data = await api<{ playlists?: Array<PlaylistCard & { picUrl?: string }> }>("/related/playlist", { id });
  return (data.playlists ?? []).map((p) => ({
    ...p,
    coverImgUrl: p.coverImgUrl || p.picUrl || "",
  }));
}

export async function fetchArtistAlbums(id: string | number, limit = 20): Promise<AlbumCard[]> {
  const data = await api<{ hotAlbums?: Array<Record<string, unknown>> }>("/artist/album", {
    id,
    limit,
  });
  return (data.hotAlbums ?? []).map((a) => ({
    id: Number(a.id),
    name: String(a.name),
    picUrl: String(a.picUrl || ""),
    artistName: String((a.artist as { name?: string } | undefined)?.name || ""),
  }));
}

export async function fetchArtistMvs(id: string | number, limit = 20): Promise<MvItem[]> {
  const data = await api<{ mvs?: Array<Record<string, unknown>> }>("/artist/mv", { id, limit });
  return (data.mvs ?? []).map(asMv);
}

export async function fetchArtistDesc(id: string | number) {
  const data = await api<{ briefDesc?: string; introduction?: Array<{ ti: string; txt: string }> }>(
    "/artist/desc",
    { id },
  );
  return data.briefDesc || data.introduction?.[0]?.txt || "";
}

export async function fetchPersonalFm(): Promise<Track[]> {
  const data = await api<{ data?: SongLike[] }>("/personal_fm");
  return (data.data ?? []).map(normalizeTrack);
}

export async function fetchPrivatecontent() {
  const data = await api<{ result?: Array<{ id: number; name: string; picUrl: string; sPicUrl?: string; copywriter?: string; type?: number }> }>(
    "/personalized/privatecontent",
  );
  return data.result ?? [];
}

export async function fetchDjCats() {
  const data = await api<{ categories?: Array<{ id: number; name: string }> }>("/dj/catelist");
  return data.categories ?? [];
}

export async function fetchDjRecommend(): Promise<RadioItem[]> {
  const data = await api<{ djRadios?: RadioItem[] }>("/dj/recommend");
  return data.djRadios ?? [];
}

export async function fetchDjByCate(type: number): Promise<RadioItem[]> {
  const data = await api<{ djRadios?: RadioItem[] }>("/dj/recommend/type", { type });
  return data.djRadios ?? [];
}

export async function searchAlbums(keywords: string, offset = 0, limit = 20) {
  const data = await api<{
    result?: {
      albums?: Array<{ id: number; name: string; picUrl?: string; artist?: { name: string } }>;
      albumCount?: number;
    };
  }>("/cloudsearch", { keywords, type: 10, limit, offset });
  return {
    albums: (data.result?.albums ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      picUrl: a.picUrl || "",
      artistName: a.artist?.name,
    })) as AlbumCard[],
    total: data.result?.albumCount ?? 0,
  };
}

export async function searchMvs(keywords: string, offset = 0, limit = 20) {
  const data = await api<{
    result?: { mvs?: Array<Record<string, unknown>>; mvCount?: number };
  }>("/cloudsearch", { keywords, type: 1004, limit, offset });
  return {
    mvs: (data.result?.mvs ?? []).map(asMv),
    total: data.result?.mvCount ?? 0,
  };
}

export async function searchRadios(keywords: string, offset = 0, limit = 20) {
  const data = await api<{
    result?: { djRadios?: RadioItem[]; djRadiosCount?: number };
  }>("/cloudsearch", { keywords, type: 1009, limit, offset });
  return {
    radios: data.result?.djRadios ?? [],
    total: data.result?.djRadiosCount ?? 0,
  };
}

export async function fetchCommentsByType(
  id: number,
  kind: "music" | "playlist" | "album" | "mv" = "music",
  offset = 0,
  limit = 20,
) {
  const path =
    kind === "playlist"
      ? "/comment/playlist"
      : kind === "album"
        ? "/comment/album"
        : kind === "mv"
          ? "/comment/mv"
          : "/comment/music";
  const data = await api<{
    hotComments?: CommentItem[];
    comments?: CommentItem[];
    total?: number;
  }>(path, { id, offset, limit });
  return {
    hot: data.hotComments ?? [],
    comments: data.comments ?? [],
    total: data.total ?? 0,
  };
}
