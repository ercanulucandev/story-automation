import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { LogEntry, Project, ProjectConfig, Settings, StepId } from "./types";
import { STEP_ORDER } from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const MUSIC_DIR = path.join(DATA_DIR, "music");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

export function projectDir(id: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Geçersiz proje id");
  return path.join(PROJECTS_DIR, id);
}

async function ensureDirs() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  await fs.mkdir(MUSIC_DIR, { recursive: true });
}

// ---------- Settings ----------

const EMPTY_SETTINGS: Settings = { keys: { anthropic: "", openai: "", elevenlabs: "", fal: "" } };

export async function getSettings(): Promise<Settings> {
  await ensureDirs();
  let s: Settings = structuredClone(EMPTY_SETTINGS);
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8"));
    s = { ...s, ...raw, keys: { ...s.keys, ...(raw.keys ?? {}) } };
  } catch {}
  // .env değerleri, dosyada anahtar yoksa yedek olarak kullanılır
  s.keys.anthropic ||= process.env.ANTHROPIC_API_KEY ?? "";
  s.keys.openai ||= process.env.OPENAI_API_KEY ?? "";
  s.keys.elevenlabs ||= process.env.ELEVENLABS_API_KEY ?? "";
  s.keys.fal ||= process.env.FAL_KEY ?? "";
  return s;
}

export async function saveSettings(patch: Partial<Settings>) {
  await ensureDirs();
  let current: Settings = structuredClone(EMPTY_SETTINGS);
  try {
    current = { ...current, ...JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) };
  } catch {}
  const next: Settings = { ...current, ...patch, keys: { ...current.keys, ...(patch.keys ?? {}) } };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2));
}

// ---------- Projects ----------

// Proje başına kilit: paralel sahne işlemleri aynı JSON'u bozmasın.
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(id, run.catch(() => {}));
  return run;
}

async function readProjectFile(id: string): Promise<Project> {
  const raw = await fs.readFile(path.join(projectDir(id), "project.json"), "utf8");
  return JSON.parse(raw);
}

async function writeProjectFile(p: Project) {
  p.updatedAt = new Date().toISOString();
  const file = path.join(projectDir(p.id), "project.json");
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(p, null, 2));
  await fs.rename(tmp, file);
}

export async function createProject(config: ProjectConfig): Promise<Project> {
  await ensureDirs();
  const id = nanoid(10).replace(/[^A-Za-z0-9_-]/g, "x");
  await fs.mkdir(projectDir(id), { recursive: true });
  const now = new Date().toISOString();
  const steps = Object.fromEntries(STEP_ORDER.map((s) => [s, { status: "pending" }])) as Project["steps"];
  if (config.videoMode === "image-only") steps.clips = { status: "skipped" };
  const p: Project = {
    id,
    createdAt: now,
    updatedAt: now,
    config,
    status: "draft",
    currentStep: null,
    steps,
    scenes: [],
    logs: [],
    cost: 0,
  };
  await writeProjectFile(p);
  return p;
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    return await withLock(id, () => readProjectFile(id));
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<Project[]> {
  await ensureDirs();
  const ids = await fs.readdir(PROJECTS_DIR);
  const out: Project[] = [];
  for (const id of ids) {
    const p = await getProject(id);
    if (p) out.push(p);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateProject(id: string, fn: (p: Project) => void | Promise<void>): Promise<Project> {
  return withLock(id, async () => {
    const p = await readProjectFile(id);
    await fn(p);
    await writeProjectFile(p);
    return p;
  });
}

export async function deleteProject(id: string) {
  await withLock(id, () => fs.rm(projectDir(id), { recursive: true, force: true }));
}

export function log(id: string, msg: string, level: LogEntry["level"] = "info") {
  return updateProject(id, (p) => {
    p.logs.push({ t: new Date().toISOString(), level, msg });
    if (p.logs.length > 300) p.logs = p.logs.slice(-300);
  });
}

export function setStep(id: string, step: StepId, status: Project["steps"][StepId]["status"], error?: string) {
  return updateProject(id, (p) => {
    p.steps[step] = { status, ...(error ? { error } : {}) };
    if (status === "running") p.currentStep = step;
  });
}

export function addCost(id: string, usd: number) {
  return updateProject(id, (p) => {
    p.cost = Math.round((p.cost + usd) * 10000) / 10000;
  });
}

export async function listMusic(): Promise<string[]> {
  await ensureDirs();
  const files = await fs.readdir(MUSIC_DIR);
  return files.filter((f) => /\.(mp3|wav|m4a|ogg|aac)$/i.test(f));
}
