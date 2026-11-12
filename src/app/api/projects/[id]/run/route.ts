import { isRunning, resetFrom, runPipeline } from "@/lib/pipeline";
import type { StepId } from "@/lib/types";
import { STEP_ORDER } from "@/lib/types";

// Body: { approve?: boolean, from?: StepId }
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/run">) {
  const { id } = await ctx.params;
  if (isRunning(id)) return Response.json({ error: "Proje zaten çalışıyor" }, { status: 409 });
  const body = (await req.json().catch(() => ({}))) as { approve?: boolean; from?: StepId };
  if (body.from && STEP_ORDER.includes(body.from)) await resetFrom(id, body.from);
  runPipeline(id, { approveReview: body.approve }).catch(() => {});
  return Response.json({ ok: true });
}
