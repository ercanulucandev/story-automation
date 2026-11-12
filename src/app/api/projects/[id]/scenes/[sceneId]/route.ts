import { isRunning, resetSceneAsset, runPipeline } from "@/lib/pipeline";
import { updateProject } from "@/lib/store";

type Ctx = RouteContext<"/api/projects/[id]/scenes/[sceneId]">;

// Sahne metnini / promptlarını düzenle
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, sceneId } = await ctx.params;
  if (isRunning(id)) return Response.json({ error: "Proje çalışırken düzenlenemez" }, { status: 409 });
  const body = (await req.json()) as { narration?: string; visualPrompt?: string; motionPrompt?: string };
  const p = await updateProject(id, (pp) => {
    const s = pp.scenes.find((x) => x.id === sceneId);
    if (!s) return;
    if (body.narration !== undefined && body.narration !== s.narration) {
      s.narration = body.narration;
      if (s.audio) {
        delete s.audio;
        pp.steps.voice = { status: "pending" };
        pp.steps.render = { status: "pending" };
      }
    }
    if (body.visualPrompt !== undefined) s.visualPrompt = body.visualPrompt;
    if (body.motionPrompt !== undefined) s.motionPrompt = body.motionPrompt;
  });
  return Response.json(p);
}

// Sahnenin bir çıktısını yeniden üret: { what: "audio" | "image" | "clip" }
export async function POST(req: Request, ctx: Ctx) {
  const { id, sceneId } = await ctx.params;
  if (isRunning(id)) return Response.json({ error: "Proje zaten çalışıyor" }, { status: 409 });
  const { what } = (await req.json()) as { what: "audio" | "image" | "clip" };
  if (!["audio", "image", "clip"].includes(what)) return Response.json({ error: "Geçersiz" }, { status: 400 });
  await resetSceneAsset(id, sceneId, what);
  runPipeline(id, { approveReview: true }).catch(() => {});
  return Response.json({ ok: true });
}
