import { deleteProject, getProject, updateProject } from "@/lib/store";
import { isRunning } from "@/lib/pipeline";
import type { ScriptMeta } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const p = await getProject(id);
  if (!p) return Response.json({ error: "Bulunamadı" }, { status: 404 });
  return Response.json({ ...p, running: isRunning(id) });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { meta?: Partial<ScriptMeta> };
  const p = await updateProject(id, (pp) => {
    if (body.meta && pp.meta) Object.assign(pp.meta, body.meta);
  });
  return Response.json(p);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  if (isRunning(id)) return Response.json({ error: "Çalışan proje silinemez" }, { status: 409 });
  await deleteProject(id);
  return Response.json({ ok: true });
}
