import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchLyric, fetchSongUrl, type Quality } from "../api/client";
import type { Track } from "../api/types";
import { LIKED_KEY, MODE_KEY, QUALITY_KEY, RECENT_KEY, loadJson, saveJson } from "../utils/format";
import { buildLyricLines, type LyricLine } from "../utils/lyric";
import { useToast } from "./ToastContext";

export type PlayMode = "list" | "single" | "shuffle";

type PlayerContextValue = {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  loading: boolean;
  mode: PlayMode;
  quality: Quality;
  fullOpen: boolean;
  lyricsOpen: boolean;
  queueOpen: boolean;
  lyrics: LyricLine[];
  likedIds: number[];
  recent: Track[];
  playTracks: (tracks: Track[], start?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  cycleMode: () => void;
  cycleQuality: () => void;
  setFullOpen: (open: boolean) => void;
  setLyricsOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  toggleLike: (track?: Track) => void;
  isLiked: (id: number) => boolean;
};

type PlayerTimeValue = {
  currentTime: number;
  duration: number;
  buffered: number;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PlayerTimeContext = createContext<PlayerTimeValue>({
  currentTime: 0,
  duration: 0,
  buffered: 0,
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const modeRef = useRef<PlayMode>("list");
  const skipLock = useRef(false);
  const failCount = useRef(0);
  const jumpRef = useRef<(delta: number) => Promise<void>>(async () => {});

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [mode, setMode] = useState<PlayMode>(() => loadJson(MODE_KEY, "list"));
  const [quality, setQuality] = useState<Quality>(() => loadJson(QUALITY_KEY, "exhigh"));
  const [fullOpen, setFullOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>(() => loadJson(LIKED_KEY, []));
  const [recent, setRecent] = useState<Track[]>(() => loadJson(RECENT_KEY, []));

  queueRef.current = queue;
  indexRef.current = index;
  modeRef.current = mode;
  const qualityRef = useRef<Quality>(quality);
  qualityRef.current = quality;

  const current = queue[index] ?? null;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onProgress = () => {
      if (audio.buffered.length) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (modeRef.current === "single") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      void jumpRef.current(1);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (!playing || !fullOpen) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime || 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, fullOpen]);

  const remember = useCallback((track: Track) => {
    setRecent((prev) => {
      const next = [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 50);
      saveJson(RECENT_KEY, next);
      return next;
    });
  }, []);

  const loadTrack = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return false;
      setLoading(true);
      setCurrentTime(0);
      setBuffered(0);
      setDuration((track.duration || 0) / 1000);
      setLyrics([]);
      try {
        const [url, lyric] = await Promise.all([
          fetchSongUrl(track.id, qualityRef.current),
          fetchLyric(track.id),
        ]);
        setLyrics(buildLyricLines(lyric.lrc, lyric.tlyric, lyric.yrc ?? ""));
        if (!url) {
          show("这首歌暂时没有可播放音源");
          setPlaying(false);
          failCount.current += 1;
          return false;
        }
        audio.src = url;
        await audio.play();
        remember(track);
        failCount.current = 0;
        return true;
      } catch {
        show("播放失败，试试下一首");
        failCount.current += 1;
        return false;
      } finally {
        setLoading(false);
      }
    },
    [remember, show],
  );

  const jump = useCallback(
    async (delta: number) => {
      if (skipLock.current) return;
      skipLock.current = true;
      const list = queueRef.current;
      if (!list.length) {
        skipLock.current = false;
        return;
      }
      let nextIndex = indexRef.current;
      if (modeRef.current === "shuffle" && list.length > 1) {
        let random = Math.floor(Math.random() * list.length);
        if (random === nextIndex) random = (random + 1) % list.length;
        nextIndex = random;
      } else {
        nextIndex = (nextIndex + delta + list.length) % list.length;
      }
      setIndex(nextIndex);
      const ok = await loadTrack(list[nextIndex]);
      skipLock.current = false;
      if (!ok && list.length > 1 && failCount.current < list.length) {
        window.setTimeout(() => {
          void jumpRef.current(delta || 1);
        }, 400);
      }
    },
    [loadTrack],
  );

  jumpRef.current = jump;

  const playTracks = useCallback(
    (tracks: Track[], start = 0) => {
      const clean = tracks.filter((t) => t?.id);
      if (!clean.length) {
        show("没有可播放的歌曲");
        return;
      }
      const safeIndex = Math.min(Math.max(start, 0), clean.length - 1);
      const target = clean[safeIndex];
      const audio = audioRef.current;
      if (audio?.src && queueRef.current[indexRef.current]?.id === target.id) {
        setQueue(clean);
        setIndex(safeIndex);
        if (audio.paused) void audio.play().catch(() => {});
        return;
      }
      setQueue(clean);
      setIndex(safeIndex);
      void loadTrack(target);
    },
    [loadTrack, show],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current.length) return;
    if (audio.paused) {
      void audio.play().catch(() => show("播放被浏览器拦截，请再点一次"));
    } else {
      audio.pause();
    }
  }, [show]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const cycleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "list" ? "single" : prev === "single" ? "shuffle" : "list";
      modeRef.current = next;
      saveJson(MODE_KEY, next);
      show(next === "list" ? "列表循环" : next === "single" ? "单曲循环" : "随机播放");
      return next;
    });
  }, [show]);

  const cycleQuality = useCallback(() => {
    setQuality((prev) => {
      const order: Quality[] = ["standard", "higher", "exhigh", "lossless"];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      qualityRef.current = next;
      saveJson(QUALITY_KEY, next);
      show(
        next === "lossless"
          ? "无损音质"
          : next === "exhigh"
            ? "极高音质"
            : next === "higher"
              ? "较高音质"
              : "标准音质",
      );
      return next;
    });
  }, [show]);

  const qualityBoot = useRef(true);
  useEffect(() => {
    if (qualityBoot.current) {
      qualityBoot.current = false;
      return;
    }
    const track = queueRef.current[indexRef.current];
    const audio = audioRef.current;
    if (!track || !audio?.src) return;
    const keep = audio.currentTime;
    const wasPlaying = !audio.paused;
    void loadTrack(track).then((ok) => {
      if (!ok || !audioRef.current) return;
      audioRef.current.currentTime = keep;
      if (!wasPlaying) audioRef.current.pause();
    });
  }, [quality, loadTrack]);

  const toggleLike = useCallback((track?: Track) => {
    const target = track ?? queueRef.current[indexRef.current];
    if (!target) return;
    setLikedIds((prev) => {
      const exists = prev.includes(target.id);
      const next = exists ? prev.filter((id) => id !== target.id) : [target.id, ...prev];
      saveJson(LIKED_KEY, next);
      const likedMap = loadJson<Track[]>("chiyun-liked-tracks", []);
      const tracks = exists
        ? likedMap.filter((t) => t.id !== target.id)
        : [target, ...likedMap.filter((t) => t.id !== target.id)];
      saveJson("chiyun-liked-tracks", tracks);
      return next;
    });
  }, []);

  const isLiked = useCallback((id: number) => likedIds.includes(id), [likedIds]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      playing,
      loading,
      mode,
      quality,
      fullOpen,
      lyricsOpen,
      queueOpen,
      lyrics,
      likedIds,
      recent,
      playTracks,
      toggle,
      next: () => void jump(1),
      prev: () => void jump(-1),
      seek,
      cycleMode,
      cycleQuality,
      setFullOpen,
      setLyricsOpen,
      setQueueOpen,
      toggleLike,
      isLiked,
    }),
    [
      queue,
      index,
      current,
      playing,
      loading,
      mode,
      quality,
      fullOpen,
      lyricsOpen,
      queueOpen,
      lyrics,
      likedIds,
      recent,
      playTracks,
      toggle,
      jump,
      seek,
      cycleMode,
      cycleQuality,
      toggleLike,
      isLiked,
    ],
  );

  const timeValue = useMemo<PlayerTimeValue>(
    () => ({ currentTime, duration, buffered }),
    [currentTime, duration, buffered],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerTimeContext.Provider value={timeValue}>{children}</PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("PlayerProvider missing");
  return ctx;
}

export function usePlayerTime() {
  return useContext(PlayerTimeContext);
}
