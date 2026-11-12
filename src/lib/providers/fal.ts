import "server-only";
import fs from "node:fs/promises";

/** fal.ai kuyruk API'si: tek anahtarla Flux, Kling, Hailuo, Veo, Seedance... */
async function falRun<T>(apiKey: string, model: string, input: Record<string, unknown>, timeoutMs = 15 * 60_000): Promise<T> {
  if (!apiKey) throw new Error("fal.ai API anahtarı eksik. Ayarlar sayfasından ekleyin.");
  const headers = { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal.ai (${model}) hata ${submit.status}: ${(await submit.text()).slice(0, 400)}`);
  const { status_url, response_url } = (await submit.json()) as { status_url: string; response_url: string };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(status_url, { headers });
    if (!st.ok) continue;
    const s = (await st.json()) as { status: string; error?: string };
    if (s.status === "COMPLETED") break;
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error(`fal.ai işi başarısız: ${s.error ?? ""}`);
  }
  if (Date.now() >= deadline) throw new Error(`fal.ai zaman aşımı (${model})`);

  const out = await fetch(response_url, { headers });
  const body = await out.text();
  if (!out.ok) throw new Error(`fal.ai sonuç hatası ${out.status}: ${body.slice(0, 400)}`);
  return JSON.parse(body) as T;
}

async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme başarısız (${res.status})`);
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
}

export async function generateImage(
  apiKey: string,
  opts: { model: string; prompt: string; aspect: "9:16" | "16:9"; outFile: string },
): Promise<{ url: string }> {
  const out = await falRun<{ images?: { url: string }[] }>(apiKey, opts.model, {
    prompt: opts.prompt,
    image_size: opts.aspect === "9:16" ? "portrait_16_9" : "landscape_16_9",
    aspect_ratio: opts.aspect,
    num_images: 1,
    enable_safety_checker: true,
  });
  const url = out.images?.[0]?.url;
  if (!url) throw new Error("Görsel modeli sonuç döndürmedi.");
  await download(url, opts.outFile);
  return { url };
}

export async function generateClip(
  apiKey: string,
  opts: { model: string; prompt: string; imageUrl: string; extra: Record<string, unknown>; outFile: string },
) {
  const out = await falRun<{ video?: { url: string } }>(apiKey, opts.model, {
    prompt: opts.prompt,
    image_url: opts.imageUrl,
    ...opts.extra,
  });
  const url = out.video?.url;
  if (!url) throw new Error("Video modeli sonuç döndürmedi.");
  await download(url, opts.outFile);
}
