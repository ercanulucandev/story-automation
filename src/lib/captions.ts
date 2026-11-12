import type { CaptionPosition, CaptionStyle, WordTiming } from "./types";

function assTime(t: number) {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

const esc = (s: string) => s.replace(/[{}]/g, "").replace(/\\/g, "");

/** Kelime kelime vurgulu (TikTok tarzı) ASS altyazı dosyası üretir. */
export function buildAss(opts: {
  words: WordTiming[];
  width: number;
  height: number;
  style: CaptionStyle;
  position: CaptionPosition;
  locale?: string;
}): string {
  const { words, width, height, style, position, locale } = opts;
  const vertical = height > width;
  const fontSize = Math.round((vertical ? width : height) * (style === "clean" ? 0.06 : 0.075));
  const marginV = position === "center" ? 0 : Math.round(height * (vertical ? 0.22 : 0.1));
  const alignment = position === "center" ? 5 : 2;
  const upper = style === "bold-pop";
  const highlight = style === "bold-pop" ? "&H0000E5FF&" : style === "karaoke" ? "&H0050FF50&" : null;
  const outline = style === "clean" ? 3 : 6;
  const perLine = vertical ? 3 : 6;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,Arial Black,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,${outline},2,${alignment},60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Kelimeleri satırlara grupla (cümle sonlarında da kır)
  const chunks: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= perLine || /[.!?…]$/.test(w.w)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);

  const lines: string[] = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const chunkEnd = ci + 1 < chunks.length ? Math.min(chunks[ci + 1][0].start, chunk[chunk.length - 1].end + 0.6) : chunk[chunk.length - 1].end + 0.6;
    const fmt = (w: string) => esc(upper ? w.toLocaleUpperCase(locale) : w);
    if (!highlight) {
      lines.push(`Dialogue: 0,${assTime(chunk[0].start)},${assTime(chunkEnd)},Main,,0,0,0,,${chunk.map((w) => fmt(w.w)).join(" ")}`);
      continue;
    }
    for (let wi = 0; wi < chunk.length; wi++) {
      const start = chunk[wi].start;
      const end = wi + 1 < chunk.length ? chunk[wi + 1].start : chunkEnd;
      if (end <= start) continue;
      const text = chunk
        .map((w, j) => (j === wi ? `{\\c${highlight}\\fscx110\\fscy110}${fmt(w.w)}{\\r}` : fmt(w.w)))
        .join(" ");
      lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Main,,0,0,0,,${text}`);
    }
  }
  return header + lines.join("\n") + "\n";
}
