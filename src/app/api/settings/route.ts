import { connection } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

const mask = (k: string) => (k ? `${k.slice(0, 4)}••••${k.slice(-4)}` : "");

export async function GET() {
  await connection();
  const s = await getSettings();
  return Response.json({
    keys: Object.fromEntries(Object.entries(s.keys).map(([k, v]) => [k, { set: !!v, masked: mask(v) }])),
  });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { keys?: Partial<Settings["keys"]> };
  const keys: Partial<Settings["keys"]> = {};
  for (const [k, v] of Object.entries(body.keys ?? {})) {
    if (typeof v === "string" && v.trim() !== "") keys[k as keyof Settings["keys"]] = v.trim();
  }
  await saveSettings({ keys: keys as Settings["keys"] });
  return Response.json({ ok: true });
}
