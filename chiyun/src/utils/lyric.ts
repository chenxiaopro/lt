export type LyricWord = {
  time: number;
  duration: number;
  text: string;
};

export type LyricLine = {
  time: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
};

function stampToSeconds(m: string, s: string, frac?: string) {
  const ms = frac ? (frac.length === 2 ? Number(frac) * 10 : Number(frac)) : 0;
  return Number(m) * 60 + Number(s) + ms / 1000;
}

export function parseLrc(lrc?: string): LyricLine[] {
  if (!lrc) return [];
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const stamps = [...raw.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    const text = raw.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, "").trim();
    if (!stamps.length) continue;
    for (const match of stamps) {
      lines.push({
        time: stampToSeconds(match[1], match[2], match[3]),
        text,
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function parseYrc(yrc?: string): LyricLine[] {
  if (!yrc) return [];
  const lines: LyricLine[] = [];
  for (const raw of yrc.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed) as { t?: number; c?: Array<{ tx?: string }> };
        const text = (json.c ?? []).map((part) => part.tx ?? "").join("").trim();
        if (!text) continue;
        lines.push({ time: (json.t ?? 0) / 1000, text });
      } catch {
        continue;
      }
      continue;
    }
    const header = raw.match(/^\[(\d+),(\d+)\]/);
    if (!header) continue;
    const words: LyricWord[] = [];
    const re = /\((\d+),(\d+),-?\d+\)([^(]*)/g;
    let match: RegExpExecArray | null = re.exec(raw);
    while (match) {
      words.push({
        time: Number(match[1]) / 1000,
        duration: Number(match[2]) / 1000,
        text: match[3],
      });
      match = re.exec(raw);
    }
    const text = words.map((w) => w.text).join("").trim();
    if (!text) continue;
    lines.push({
      time: Number(header[1]) / 1000,
      text,
      words,
    });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function translationAt(trans: LyricLine[], time: number) {
  let best = "";
  let dist = 0.12;
  for (const line of trans) {
    const delta = Math.abs(line.time - time);
    if (delta < dist && line.text) {
      dist = delta;
      best = line.text;
    }
  }
  return best;
}

export function buildLyricLines(lrc: string, tlyric = "", yrc = ""): LyricLine[] {
  const trans = parseLrc(tlyric);
  const source = yrc.trim() ? parseYrc(yrc) : parseLrc(lrc);
  return source
    .filter((line) => line.text)
    .map((line) => ({
      ...line,
      translation: translationAt(trans, line.time),
    }));
}

export function activeLyricIndex(lines: LyricLine[], currentTime: number) {
  if (!lines.length) return -1;
  let index = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= currentTime + 0.08) index = i;
  }
  return index;
}

export function lineFill(lines: LyricLine[], index: number, currentTime: number) {
  const line = lines[index];
  if (!line) return 0;
  const next = lines[index + 1];
  const end = next ? next.time : line.time + 5;
  const span = Math.max(0.2, end - line.time);
  return Math.min(1, Math.max(0, (currentTime - line.time) / span));
}
