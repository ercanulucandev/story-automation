import { connection } from "next/server";
import { createProject, listProjects } from "@/lib/store";
import { runPipeline } from "@/lib/pipeline";
import type { ProjectConfig } from "@/lib/types";

export async function GET() {
  await connection();
  return Response.json(await listProjects());
}

export async function POST(req: Request) {
  const body = (await req.json()) as { config: ProjectConfig; start?: boolean };
  const p = await createProject(body.config);
  if (body.start !== false) runPipeline(p.id).catch(() => {});
  return Response.json(p);
}
