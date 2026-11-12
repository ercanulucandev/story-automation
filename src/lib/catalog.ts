// Kullanıcının seçebileceği her şey burada. Yeni model/tür eklemek için sadece bu dosyayı düzenle.

export const GENRES = [
  { id: "horror", label: "Korku", emoji: "👻" },
  { id: "mystery", label: "Gizem / Gerilim", emoji: "🕵️" },
  { id: "true-crime", label: "Gerçek Suç", emoji: "🔪" },
  { id: "fantasy", label: "Fantastik", emoji: "🐉" },
  { id: "sci-fi", label: "Bilim Kurgu", emoji: "🚀" },
  { id: "mythology", label: "Mitoloji", emoji: "⚡" },
  { id: "legends", label: "Efsaneler", emoji: "🏰" },
  { id: "history", label: "Tarih", emoji: "📜" },
  { id: "kids", label: "Çocuk Masalı", emoji: "🧸" },
  { id: "romance", label: "Romantik", emoji: "💌" },
  { id: "comedy", label: "Komedi", emoji: "😂" },
  { id: "motivation", label: "Motivasyon", emoji: "🔥" },
  { id: "drama", label: "Dram / İtiraf", emoji: "🎭" },
  { id: "facts", label: "İlginç Bilgiler", emoji: "🧠" },
];

export const LANGUAGES = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
  { id: "it", label: "Italiano" },
  { id: "ru", label: "Русский" },
  { id: "ar", label: "العربية" },
  { id: "hi", label: "हिन्दी" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
];

export const TONES = ["Gerilimli", "Gizemli", "Duygusal", "Epik", "Eğlenceli", "Sakin", "Karanlık", "İlham verici"];

export const VISUAL_STYLES = [
  { id: "cinematic", label: "Sinematik Gerçekçi", prompt: "cinematic photorealistic film still, dramatic lighting, shallow depth of field, 35mm, highly detailed" },
  { id: "dark-fantasy", label: "Karanlık Fantastik", prompt: "dark fantasy digital painting, moody atmosphere, volumetric fog, rich shadows, epic composition" },
  { id: "anime", label: "Anime", prompt: "high quality anime illustration, vibrant colors, detailed background, studio anime film style" },
  { id: "3d-animation", label: "3D Animasyon", prompt: "stylized 3D animated movie still, soft global illumination, expressive characters, colorful" },
  { id: "watercolor", label: "Suluboya", prompt: "delicate watercolor illustration, soft edges, paper texture, storybook style" },
  { id: "comic", label: "Çizgi Roman", prompt: "graphic novel comic art, bold ink lines, halftone shading, dramatic panels" },
  { id: "vintage", label: "Vintage Film", prompt: "vintage 1970s film photograph, grain, faded colors, nostalgic atmosphere" },
  { id: "horror-found", label: "Found Footage", prompt: "eerie found footage still, low light, grainy, unsettling atmosphere, realistic" },
  { id: "oil-painting", label: "Yağlı Boya", prompt: "classical oil painting, rich brush strokes, chiaroscuro lighting, museum quality" },
  { id: "pixel", label: "Pixel Art", prompt: "detailed pixel art scene, 32-bit, vibrant palette, retro game style" },
];

export const DURATIONS = [
  { sec: 30, label: "30 sn" },
  { sec: 45, label: "45 sn" },
  { sec: 60, label: "1 dk" },
  { sec: 90, label: "1.5 dk" },
  { sec: 180, label: "3 dk" },
  { sec: 300, label: "5 dk" },
  { sec: 600, label: "10 dk" },
];

export const LLM_MODELS = [
  { id: "claude-opus-5-5", label: "Premium", note: "En iyi hikaye kalitesi" },
  { id: "claude-sonnet-5-5", label: "Dengeli", note: "Hızlı ve kaliteli" },
  { id: "claude-haiku-5-5", label: "Ekonomik", note: "En ucuz" },
];

export interface ImageModel {
  id: string;
  label: string;
  price: number; // ~USD / görsel
}
export const IMAGE_MODELS: ImageModel[] = [
  { id: "fal-ai/flux/schnell", label: "Flux Schnell (hızlı, ucuz)", price: 0.003 },
  { id: "fal-ai/flux/dev", label: "Flux Dev (dengeli)", price: 0.025 },
  { id: "fal-ai/flux-pro/v1.1", label: "Flux Pro 1.1 (kaliteli)", price: 0.04 },
  { id: "fal-ai/imagen4/preview", label: "Google Imagen 4", price: 0.04 },
];

export interface VideoModel {
  id: string;
  label: string;
  durations: number[]; // desteklenen klip uzunlukları (sn)
  durationParam: (d: number) => Record<string, unknown>;
  pricePerSec: number; // ~USD
}
export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "fal-ai/kling-video/v2.1/standard/image-to-video",
    label: "Kling 2.1 Standard",
    durations: [5, 10],
    durationParam: (d) => ({ duration: String(d) }),
    pricePerSec: 0.05,
  },
  {
    id: "fal-ai/kling-video/v2.1/master/image-to-video",
    label: "Kling 2.1 Master (premium)",
    durations: [5, 10],
    durationParam: (d) => ({ duration: String(d) }),
    pricePerSec: 0.28,
  },
  {
    id: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    label: "Hailuo 02 Standard",
    durations: [6, 10],
    durationParam: (d) => ({ duration: String(d) }),
    pricePerSec: 0.045,
  },
  {
    id: "fal-ai/bytedance/seedance/v1/lite/image-to-video",
    label: "Seedance Lite (ucuz)",
    durations: [5, 10],
    durationParam: (d) => ({ duration: String(d) }),
    pricePerSec: 0.036,
  },
  {
    id: "fal-ai/veo3/fast/image-to-video",
    label: "Google Veo 3 Fast",
    durations: [8],
    durationParam: () => ({ duration: "8s", generate_audio: false }),
    pricePerSec: 0.25,
  },
];

export const ELEVEN_MODELS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2 (en doğal)" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 (hızlı, ucuz)" },
  { id: "eleven_v3", label: "Eleven v3 (en ifadeli)" },
];

export const OPENAI_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];

export const CAPTION_STYLES = [
  { id: "bold-pop", label: "Bold Pop", desc: "Büyük harf, sarı vurgulu kelime" },
  { id: "karaoke", label: "Karaoke", desc: "Okunan kelime yeşil yanar" },
  { id: "clean", label: "Sade", desc: "Beyaz, vurgusuz" },
  { id: "none", label: "Altyazı yok", desc: "" },
] as const;

export function findVideoModel(id: string): VideoModel {
  return (
    VIDEO_MODELS.find((m) => m.id === id) ?? {
      id,
      label: id,
      durations: [5],
      durationParam: (d) => ({ duration: String(d) }),
      pricePerSec: 0.1,
    }
  );
}

export function findImageModel(id: string): ImageModel {
  return IMAGE_MODELS.find((m) => m.id === id) ?? { id, label: id, price: 0.03 };
}

/** Bir projenin kabaca maliyet tahmini (USD). */
export function estimateCost(cfg: {
  durationSec: number;
  imageModel: string;
  videoModel: string;
  videoMode: string;
  ttsProvider: string;
  llmModel: string;
}) {
  const sceneCount = Math.max(3, Math.round(cfg.durationSec / 6));
  const llm = cfg.llmModel.includes("haiku") ? 0.01 : cfg.llmModel.includes("sonnet") ? 0.04 : 0.08;
  const chars = cfg.durationSec * 15;
  const tts = cfg.ttsProvider === "elevenlabs" ? chars * 0.0002 : chars * 0.000015;
  const images = (sceneCount + 1) * findImageModel(cfg.imageModel).price;
  const vm = findVideoModel(cfg.videoModel);
  const video = cfg.videoMode === "image-to-video" ? sceneCount * vm.durations[0] * vm.pricePerSec * 1.2 : 0;
  return { sceneCount, llm, tts, images, video, total: llm + tts + images + video };
}
