"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Monitor, Pause, Play, Smartphone, Sparkles, Wand2 } from "lucide-react";
import { Button, Card, Chip, inputCls, Label, money } from "@/components/ui";
import {
  CAPTION_STYLES,
  DURATIONS,
  ELEVEN_MODELS,
  estimateCost,
  GENRES,
  IMAGE_MODELS,
  LANGUAGES,
  LLM_MODELS,
  OPENAI_VOICES,
  TONES,
  VIDEO_MODELS,
  VISUAL_STYLES,
} from "@/lib/catalog";
import type { ProjectConfig } from "@/lib/types";

const DEFAULTS: ProjectConfig = {
  topic: "",
  genre: "horror",
  language: "tr",
  durationSec: 60,
  aspect: "9:16",
  tone: "Gerilimli",
  visualStyle: "cinematic",
  llmModel: "claude-opus-5-5",
  ttsProvider: "elevenlabs",
  voiceId: "",
  ttsModel: "eleven_multilingual_v2",
  imageModel: "fal-ai/flux/dev",
  videoMode: "image-to-video",
  videoModel: VIDEO_MODELS[0].id,
  captionStyle: "bold-pop",
  captionPosition: "center",
  music: null,
  musicVolume: 0.15,
  reviewScript: true,
};

const STEPS = ["Hikaye", "Görsel & Video", "Ses & Altyazı", "Özet"];

type Voice = { id: string; name: string; preview: string | null; labels: string };

export default function NewProject() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<ProjectConfig>(DEFAULTS);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [music, setMusic] = useState<{ files: string[]; dir: string }>({ files: [], dir: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sa:lastConfig");
      if (saved) setCfg({ ...DEFAULTS, ...JSON.parse(saved), topic: "" });
    } catch {}
    fetch("/api/voices")
      .then((r) => r.json())
      .then((d) => {
        setVoices(d.voices ?? []);
        if (!d.hasKey) setVoiceErr("ElevenLabs anahtarı yok. Ayarlar'dan ekleyin ya da OpenAI TTS seçin.");
        else if (d.error) setVoiceErr(d.error);
      })
      .catch(() => {});
    fetch("/api/music")
      .then((r) => r.json())
      .then(setMusic)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cfg.ttsProvider === "elevenlabs" && voices.length && !voices.some((v) => v.id === cfg.voiceId)) {
      setCfg((c) => ({ ...c, voiceId: voices[0].id, voiceName: voices[0].name }));
    }
    if (cfg.ttsProvider === "openai" && !OPENAI_VOICES.includes(cfg.voiceId)) {
      setCfg((c) => ({ ...c, voiceId: "onyx", voiceName: "onyx" }));
    }
  }, [cfg.ttsProvider, cfg.voiceId, voices]);

  const set = <K extends keyof ProjectConfig>(k: K, v: ProjectConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const cost = useMemo(() => estimateCost(cfg), [cfg]);

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      localStorage.setItem("sa:lastConfig", JSON.stringify(cfg));
    } catch {}
    try {
      const r = await fetch("/api/projects", { method: "POST", body: JSON.stringify({ config: cfg }) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Oluşturulamadı");
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Wand2 className="size-6 text-violet-300" /> Yeni Video
      </h1>
      <p className="text-muted mt-1 mb-6">Her şeyi sen seç, üretimi program yönetsin.</p>

      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 text-sm border transition ${
              i === step ? "border-accent/50 bg-accent/10 text-white" : "border-line text-muted hover:text-white"
            }`}
          >
            <span
              className={`grid place-items-center size-6 rounded-full text-xs ${
                i < step ? "bg-emerald-500/20 text-emerald-300" : i === step ? "btn-primary text-white" : "bg-white/10"
              }`}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Card className="p-6 space-y-7">
          {step === 0 && (
            <>
              <div>
                <Label hint="Boş bırakırsan AI özgün bir fikir bulur">Konu / fikir</Label>
                <textarea
                  className={`${inputCls} min-h-24 resize-y`}
                  placeholder="Örn: Gece vardiyasında çalışan bir bekçi, terk edilmiş hastanenin 4. katından gelen telefonlara cevap veriyor…"
                  value={cfg.topic}
                  onChange={(e) => set("topic", e.target.value)}
                />
              </div>
              <div>
                <Label>Tür</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {GENRES.map((g) => (
                    <Chip key={g.id} active={cfg.genre === g.id} onClick={() => set("genre", g.id)}>
                      <span className="mr-1.5">{g.emoji}</span>
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label>Dil</Label>
                  <select className={inputCls} value={cfg.language} onChange={(e) => set("language", e.target.value)}>
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Ton</Label>
                  <select className={inputCls} value={cfg.tone} onChange={(e) => set("tone", e.target.value)}>
                    {TONES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Süre</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Chip key={d.sec} active={cfg.durationSec === d.sec} onClick={() => set("durationSec", d.sec)}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Senaryo modeli</Label>
                <div className="grid sm:grid-cols-3 gap-2">
                  {LLM_MODELS.map((m) => (
                    <Chip key={m.id} active={cfg.llmModel === m.id} onClick={() => set("llmModel", m.id)}>
                      <div className="font-medium text-white/90">{m.label}</div>
                      <div className="text-xs text-muted">{m.note}</div>
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label>Format</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["9:16", "16:9"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        set("aspect", a);
                        set("captionPosition", a === "9:16" ? "center" : "bottom");
                      }}
                      className={`rounded-2xl border p-4 flex items-center gap-4 transition ${
                        cfg.aspect === a ? "border-accent/60 bg-accent/10" : "border-line bg-panel-2 hover:border-white/20"
                      }`}
                    >
                      <div className={`rounded-md border-2 ${cfg.aspect === a ? "border-violet-300" : "border-white/30"} ${a === "9:16" ? "w-7 h-12" : "w-14 h-8"}`} />
                      <div className="text-left">
                        <div className="font-medium flex items-center gap-1.5">
                          {a === "9:16" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                          {a === "9:16" ? "Dikey (Shorts)" : "Yatay (YouTube)"}
                        </div>
                        <div className="text-xs text-muted">{a === "9:16" ? "1080×1920" : "1920×1080"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Görsel stil</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {VISUAL_STYLES.map((s) => (
                    <Chip key={s.id} active={cfg.visualStyle === s.id} onClick={() => set("visualStyle", s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Video modu</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Chip active={cfg.videoMode === "image-to-video"} onClick={() => set("videoMode", "image-to-video")}>
                    <div className="font-medium text-white/90">🎬 AI Video</div>
                    <div className="text-xs text-muted">Her sahne gerçek hareketli video klip olur</div>
                  </Chip>
                  <Chip active={cfg.videoMode === "image-only"} onClick={() => set("videoMode", "image-only")}>
                    <div className="font-medium text-white/90">🖼️ Görsel + Hareket</div>
                    <div className="text-xs text-muted">Zoom/pan efektli görseller, çok daha ucuz</div>
                  </Chip>
                </div>
              </div>
              {cfg.videoMode === "image-to-video" && (
                <div>
                  <Label hint="fal.ai üzerinden">Video modeli</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {VIDEO_MODELS.map((m) => (
                      <Chip key={m.id} active={cfg.videoModel === m.id} onClick={() => set("videoModel", m.id)}>
                        <div className="font-medium text-white/90">{m.label}</div>
                        <div className="text-xs text-muted">
                          {m.durations.join("/")} sn klip · ~{money(m.pricePerSec * m.durations[0])}/klip
                        </div>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Görsel modeli</Label>
                <select className={inputCls} value={cfg.imageModel} onChange={(e) => set("imageModel", e.target.value)}>
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} (~{money(m.price)}/görsel)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Seslendirme servisi</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Chip active={cfg.ttsProvider === "elevenlabs"} onClick={() => set("ttsProvider", "elevenlabs")}>
                    <div className="font-medium text-white/90">ElevenLabs</div>
                    <div className="text-xs text-muted">En doğal ses, kelime zamanlamalı altyazı</div>
                  </Chip>
                  <Chip active={cfg.ttsProvider === "openai"} onClick={() => set("ttsProvider", "openai")}>
                    <div className="font-medium text-white/90">OpenAI TTS</div>
                    <div className="text-xs text-muted">Çok ucuz, iyi kalite</div>
                  </Chip>
                </div>
              </div>
              {cfg.ttsProvider === "elevenlabs" ? (
                <>
                  <div>
                    <Label hint={voiceErr ? <span className="text-amber-300">{voiceErr}</span> : `${voices.length} ses`}>Ses</Label>
                    <VoicePicker
                      voices={voices}
                      value={cfg.voiceId}
                      onChange={(v) => setCfg((c) => ({ ...c, voiceId: v.id, voiceName: v.name }))}
                    />
                  </div>
                  <div>
                    <Label>Ses modeli</Label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {ELEVEN_MODELS.map((m) => (
                        <Chip key={m.id} active={cfg.ttsModel === m.id} onClick={() => set("ttsModel", m.id)}>
                          {m.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <Label>Ses</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {OPENAI_VOICES.map((v) => (
                      <Chip key={v} active={cfg.voiceId === v} onClick={() => setCfg((c) => ({ ...c, voiceId: v, voiceName: v }))}>
                        <span className="capitalize">{v}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Altyazı stili</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CAPTION_STYLES.map((c) => (
                    <Chip key={c.id} active={cfg.captionStyle === c.id} onClick={() => set("captionStyle", c.id)}>
                      <div className="font-medium text-white/90">{c.label}</div>
                      {c.desc && <div className="text-xs text-muted">{c.desc}</div>}
                    </Chip>
                  ))}
                </div>
                {cfg.captionStyle !== "none" && (
                  <div className="flex gap-2 mt-2">
                    <Chip active={cfg.captionPosition === "center"} onClick={() => set("captionPosition", "center")}>
                      Ortada
                    </Chip>
                    <Chip active={cfg.captionPosition === "bottom"} onClick={() => set("captionPosition", "bottom")}>
                      Altta
                    </Chip>
                  </div>
                )}
              </div>
              <div>
                <Label hint={music.dir ? `Müzik eklemek için: ${music.dir}` : undefined}>Arka plan müziği</Label>
                <select className={inputCls} value={cfg.music ?? ""} onChange={(e) => set("music", e.target.value || null)}>
                  <option value="">Müzik yok</option>
                  {music.files.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {cfg.music && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-muted w-20">Ses seviyesi</span>
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={cfg.musicVolume}
                      onChange={(e) => set("musicVolume", Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs tabular-nums w-10 text-right">{Math.round(cfg.musicVolume * 100)}%</span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Row k="Konu" v={cfg.topic || "AI seçecek"} />
                <Row k="Tür" v={GENRES.find((g) => g.id === cfg.genre)?.label} />
                <Row k="Dil" v={LANGUAGES.find((l) => l.id === cfg.language)?.label} />
                <Row k="Süre" v={`${cfg.durationSec} sn (~${cost.sceneCount} sahne)`} />
                <Row k="Format" v={cfg.aspect === "9:16" ? "Dikey 9:16" : "Yatay 16:9"} />
                <Row k="Stil" v={VISUAL_STYLES.find((s) => s.id === cfg.visualStyle)?.label} />
                <Row k="Video" v={cfg.videoMode === "image-to-video" ? VIDEO_MODELS.find((m) => m.id === cfg.videoModel)?.label : "Görsel + hareket"} />
                <Row k="Ses" v={`${cfg.ttsProvider === "elevenlabs" ? "ElevenLabs" : "OpenAI"} · ${cfg.voiceName ?? cfg.voiceId}`} />
                <Row k="Altyazı" v={CAPTION_STYLES.find((c) => c.id === cfg.captionStyle)?.label} />
                <Row k="Müzik" v={cfg.music ?? "Yok"} />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-line bg-panel-2 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.reviewScript}
                  onChange={(e) => set("reviewScript", e.target.checked)}
                  className="mt-0.5 size-4 accent-violet-500"
                />
                <div>
                  <div className="text-sm font-medium">Senaryoyu üretimden önce onaylamak istiyorum</div>
                  <div className="text-xs text-muted mt-0.5">
                    Senaryo yazılınca durur, sahneleri düzenleyebilirsin. Kapatırsan her şey tam otomatik ilerler.
                  </div>
                </div>
              </label>
              {err && <div className="text-sm text-red-300">{err}</div>}
            </>
          )}

          <div className="flex justify-between pt-2 border-t border-line">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Geri
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                İleri <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="primary" onClick={create} loading={busy} className="px-6">
                <Sparkles className="size-4" /> Videoyu Üret
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:sticky lg:top-8">
          <div className="text-sm font-medium mb-3">Tahmini maliyet</div>
          <div className="text-3xl font-semibold gradient-text tabular-nums">{money(cost.total)}</div>
          <div className="text-xs text-muted mb-4">video başına, yaklaşık</div>
          <div className="space-y-2 text-sm">
            <CostRow k="Senaryo" v={cost.llm} />
            <CostRow k="Seslendirme" v={cost.tts} />
            <CostRow k={`Görseller (${cost.sceneCount + 1})`} v={cost.images} />
            <CostRow k={`Video klipler (${cfg.videoMode === "image-to-video" ? cost.sceneCount : 0})`} v={cost.video} />
            <CostRow k="Montaj (FFmpeg)" v={0} />
          </div>
          <p className="text-[11px] text-muted/80 mt-4 leading-relaxed">
            Fiyatlar sağlayıcılara göre değişebilir. Gerçek harcamayı ilgili servislerin panellerinden kontrol et.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-2">
      <span className="text-muted">{k}</span>
      <span className="text-right line-clamp-1">{v}</span>
    </div>
  );
}

function CostRow({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="tabular-nums">{money(v)}</span>
    </div>
  );
}

function VoicePicker({ voices, value, onChange }: { voices: Voice[]; value: string; onChange: (v: Voice) => void }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);

  function preview(v: Voice) {
    audio.current?.pause();
    if (playing === v.id || !v.preview) {
      setPlaying(null);
      return;
    }
    audio.current = new Audio(v.preview);
    audio.current.onended = () => setPlaying(null);
    audio.current.play().catch(() => {});
    setPlaying(v.id);
  }

  if (!voices.length) return <div className="text-sm text-muted">Ses listesi yüklenemedi.</div>;
  const list = voices.filter((v) => (v.name + v.labels).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input className={`${inputCls} mb-2`} placeholder="Ses ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {list.map((v) => (
          <div
            key={v.id}
            onClick={() => onChange(v)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition ${
              value === v.id ? "border-accent/60 bg-accent/10" : "border-line bg-panel-2 hover:border-white/20"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                preview(v);
              }}
              className="grid place-items-center size-8 shrink-0 rounded-full bg-white/10 hover:bg-white/20"
            >
              {playing === v.id ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{v.name}</div>
              <div className="text-xs text-muted truncate">{v.labels}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
