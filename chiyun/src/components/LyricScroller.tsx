import { Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "../utils/format";
import {
  activeLyricIndex,
  lineFill,
  type LyricLine,
  type LyricWord,
} from "../utils/lyric";

function KaraokeLine({
  line,
  active,
  fill,
  currentTime,
}: {
  line: LyricLine;
  active: boolean;
  fill: number;
  currentTime: number;
}) {
  if (active && line.words?.length) {
    return (
      <span className="lyric-words">
        {line.words.map((word: LyricWord, i) => {
          const done = currentTime >= word.time + word.duration;
          const running = currentTime >= word.time && !done;
          const wordFill = done
            ? 1
            : running
              ? Math.min(1, Math.max(0, (currentTime - word.time) / Math.max(0.05, word.duration)))
              : 0;
          return (
            <span key={`${word.time}-${i}`} className="lyric-karaoke">
              <span className="lyric-base">{word.text}</span>
              <span className="lyric-fill" style={{ width: `${wordFill * 100}%` }}>
                <span>{word.text}</span>
              </span>
            </span>
          );
        })}
      </span>
    );
  }

  if (active) {
    return (
      <span className="lyric-karaoke">
        <span className="lyric-base">{line.text}</span>
        <span className="lyric-fill" style={{ width: `${fill * 100}%` }}>
          <span>{line.text}</span>
        </span>
      </span>
    );
  }

  return <span>{line.text || " "}</span>;
}

export default function LyricScroller({
  lines,
  currentTime,
  onSeek,
}: {
  lines: LyricLine[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userHold = useRef(false);
  const dragged = useRef(false);
  const resumeTimer = useRef<number | null>(null);
  const playingIndexRef = useRef(-1);
  const programmaticUntil = useRef(0);
  const [holding, setHolding] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [pad, setPad] = useState(180);

  const playingIndex = useMemo(
    () => activeLyricIndex(lines, currentTime),
    [lines, currentTime],
  );
  playingIndexRef.current = playingIndex;

  useEffect(() => {
    const updatePad = () => {
      const h = stageRef.current?.clientHeight ?? 360;
      setPad(Math.max(120, Math.floor(h / 2) - 24));
    };
    updatePad();
    window.addEventListener("resize", updatePad);
    return () => window.removeEventListener("resize", updatePad);
  }, []);

  const scrollToIndex = (index: number, smooth: boolean) => {
    const scroller = scrollRef.current;
    const line = lineRefs.current[index];
    if (!scroller || !line) return;
    programmaticUntil.current = performance.now() + (smooth ? 480 : 80);
    const top = line.offsetTop - scroller.clientHeight / 2 + line.offsetHeight / 2;
    scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  };

  const clearResume = () => {
    if (resumeTimer.current) {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  };

  const scheduleResume = () => {
    clearResume();
    resumeTimer.current = window.setTimeout(() => {
      userHold.current = false;
      dragged.current = false;
      setHolding(false);
      setPreviewIndex(-1);
      const index = playingIndexRef.current;
      if (index >= 0) scrollToIndex(index, true);
    }, 2800);
  };

  const syncPreview = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const center = scroller.scrollTop + scroller.clientHeight / 2;
    let best = 0;
    let dist = Number.POSITIVE_INFINITY;
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const mid = el.offsetTop + el.offsetHeight / 2;
      const delta = Math.abs(mid - center);
      if (delta < dist) {
        dist = delta;
        best = i;
      }
    });
    setPreviewIndex(best);
  };

  const beginDrag = () => {
    if (performance.now() < programmaticUntil.current) return;
    userHold.current = true;
    dragged.current = true;
    setHolding(true);
    syncPreview();
    scheduleResume();
  };

  useEffect(() => {
    userHold.current = false;
    dragged.current = false;
    setHolding(false);
    setPreviewIndex(-1);
    clearResume();
    window.requestAnimationFrame(() => scrollToIndex(0, false));
  }, [lines]);

  useEffect(() => {
    if (userHold.current || playingIndex < 0) return;
    scrollToIndex(playingIndex, true);
  }, [playingIndex]);

  useEffect(() => () => clearResume(), []);

  const jumpTo = (time: number) => {
    onSeek(time);
    userHold.current = false;
    dragged.current = false;
    setHolding(false);
    setPreviewIndex(-1);
    clearResume();
  };

  const focusIndex = holding && previewIndex >= 0 ? previewIndex : playingIndex;
  const previewLine = previewIndex >= 0 ? lines[previewIndex] : null;

  if (!lines.length) {
    return <p className="flex h-full items-center justify-center text-white/60">暂无歌词，纯音乐也很好听</p>;
  }

  return (
    <div ref={stageRef} className="relative h-full min-h-0 w-full">
      {holding && previewLine ? (
        <div className="lyric-guide">
          <button
            type="button"
            className="lyric-guide-play"
            aria-label="从这句开始播放"
            onClick={() => jumpTo(previewLine.time)}
          >
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </button>
          <span className="lyric-guide-time">{formatClock(previewLine.time)}</span>
          <i className="lyric-guide-line" />
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="lyric-scroll hide-scrollbar"
        onScroll={beginDrag}
        onWheel={beginDrag}
      >
        <div style={{ height: pad }} />
        {lines.map((line, i) => {
          const dist = Math.abs(i - (focusIndex < 0 ? 0 : focusIndex));
          const playing = i === playingIndex && !holding;
          const previewing = holding && i === previewIndex;
          return (
            <button
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                jumpTo(line.time);
              }}
              className={`lyric-line ${playing ? "is-playing" : ""} ${previewing ? "is-preview" : ""}`}
              style={{
                opacity: dist === 0 ? 1 : dist === 1 ? 0.58 : dist === 2 ? 0.32 : 0.16,
                transform: dist === 0 ? "scale(1)" : "scale(0.96)",
              }}
            >
              <span className="lyric-main">
                <KaraokeLine
                  line={line}
                  active={playing}
                  fill={playing ? lineFill(lines, i, currentTime) : 0}
                  currentTime={currentTime}
                />
              </span>
              {line.translation ? <span className="lyric-trans">{line.translation}</span> : null}
            </button>
          );
        })}
        <div style={{ height: pad }} />
      </div>
    </div>
  );
}

export function LyricPreview({
  lines,
  currentTime,
  onOpen,
}: {
  lines: LyricLine[];
  currentTime: number;
  onOpen: () => void;
}) {
  const index = activeLyricIndex(lines, currentTime);
  const current = index >= 0 ? lines[index] : null;
  const next = index >= 0 ? lines[index + 1] : null;

  return (
    <button type="button" onClick={onOpen} className="mt-6 w-full px-2 text-center">
      {current ? (
        <>
          <div className="text-[15px] font-medium leading-7 text-white">
            <KaraokeLine
              line={current}
              active
              fill={lineFill(lines, index, currentTime)}
              currentTime={currentTime}
            />
          </div>
          {current.translation ? (
            <div className="mt-0.5 text-xs text-white/55">{current.translation}</div>
          ) : null}
          <div className="mt-1 truncate text-sm text-white/35">{next?.text ?? " "}</div>
        </>
      ) : (
        <div className="text-sm text-white/50">点击查看歌词</div>
      )}
    </button>
  );
}
