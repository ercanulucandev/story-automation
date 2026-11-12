import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { findImageModel, findVideoModel, LLM_MODELS, VISUAL_STYLES } from "./catalog";
import { buildAss } from "./captions";
import { ffmpeg, probeDuration } from "./ffmpeg";
import { generateScript } from "./providers/llm";
import { elevenLabsTts, estimateWordTimings, openAiTts } from "./providers/tts";
import { generateClip, generateImage } from "./providers/fal";
import { addCost, getProject, getSettings, log, MUSIC_DIR, projectDir, setStep, updateProject } from "./store";
import type { Project, Scene, StepId, WordTiming } from "./types";
import { STEP_ORDER } from "./types";

// Çalışan pipeline'lar (dev sunucusunda HMR sonrası da korunsun diye globalThis'te)
const g = globalThis as unknown as { __saRunning?: Set<string> };
const running = (g.__saRunning ??= new Set<string>());

export function isRunning(id: string) {
  return running.has(id);
}

const FPS = 30;
const SCENE_GAP = 0.35; // sahneler arası nefes payı (sn)

export function dims(aspect: Project["config"]["aspect"]) {
  return aspect === "9:16" ? { W: 1080, H: 1920 } : { W: 1920, H: 1080 };
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const errors: unknown[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      try {
        await fn(item);
      } catch (e) {
        errors.push(e);
      }
    }
  });
  await Promise.all(workers);
  if (errors.length) {
    throw new Error(`${errors.length} sahnede hata: ${errors.map((e) => (e as Error).message).join(" | ").slice(0, 600)}`);
  }
}

function patchScene(id: string, sceneId: string, fn: (s: Scene) => void) {
  return updateProject(id, (p) => {
    const s = p.scenes.find((x) => x.id === sceneId);
    if (s) fn(s);
  });
}

// ---------------- Adımlar ----------------

async function stepScript(p: Project) {
  const settings = await getSettings();
  const vm = findVideoModel(p.config.videoModel);
  const clipSeconds = p.config.videoMode === "image-to-video" ? vm.durations[0] : 6;
  const llmLabel = LLM_MODELS.find((m) => m.id === p.config.llmModel)?.label ?? "AI";
  await log(p.id, `Senaryo yazılıyor (${llmLabel} model)…`);
  const { script, costUsd } = await generateScript(settings.keys.anthropic, p.config, clipSeconds);
  await addCost(p.id, costUsd);
  await updateProject(p.id, (pp) => {
    pp.meta = {
      title: script.title,
      description: script.description,
      tags: script.tags,
      hook: script.hook,
      thumbnailPrompt: script.thumbnailPrompt,
      characterSheet: script.characterSheet,
    };
    pp.scenes = script.scenes.map((s, index) => ({ id: nanoid(8), index, ...s }));
  });
  await log(p.id, `Senaryo hazır: "${script.title}" (${script.scenes.length} sahne)`);
}

async function stepVoice(p: Project) {
  const settings = await getSettings();
  const dir = projectDir(p.id);
  const todo = p.scenes.filter((s) => !s.audio);
  await log(p.id, `Seslendirme: ${todo.length} sahne`);
  await pool(todo, 3, async (s) => {
    const file = `scene_${s.id}_audio_${Date.now()}.mp3`;
    const out = path.join(dir, file);
    try {
      const r =
        p.config.ttsProvider === "elevenlabs"
          ? await elevenLabsTts(settings.keys.elevenlabs, { text: s.narration, voiceId: p.config.voiceId, model: p.config.ttsModel, outFile: out })
          : await openAiTts(settings.keys.openai, { text: s.narration, voice: p.config.voiceId, outFile: out });
      const duration = await probeDuration(out);
      const words = r.words.length ? r.words : estimateWordTimings(s.narration, duration);
      await addCost(p.id, r.costUsd);
      await patchScene(p.id, s.id, (sc) => {
        sc.audio = { file, duration, words };
        delete sc.error;
      });
    } catch (e) {
      await patchScene(p.id, s.id, (sc) => (sc.error = (e as Error).message));
      throw e;
    }
  });
}

function stylePrompt(p: Project) {
  return VISUAL_STYLES.find((v) => v.id === p.config.visualStyle)?.prompt ?? p.config.visualStyle;
}

async function stepImages(p: Project) {
  const settings = await getSettings();
  const dir = projectDir(p.id);
  const im = findImageModel(p.config.imageModel);
  const style = stylePrompt(p);
  const chars = p.meta?.characterSheet ? ` Characters: ${p.meta.characterSheet}.` : "";
  const todo = p.scenes.filter((s) => !s.image);
  await log(p.id, `Görseller üretiliyor: ${todo.length} sahne (${im.label})`);

  const jobs: Promise<void>[] = [];
  if (!p.thumbnail && p.meta) {
    jobs.push(
      (async () => {
        const file = `thumbnail_${Date.now()}.jpg`;
        await generateImage(settings.keys.fal, {
          model: im.id,
          prompt: `${p.meta!.thumbnailPrompt}. ${style}.${chars} No text.`,
          aspect: p.config.aspect,
          outFile: path.join(dir, file),
        });
        await addCost(p.id, im.price);
        await updateProject(p.id, (pp) => {
          pp.thumbnail = file;
        });
      })().catch(async (e) => {
        await log(p.id, `Thumbnail üretilemedi: ${(e as Error).message}`, "warn");
      }),
    );
  }
  jobs.push(
    pool(todo, 4, async (s) => {
      const file = `scene_${s.id}_image_${Date.now()}.jpg`;
      try {
        const { url } = await generateImage(settings.keys.fal, {
          model: im.id,
          prompt: `${s.visualPrompt}. ${style}.${chars} No text, no watermark.`,
          aspect: p.config.aspect,
          outFile: path.join(dir, file),
        });
        await addCost(p.id, im.price);
        await patchScene(p.id, s.id, (sc) => {
          sc.image = { file, url };
          delete sc.error;
        });
      } catch (e) {
        await patchScene(p.id, s.id, (sc) => (sc.error = (e as Error).message));
        throw e;
      }
    }),
  );
  const results = await Promise.allSettled(jobs);
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw (failed as PromiseRejectedResult).reason;
}

async function stepClips(p: Project) {
  const settings = await getSettings();
  const dir = projectDir(p.id);
  const vm = findVideoModel(p.config.videoModel);
  const todo = p.scenes.filter((s) => !s.clip);
  await log(p.id, `Video klipler üretiliyor: ${todo.length} sahne (${vm.label}). Bu adım birkaç dakika sürebilir.`);
  await pool(todo, 3, async (s) => {
    if (!s.image) throw new Error(`Sahne ${s.index + 1} için görsel yok`);
    const need = (s.audio?.duration ?? vm.durations[0]) - 0.5;
    const d = vm.durations.find((x) => x >= need) ?? vm.durations[vm.durations.length - 1];
    const file = `scene_${s.id}_clip_${Date.now()}.mp4`;
    try {
      let imageUrl = s.image.url;
      if (!imageUrl) {
        const buf = await fs.readFile(path.join(dir, s.image.file));
        imageUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
      }
      await generateClip(settings.keys.fal, {
        model: vm.id,
        prompt: `${s.motionPrompt} ${s.visualPrompt}`.slice(0, 1500),
        imageUrl,
        extra: vm.durationParam(d),
        outFile: path.join(dir, file),
      });
      const duration = await probeDuration(path.join(dir, file));
      await addCost(p.id, d * vm.pricePerSec);
      await patchScene(p.id, s.id, (sc) => {
        sc.clip = { file, duration };
        delete sc.error;
      });
      await log(p.id, `Klip ${s.index + 1}/${p.scenes.length} hazır`);
    } catch (e) {
      await patchScene(p.id, s.id, (sc) => (sc.error = (e as Error).message));
      throw e;
    }
  });
}

async function stepRender(p: Project) {
  const dir = projectDir(p.id);
  const { W, H } = dims(p.config.aspect);
  const tmp = path.join(dir, "render");
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp, { recursive: true });
  await log(p.id, `Render başladı (${W}x${H})`);

  const scenes = [...p.scenes].sort((a, b) => a.index - b.index);
  const segDurs = scenes.map((s, i) => {
    if (!s.audio) throw new Error(`Sahne ${i + 1} için ses yok`);
    return s.audio.duration + (i === scenes.length - 1 ? 1.2 : SCENE_GAP);
  });

  // 1) Her sahne için sessiz video segmenti
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const dur = segDurs[i];
    const seg = `render/seg_${String(i).padStart(3, "0")}.mp4`;
    const enc = ["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), seg];
    if (s.clip && p.config.videoMode === "image-to-video") {
      const factor = Math.min(Math.max(dur / s.clip.duration, 1), 1.5);
      const pad = Math.max(0, dur - s.clip.duration * factor) + 0.5;
      const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,setpts=${factor.toFixed(4)}*PTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}`;
      await ffmpeg(["-i", s.clip.file, "-vf", vf, "-t", dur.toFixed(3), ...enc], dir);
    } else if (s.image) {
      // Ken Burns: sırayla yakınlaş / uzaklaş
      const frames = Math.ceil(dur * FPS);
      const sw = Math.round(W * 1.5), sh = Math.round(H * 1.5);
      const z = i % 2 === 0 ? `min(1+0.15*on/${frames},1.15)` : `max(1.15-0.15*on/${frames},1)`;
      const vf = `scale=${sw}:${sh}:force_original_aspect_ratio=increase,crop=${sw}:${sh},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},setsar=1`;
      await ffmpeg(["-i", s.image.file, "-vf", vf, "-frames:v", String(frames), ...enc], dir);
    } else {
      throw new Error(`Sahne ${i + 1} için görsel/klip yok`);
    }
  }
  await fs.writeFile(
    path.join(tmp, "list.txt"),
    scenes.map((_, i) => `file 'seg_${String(i).padStart(3, "0")}.mp4'`).join("\n"),
  );
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", "render/list.txt", "-c", "copy", "render/video.mp4"], dir);

  // 2) Anlatım ses kanalı (sahne süresine göre doldurulmuş)
  const aInputs = scenes.flatMap((s) => ["-i", s.audio!.file]);
  const aFilter =
    scenes
      .map((_, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${segDurs[i].toFixed(3)},atrim=0:${segDurs[i].toFixed(3)}[a${i}]`)
      .join(";") + `;${scenes.map((_, i) => `[a${i}]`).join("")}concat=n=${scenes.length}:v=0:a=1[out]`;
  await ffmpeg([...aInputs, "-filter_complex", aFilter, "-map", "[out]", "render/narration.wav"], dir);

  // 3) Altyazı
  const total = segDurs.reduce((a, b) => a + b, 0);
  const allWords: WordTiming[] = [];
  let offset = 0;
  scenes.forEach((s, i) => {
    for (const w of s.audio!.words) allWords.push({ w: w.w, start: w.start + offset, end: w.end + offset });
    offset += segDurs[i];
  });
  const useCaptions = p.config.captionStyle !== "none" && allWords.length > 0;
  if (useCaptions) {
    await fs.writeFile(
      path.join(tmp, "captions.ass"),
      buildAss({ words: allWords, width: W, height: H, style: p.config.captionStyle, position: p.config.captionPosition, locale: p.config.language }),
    );
  }

  // 4) Final: video + altyazı + anlatım + müzik
  const outFile = `final_${Date.now()}.mp4`;
  const args = ["-i", "render/video.mp4", "-i", "render/narration.wav"];
  let musicPath: string | null = null;
  if (p.config.music) {
    const mp = path.join(MUSIC_DIR, path.basename(p.config.music));
    try {
      await fs.access(mp);
      musicPath = mp;
    } catch {
      await log(p.id, `Müzik dosyası bulunamadı: ${p.config.music}`, "warn");
    }
  }
  if (musicPath) args.push("-stream_loop", "-1", "-i", musicPath);
  const filters: string[] = [];
  filters.push(useCaptions ? "[0:v]ass=render/captions.ass[v]" : "[0:v]null[v]");
  if (musicPath) {
    const vol = Math.min(Math.max(p.config.musicVolume, 0), 1).toFixed(2);
    filters.push(
      `[2:a]volume=${vol},afade=t=out:st=${Math.max(0, total - 2.5).toFixed(2)}:d=2.5[m]`,
      `[1:a][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
    );
  } else {
    filters.push(`[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  }
  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-t", total.toFixed(3),
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart",
    outFile,
  );
  await ffmpeg(args, dir);

  const prev = (await getProject(p.id))?.output?.video;
  await updateProject(p.id, (pp) => {
    pp.output = { video: outFile, duration: total, renderedAt: new Date().toISOString() };
  });
  if (prev && prev !== outFile) await fs.rm(path.join(dir, prev), { force: true });
  await fs.rm(tmp, { recursive: true, force: true });
  await log(p.id, `Video hazır (${total.toFixed(1)} sn)`);
}

const STEPS: Record<StepId, (p: Project) => Promise<void>> = {
  script: stepScript,
  voice: stepVoice,
  images: stepImages,
  clips: stepClips,
  render: stepRender,
};

/** Bekleyen tüm adımları sırayla çalıştırır. Var olan sahne çıktılarını yeniden üretmez. */
export async function runPipeline(id: string, opts: { approveReview?: boolean } = {}) {
  if (running.has(id)) throw new Error("Bu proje zaten çalışıyor.");
  running.add(id);
  try {
    await updateProject(id, (p) => {
      p.status = "running";
      if (opts.approveReview) p.reviewApproved = true;
    });
    for (const step of STEP_ORDER) {
      const p = await getProject(id);
      if (!p) return;
      if (p.steps[step].status === "done" || p.steps[step].status === "skipped") continue;

      if (step === "voice" && p.config.reviewScript && !p.reviewApproved && !opts.approveReview) {
        await updateProject(id, (pp) => {
          pp.status = "review";
          pp.currentStep = null;
        });
        await log(id, "Senaryo onayınızı bekliyor. Düzenleyip 'Onayla ve devam et'e basın.");
        return;
      }

      await setStep(id, step, "running");
      try {
        await STEPS[step](p);
        await setStep(id, step, "done");
      } catch (e) {
        const msg = (e as Error).message;
        await setStep(id, step, "error", msg);
        await log(id, `${step} adımı başarısız: ${msg}`, "error");
        await updateProject(id, (pp) => {
          pp.status = "error";
          pp.currentStep = null;
        });
        return;
      }
    }
    await updateProject(id, (p) => {
      p.status = "done";
      p.currentStep = null;
    });
  } finally {
    running.delete(id);
  }
}

/** Tek bir sahnenin ses / görsel / klibini sıfırlar ve pipeline'ı yeniden çalıştırır. */
export async function resetSceneAsset(id: string, sceneId: string, what: "audio" | "image" | "clip") {
  await updateProject(id, (p) => {
    const s = p.scenes.find((x) => x.id === sceneId);
    if (!s) throw new Error("Sahne bulunamadı");
    if (what === "audio") {
      delete s.audio;
      p.steps.voice = { status: "pending" };
    }
    if (what === "image") {
      delete s.image;
      p.steps.images = { status: "pending" };
      if (p.config.videoMode === "image-to-video") {
        delete s.clip;
        p.steps.clips = { status: "pending" };
      }
    }
    if (what === "clip") {
      delete s.clip;
      p.steps.clips = { status: "pending" };
    }
    delete s.error;
    p.steps.render = { status: "pending" };
  });
}

/** Belirtilen adımdan itibaren her şeyi sıfırlar. */
export async function resetFrom(id: string, step: StepId) {
  const idx = STEP_ORDER.indexOf(step);
  await updateProject(id, (p) => {
    for (const s of STEP_ORDER.slice(idx)) {
      if (p.steps[s].status !== "skipped") p.steps[s] = { status: "pending" };
    }
    if (idx <= 0) {
      p.scenes = [];
      delete p.meta;
      delete p.thumbnail;
      p.reviewApproved = false;
    }
    for (const sc of p.scenes) {
      if (idx <= 1) delete sc.audio;
      if (idx <= 2) delete sc.image;
      if (idx <= 3) delete sc.clip;
      delete sc.error;
    }
    if (idx <= 2) delete p.thumbnail;
  });
}
