import { connection } from "next/server";
import { listMusic, MUSIC_DIR } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json({ files: await listMusic(), dir: MUSIC_DIR });
}
