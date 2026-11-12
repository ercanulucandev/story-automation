import { connection } from "next/server";
import { getSettings } from "@/lib/store";
import { listElevenVoices } from "@/lib/providers/tts";

export async function GET() {
  await connection();
  const s = await getSettings();
  try {
    return Response.json({ voices: await listElevenVoices(s.keys.elevenlabs), hasKey: !!s.keys.elevenlabs });
  } catch (e) {
    return Response.json({ voices: [], hasKey: true, error: (e as Error).message });
  }
}
