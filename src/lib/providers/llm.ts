import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { GENRES, LANGUAGES, VISUAL_STYLES } from "../catalog";
import type { ProjectConfig } from "../types";

const ScriptSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  hook: z.string(),
  thumbnailPrompt: z.string(),
  characterSheet: z.string(),
  scenes: z
    .array(
      z.object({
        narration: z.string(),
        visualPrompt: z.string(),
        motionPrompt: z.string(),
      }),
    )
    .min(1),
});
export type GeneratedScript = z.infer<typeof ScriptSchema>;

// Structured outputs için JSON şeması (additionalProperties: false zorunlu)
const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "tags", "hook", "thumbnailPrompt", "characterSheet", "scenes"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    hook: { type: "string" },
    thumbnailPrompt: { type: "string" },
    characterSheet: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["narration", "visualPrompt", "motionPrompt"],
        properties: {
          narration: { type: "string" },
          visualPrompt: { type: "string" },
          motionPrompt: { type: "string" },
        },
      },
    },
  },
} as const;

const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export async function generateScript(
  apiKey: string,
  cfg: ProjectConfig,
  clipSeconds: number,
): Promise<{ script: GeneratedScript; costUsd: number }> {
  if (!apiKey) throw new Error("Anthropic API anahtarı eksik. Ayarlar sayfasından ekleyin.");
  const client = new Anthropic({ apiKey });

  const genre = GENRES.find((g) => g.id === cfg.genre)?.label ?? cfg.genre;
  const language = LANGUAGES.find((l) => l.id === cfg.language)?.label ?? cfg.language;
  const style = VISUAL_STYLES.find((s) => s.id === cfg.visualStyle);
  const sceneCount = Math.max(3, Math.round(cfg.durationSec / clipSeconds));
  const wordsPerScene = Math.round(clipSeconds * 2.3);

  const system = `You are an expert short-form video storyteller and YouTube scriptwriter. You write gripping, original stories that keep viewers watching until the last second, and you turn them into scene-by-scene production plans for an AI video pipeline.`;

  const user = `Create a ${cfg.aspect === "9:16" ? "vertical YouTube Shorts" : "horizontal YouTube"} story video.

- Topic / idea: ${cfg.topic || "(choose an original, compelling idea yourself)"}
- Genre: ${genre}
- Tone: ${cfg.tone}
- Narration language: ${language}
- Target length: ~${cfg.durationSec} seconds
- Visual style: ${style?.label ?? cfg.visualStyle}

Requirements:
- Write exactly ${sceneCount} scenes. Each scene's narration must be about ${wordsPerScene} words (spoken in ~${clipSeconds} seconds) so it matches one ${clipSeconds}-second video clip.
- The first scene must open with a strong hook in the first sentence. The ending must pay off (twist, reveal or emotional resolution) and be satisfying.
- narration, title, description, hook and tags are written in ${language}. Narration is plain spoken text only: no stage directions, emojis, or speaker labels.
- characterSheet (English): a concise, fixed visual description of the main character(s) and setting (age, face, hair, clothes, colors) reused in every image so they look consistent.
- visualPrompt (English): a detailed, single-frame image prompt for the scene: subject, action, setting, camera angle, lighting. Refer to characters by the same descriptions as the characterSheet. Do not include text, letters, or logos in images. ${cfg.aspect === "9:16" ? "Compose for a vertical 9:16 frame." : "Compose for a wide 16:9 frame."}
- motionPrompt (English): one short sentence describing camera movement and subject motion for an image-to-video model (e.g. "slow dolly in as she turns her head toward the door").
- thumbnailPrompt (English): an eye-catching, high-contrast thumbnail image prompt without any text.
- description: 2–4 sentences for YouTube plus 3–5 relevant hashtags at the end. tags: 8–15 search tags.`;

  const response = await client.beta.messages.create({
    model: cfg.llmModel,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: cfg.llmModel.includes("haiku") ? "low" : "medium",
      format: { type: "json_schema", schema: JSON_SCHEMA as unknown as Record<string, unknown> },
    },
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model bu konuyu yazmayı reddetti. Konuyu ya da türü değiştirip tekrar deneyin.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Senaryo çok uzun çıktı, yanıt kesildi. Süreyi kısaltıp tekrar deneyin.");
  }
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  const script = ScriptSchema.parse(JSON.parse(text));

  const [pin, pout] = PRICES[cfg.llmModel] ?? [4, 20];
  const costUsd = (response.usage.input_tokens * pin + response.usage.output_tokens * pout) / 1_000_000;
  return { script, costUsd };
}
