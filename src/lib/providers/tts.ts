import "server-only";
import fs from "node:fs/promises";
import type { WordTiming } from "../types";

export interface TtsResult {
  words: WordTiming[]; // kelime zamanlamaları (altyazı için)
  costUsd: number;
}

/** ElevenLabs: sesi ve karakter bazlı zamanlamayı birlikte döndürür. */
export async function elevenLabsTts(
  apiKey: string,
  opts: { text: string; voiceId: string; model: string; outFile: string },
): Promise<TtsResult> {
  if (!apiKey) throw new Error("ElevenLabs API anahtarı eksik.");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(opts.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: opts.text,
        model_id: opts.model,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs hatası ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  await fs.writeFile(opts.outFile, Buffer.from(data.audio_base64, "base64"));

  const words: WordTiming[] = [];
  const a = data.alignment;
  if (a) {
    let cur = "";
    let start = 0;
    let end = 0;
    for (let i = 0; i < a.characters.length; i++) {
      const ch = a.characters[i];
      if (/\s/.test(ch)) {
        if (cur) words.push({ w: cur, start, end });
        cur = "";
        continue;
      }
      if (!cur) start = a.character_start_times_seconds[i];
      cur += ch;
      end = a.character_end_times_seconds[i];
    }
    if (cur) words.push({ w: cur, start, end });
  }
  return { words, costUsd: opts.text.length * 0.0002 };
}

/** OpenAI TTS: zamanlama vermez, kelimeler süreye orantılı dağıtılır. */
export async function openAiTts(
  apiKey: string,
  opts: { text: string; voice: string; outFile: string },
): Promise<TtsResult> {
  if (!apiKey) throw new Error("OpenAI API anahtarı eksik.");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: opts.voice, input: opts.text, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS hatası ${res.status}: ${(await res.text()).slice(0, 300)}`);
  await fs.writeFile(opts.outFile, Buffer.from(await res.arrayBuffer()));
  return { words: [], costUsd: opts.text.length * 0.000015 };
}

/** Zamanlaması olmayan metin için kelimeleri süreye karakter uzunluğuna göre dağıtır. */
export function estimateWordTimings(text: string, duration: number): WordTiming[] {
  const ws = text.split(/\s+/).filter(Boolean);
  const total = ws.reduce((s, w) => s + w.length + 1, 0);
  let t = 0;
  return ws.map((w) => {
    const d = ((w.length + 1) / total) * duration;
    const out = { w, start: t, end: t + d };
    t += d;
    return out;
  });
}

export async function listElevenVoices(apiKey: string) {
  if (!apiKey) return [];
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw new Error(`ElevenLabs ses listesi alınamadı (${res.status})`);
  const data = (await res.json()) as {
    voices: { voice_id: string; name: string; preview_url?: string; labels?: Record<string, string> }[];
  };
  return data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    preview: v.preview_url ?? null,
    labels: Object.values(v.labels ?? {}).slice(0, 3).join(" · "),
  }));
}
