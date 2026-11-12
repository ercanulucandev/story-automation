"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Music } from "lucide-react";
import { Button, Card, inputCls, Label } from "@/components/ui";

const PROVIDERS = [
  { key: "anthropic", name: "Senaryo yapay zekası", use: "Senaryo, sahne bölme, başlık / açıklama", url: "https://console.anthropic.com/settings/keys", required: true },
  { key: "fal", name: "fal.ai", use: "Görseller (Flux, Imagen) ve video klipler (Kling, Hailuo, Veo, Seedance)", url: "https://fal.ai/dashboard/keys", required: true },
  { key: "elevenlabs", name: "ElevenLabs", use: "Doğal seslendirme ve kelime zamanlamalı altyazı", url: "https://elevenlabs.io/app/settings/api-keys", required: false },
  { key: "openai", name: "OpenAI", use: "Alternatif, ucuz seslendirme (TTS)", url: "https://platform.openai.com/api-keys", required: false },
] as const;

type KeyState = Record<string, { set: boolean; masked: string }>;

export default function SettingsPage() {
  const [state, setState] = useState<KeyState>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [musicDir, setMusicDir] = useState("");

  const load = () =>
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setState(d.keys));

  useEffect(() => {
    load();
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => setMusicDir(d.dir));
  }, []);

  async function save() {
    setBusy(true);
    await fetch("/api/settings", { method: "PUT", body: JSON.stringify({ keys: form }) });
    setForm({});
    await load();
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
      <p className="text-muted mt-1 mb-6">API anahtarları sadece bu bilgisayarda, <code className="text-xs">data/settings.json</code> dosyasında saklanır.</p>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-violet-300" /> API anahtarları
        </div>
        {PROVIDERS.map((p) => (
          <div key={p.key}>
            <Label
              hint={
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                  Anahtar al <ExternalLink className="size-3" />
                </a>
              }
            >
              {p.name} {p.required && <span className="text-xs text-violet-300 ml-1">gerekli</span>}
            </Label>
            <div className="text-xs text-muted -mt-1 mb-2">{p.use}</div>
            <div className="relative">
              <input
                type="password"
                autoComplete="off"
                className={inputCls}
                placeholder={state[p.key]?.set ? `Kayıtlı: ${state[p.key].masked} (değiştirmek için yeni anahtar gir)` : "Anahtarı yapıştır"}
                value={form[p.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [p.key]: e.target.value }))}
              />
              {state[p.key]?.set && <CheckCircle2 className="size-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={save} loading={busy} disabled={!Object.values(form).some((v) => v.trim())}>
            Kaydet
          </Button>
          {saved && <span className="text-sm text-emerald-300">Kaydedildi</span>}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 font-semibold mb-2">
          <Music className="size-4 text-violet-300" /> Arka plan müzikleri
        </div>
        <p className="text-sm text-muted">
          Telifsiz müzik dosyalarını (mp3, wav, m4a) şu klasöre koy, yeni video oluştururken listede görünürler:
        </p>
        <code className="block mt-2 rounded-lg bg-panel-2 border border-line px-3 py-2 text-xs break-all">{musicDir}</code>
        <p className="text-xs text-muted mt-2">YouTube Ses Kütüphanesi ücretsiz ve güvenli bir kaynak.</p>
      </Card>
    </div>
  );
}
