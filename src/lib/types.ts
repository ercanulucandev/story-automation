export type Aspect = "9:16" | "16:9";
export type VideoMode = "image-to-video" | "image-only";
export type TtsProvider = "elevenlabs" | "openai";
export type CaptionStyle = "bold-pop" | "karaoke" | "clean" | "none";
export type CaptionPosition = "center" | "bottom";

export type StepId = "script" | "voice" | "images" | "clips" | "render";
export const STEP_ORDER: StepId[] = ["script", "voice", "images", "clips", "render"];

export type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface ProjectConfig {
  topic: string;
  genre: string;
  language: string;
  durationSec: number;
  aspect: Aspect;
  tone: string;
  visualStyle: string;
  llmModel: string;
  ttsProvider: TtsProvider;
  voiceId: string;
  voiceName?: string;
  ttsModel: string;
  imageModel: string;
  videoMode: VideoMode;
  videoModel: string;
  captionStyle: CaptionStyle;
  captionPosition: CaptionPosition;
  music: string | null;
  musicVolume: number; // 0..1
  reviewScript: boolean; // pause after script for user review
}

export interface WordTiming {
  w: string;
  start: number;
  end: number;
}

export interface Scene {
  id: string;
  index: number;
  narration: string;
  visualPrompt: string;
  motionPrompt: string;
  audio?: { file: string; duration: number; words: WordTiming[] };
  image?: { file: string; url: string };
  clip?: { file: string; duration: number };
  error?: string;
}

export interface ScriptMeta {
  title: string;
  description: string;
  tags: string[];
  hook: string;
  thumbnailPrompt: string;
  characterSheet: string;
}

export interface LogEntry {
  t: string;
  level: "info" | "warn" | "error";
  msg: string;
}

export type ProjectStatus = "draft" | "running" | "review" | "done" | "error";

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  config: ProjectConfig;
  status: ProjectStatus;
  currentStep: StepId | null;
  steps: Record<StepId, { status: StepStatus; error?: string }>;
  meta?: ScriptMeta;
  scenes: Scene[];
  thumbnail?: string;
  output?: { video: string; duration: number; renderedAt: string };
  reviewApproved?: boolean;
  logs: LogEntry[];
  cost: number; // estimated USD
}

export interface Settings {
  keys: {
    anthropic: string;
    openai: string;
    elevenlabs: string;
    fal: string;
  };
}
