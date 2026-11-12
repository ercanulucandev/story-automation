import "server-only";
import { spawn } from "node:child_process";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

/** ffmpeg çalıştırır. cwd verilirse göreli dosya yolları kullanılabilir (Windows'ta filtre yollarındaki "C:" sorununu önler). */
export function ffmpeg(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(/*turbopackIgnore: true*/ FFMPEG, ["-hide_banner", "-y", ...args], { cwd, windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    proc.on("error", (e) =>
      reject(new Error(`FFmpeg başlatılamadı (${e.message}). FFmpeg kurulu ve PATH'te olmalı.`)),
    );
    proc.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`FFmpeg hata kodu ${code}:\n${stderr.split("\n").slice(-12).join("\n")}`));
    });
  });
}

/** Medya dosyasının süresini (sn) döndürür. */
export async function probeDuration(file: string, cwd?: string): Promise<number> {
  const out: string = await new Promise((resolve) => {
    const proc = spawn(/*turbopackIgnore: true*/ FFMPEG, ["-hide_banner", "-i", file], { cwd, windowsHide: true });
    let s = "";
    proc.stderr.on("data", (d) => (s += d.toString()));
    proc.on("close", () => resolve(s));
    proc.on("error", () => resolve(""));
  });
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`Süre okunamadı: ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
