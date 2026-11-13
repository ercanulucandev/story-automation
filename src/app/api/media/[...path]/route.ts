import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { DATA_DIR } from "@/lib/store";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const SAFE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Sadece izin verilen medya dosyalarının yolunu döndürür:
 *   projects/<projeId>/<dosya>  veya  music/<dosya>
 * Uzantısı medya olmayan dosyalar (settings.json, project.json vb.) asla sunulmaz.
 */
function resolveMediaPath(parts: string[]): string | null {
  let rel: string[];
  if (parts.length === 3 && parts[0] === "projects" && SAFE_ID.test(parts[1]) && SAFE_NAME.test(parts[2])) {
    rel = parts;
  } else if (parts.length === 2 && parts[0] === "music" && SAFE_NAME.test(parts[1])) {
    rel = parts;
  } else {
    return null;
  }
  if (!TYPES[path.extname(rel[rel.length - 1]).toLowerCase()]) return null;
  const file = path.resolve(DATA_DIR, ...rel);
  if (!file.startsWith(DATA_DIR + path.sep)) return null;
  return file;
}

// data/ klasöründeki medya dosyalarını (Range desteğiyle) sunar
export async function GET(req: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const { path: parts } = await ctx.params;
  const file = resolveMediaPath(parts);
  if (!file) return new Response("Not found", { status: 404 });
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const download = new URL(req.url).searchParams.has("download");
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${path.basename(file)}"`;

  const range = req.headers.get("range");
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(stat.size) } });
}
