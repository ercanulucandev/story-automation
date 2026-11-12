"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Trash2,
  Video,
} from "lucide-react";
import { Button, Card, inputCls, media, money, StatusBadge, stepDot, STEP_LABELS } from "@/components/ui";
import { GENRES, LANGUAGES } from "@/lib/catalog";
import type { Project, Scene, StepId } from "@/lib/types";
import { STEP_ORDER } from "@/lib/types";

type P = Project & { running: boolean };

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<P | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`);
    if (r.status === 404) return setNotFound(true);
    setP(await r.json());
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  async function run(body: { approve?: boolean; from?: StepId } = {}) {
    setBusy(true);
    const r = await fetch(`/api/projects/${id}/run`, { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) flash((await r.json()).error ?? "Başlatılamadı");
    await load();
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Bu proje ve tüm dosyaları silinsin mi?")) return;
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/");
    else flash((await r.json()).error);
  }

  if (notFound)
    return (
      <div className="text-center py-24">
        <p className="text-muted mb-4">Proje bulunamadı.</p>
        <Link href="/" className="text-violet-300">
          Projelere dön
        </Link>
      </div>
    );
  if (!p) return <div className="shimmer h-96 rounded-2xl max-w-7xl mx-auto" />;

  const locked = p.running || p.status === "running";
  const steps = STEP_ORDER.filter((s) => p.steps[s].status !== "skipped");
  const genre = GENRES.find((g) => g.id === p.config.genre);
  const lang = LANGUAGES.find((l) => l.id === p.config.language);
  const vertical = p.config.aspect === "9:16";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white mb-4">
        <ArrowLeft className="size-4" /> Projeler
      </Link>

      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{p.meta?.title ?? (p.config.topic || "Yeni hikaye")}</h1>
            <StatusBadge status={p.status} />
          </div>
          <div className="text-sm text-muted mt-1.5 flex flex-wrap gap-x-2">
            <span>
              {genre?.emoji} {genre?.label}
            </span>
            ·<span>{lang?.label}</span>·<span>{p.config.aspect}</span>·<span>{p.config.durationSec} sn</span>·
            <span>{p.scenes.length || "?"} sahne</span>·<span>Harcama ~{money(p.cost)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === "review" && (
            <Button variant="primary" loading={busy} onClick={() => run({ approve: true })}>
              <Check className="size-4" /> Onayla ve devam et
            </Button>
          )}
          {p.status === "error" && (
            <Button variant="primary" loading={busy} onClick={() => run()}>
              <RefreshCw className="size-4" /> Kaldığı yerden devam et
            </Button>
          )}
          {p.status === "draft" && (
            <Button variant="primary" loading={busy} onClick={() => run()}>
              <Play className="size-4" /> Başlat
            </Button>
          )}
          {p.status === "done" && (
            <Button loading={busy} onClick={() => run({ from: "render" })} title="Sahne değişikliklerinden sonra videoyu tekrar birleştirir">
              <RefreshCw className="size-4" /> Yeniden montajla
            </Button>
          )}
          <RestartMenu disabled={locked} onPick={(s) => run({ from: s })} hasClips={p.config.videoMode === "image-to-video"} />
          <Button variant="danger" onClick={remove} disabled={locked} title="Sil">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Pipeline */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => {
            const st = p.steps[s];
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${stepDot(st.status)}`}>
                  {st.status === "running" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : st.status === "done" ? (
                    <Check className="size-4" />
                  ) : st.status === "error" ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <span className="size-4 grid place-items-center text-xs">{i + 1}</span>
                  )}
                  {STEP_LABELS[s]}
                </div>
                {i < steps.length - 1 && <div className="w-6 h-px bg-line" />}
              </div>
            );
          })}
        </div>
        {steps.map((s) =>
          p.steps[s].status === "error" ? (
            <div key={s} className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 whitespace-pre-wrap break-words">
              <b>{STEP_LABELS[s]}:</b> {p.steps[s].error}
            </div>
          ) : null,
        )}
        {p.status === "review" && (
          <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200">
            Senaryo hazır. Aşağıdan sahne metinlerini ve görsel promptlarını düzenleyebilirsin. Hazır olunca{" "}
            <b>Onayla ve devam et</b>&apos;e bas.
          </div>
        )}
      </Card>

      <div className={`grid gap-6 items-start ${vertical ? "lg:grid-cols-[380px_1fr]" : "lg:grid-cols-[1fr_1fr]"}`}>
        {/* Sol: video + metadata */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <Card className="overflow-hidden">
            <div className={`bg-black ${vertical ? "aspect-[9/16]" : "aspect-video"} grid place-items-center`}>
              {p.output ? (
                <video key={p.output.video} src={media(p.id, p.output.video)} controls className="size-full" poster={p.thumbnail ? media(p.id, p.thumbnail) : undefined} />
              ) : p.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media(p.id, p.thumbnail)} alt="" className="size-full object-cover opacity-60" />
              ) : (
                <div className="text-center text-muted text-sm p-6">
                  {locked ? <Loader2 className="size-6 animate-spin mx-auto mb-2" /> : <Video className="size-6 mx-auto mb-2" />}
                  {locked ? "Video üretiliyor…" : "Video henüz hazır değil"}
                </div>
              )}
            </div>
            {p.output && (
              <div className="p-3 flex gap-2">
                <a href={`${media(p.id, p.output.video)}?download`} className="flex-1">
                  <Button variant="primary" className="w-full">
                    <Download className="size-4" /> Videoyu indir
                  </Button>
                </a>
                {p.thumbnail && (
                  <a href={`${media(p.id, p.thumbnail)}?download`}>
                    <Button title="Thumbnail indir">
                      <ImageIcon className="size-4" />
                    </Button>
                  </a>
                )}
              </div>
            )}
          </Card>

          {p.meta && <MetaCard p={p} onCopy={() => flash("Kopyalandı")} />}
          <Logs p={p} />
        </div>

        {/* Sağ: storyboard */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Storyboard</h2>
            <span className="text-xs text-muted">{locked ? "Üretim sürerken düzenleme kapalı" : "Metne tıklayıp düzenleyebilirsin"}</span>
          </div>
          {p.scenes.length === 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-4 ${vertical ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"}`}>
              {p.scenes.map((s) => (
                <SceneCard key={s.id} p={p} s={s} locked={locked} onChanged={load} flash={flash} />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl bg-panel-2 border border-line px-4 py-3 text-sm shadow-2xl">{toast}</div>
      )}
    </div>
  );
}

function RestartMenu({ disabled, onPick, hasClips }: { disabled: boolean; onPick: (s: StepId) => void; hasClips: boolean }) {
  const [open, setOpen] = useState(false);
  const opts: { s: StepId; label: string }[] = [
    { s: "script", label: "Her şeyi baştan (yeni senaryo)" },
    { s: "voice", label: "Seslendirmeden itibaren" },
    { s: "images", label: "Görsellerden itibaren" },
    ...(hasClips ? [{ s: "clips" as StepId, label: "Video kliplerden itibaren" }] : []),
    { s: "render", label: "Sadece montaj" },
  ];
  return (
    <div className="relative">
      <Button onClick={() => setOpen((o) => !o)} disabled={disabled}>
        <RotateCcw className="size-4" /> Yeniden üret <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-panel-2 p-1 shadow-2xl z-20">
          {opts.map((o) => (
            <button
              key={o.s}
              onClick={() => {
                setOpen(false);
                if (o.s === "render" || confirm(`${o.label}: bu adım ve sonrasındaki çıktılar yeniden üretilecek (ücretli olabilir). Devam?`)) onPick(o.s);
              }}
              className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaCard({ p, onCopy }: { p: P; onCopy: () => void }) {
  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    onCopy();
  };
  const m = p.meta!;
  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-semibold">YouTube bilgileri</div>
      <Field label="Başlık" value={m.title} onCopy={copy} />
      <Field label="Açıklama" value={m.description} onCopy={copy} multiline />
      <Field label="Etiketler" value={m.tags.join(", ")} onCopy={copy} />
    </Card>
  );
}

function Field({ label, value, onCopy, multiline }: { label: string; value: string; onCopy: (t: string) => void; multiline?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{label}</span>
        <button onClick={() => onCopy(value)} className="text-muted hover:text-white" title="Kopyala">
          <Copy className="size-3.5" />
        </button>
      </div>
      <div className={`text-sm rounded-lg bg-panel-2 border border-line px-3 py-2 ${multiline ? "whitespace-pre-wrap" : "line-clamp-2"}`}>{value}</div>
    </div>
  );
}

function Logs({ p }: { p: P }) {
  const [open, setOpen] = useState(false);
  const logs = [...p.logs].reverse();
  return (
    <Card className="p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          <ScrollText className="size-4" /> İşlem kaydı
        </span>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {!open && logs[0] && <div className="text-xs text-muted mt-2 line-clamp-1">{logs[0].msg}</div>}
      {open && (
        <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 font-mono text-[11px]">
          {logs.map((l, i) => (
            <div key={i} className={l.level === "error" ? "text-red-300" : l.level === "warn" ? "text-amber-300" : "text-muted"}>
              <span className="opacity-60">{new Date(l.t).toLocaleTimeString("tr-TR")}</span> {l.msg}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SceneCard({ p, s, locked, onChanged, flash }: { p: P; s: Scene; locked: boolean; onChanged: () => void; flash: (m: string) => void }) {
  const [narration, setNarration] = useState(s.narration);
  const [visual, setVisual] = useState(s.visualPrompt);
  const [motion, setMotion] = useState(s.motionPrompt);
  const [showPrompt, setShowPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const vertical = p.config.aspect === "9:16";
  const dirty = narration !== s.narration || visual !== s.visualPrompt || motion !== s.motionPrompt;

  useEffect(() => {
    if (!dirty) {
      setNarration(s.narration);
      setVisual(s.visualPrompt);
      setMotion(s.motionPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.narration, s.visualPrompt, s.motionPrompt]);

  async function save() {
    setSaving(true);
    const r = await fetch(`/api/projects/${p.id}/scenes/${s.id}`, {
      method: "PATCH",
      body: JSON.stringify({ narration, visualPrompt: visual, motionPrompt: motion }),
    });
    if (!r.ok) flash((await r.json()).error);
    else flash("Sahne kaydedildi");
    await onChanged();
    setSaving(false);
  }

  async function regen(what: "audio" | "image" | "clip") {
    const names = { audio: "sesi", image: "görseli (ve klibi)", clip: "video klibi" };
    if (!confirm(`Sahne ${s.index + 1} için ${names[what]} yeniden üretilsin mi? Bu işlem ücretli olabilir.`)) return;
    if (dirty) await save();
    const r = await fetch(`/api/projects/${p.id}/scenes/${s.id}`, { method: "POST", body: JSON.stringify({ what }) });
    if (!r.ok) flash((await r.json()).error);
    else flash("Yeniden üretiliyor…");
    onChanged();
  }

  const generating = locked && (!s.image || (p.config.videoMode === "image-to-video" && !s.clip));

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className={`relative bg-panel-2 ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
        {s.clip ? (
          <video
            src={media(p.id, s.clip.file)}
            poster={s.image ? media(p.id, s.image.file) : undefined}
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => e.currentTarget.pause()}
            className="size-full object-cover"
          />
        ) : s.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media(p.id, s.image.file)} alt="" className="size-full object-cover" />
        ) : (
          <div className={`size-full ${generating ? "shimmer" : ""} grid place-items-center text-muted`}>
            {!generating && <ImageIcon className="size-6 opacity-40" />}
          </div>
        )}
        <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium">Sahne {s.index + 1}</div>
        {s.clip && <div className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px]">🎬 {s.clip.duration.toFixed(1)}s</div>}
        {generating && s.image && !s.clip && (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-xs flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Video klip üretiliyor
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <textarea
          className={`${inputCls} text-[13px] leading-relaxed min-h-24 resize-y`}
          value={narration}
          disabled={locked}
          onChange={(e) => setNarration(e.target.value)}
        />
        {s.audio && (
          <audio key={s.audio.file} src={media(p.id, s.audio.file)} controls className="w-full h-8" />
        )}
        <button onClick={() => setShowPrompt((v) => !v)} className="text-xs text-muted hover:text-white text-left flex items-center gap-1">
          <ChevronDown className={`size-3 transition ${showPrompt ? "rotate-180" : ""}`} /> Görsel / hareket promptu
        </button>
        {showPrompt && (
          <div className="space-y-2">
            <textarea className={`${inputCls} text-xs min-h-20`} value={visual} disabled={locked} onChange={(e) => setVisual(e.target.value)} />
            <textarea className={`${inputCls} text-xs min-h-12`} value={motion} disabled={locked} onChange={(e) => setMotion(e.target.value)} />
          </div>
        )}
        {s.error && <div className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2 break-words">{s.error}</div>}

        <div className="mt-auto pt-1 flex flex-wrap gap-1.5">
          {dirty && (
            <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={save} loading={saving} disabled={locked}>
              Kaydet
            </Button>
          )}
          <Button variant="ghost" className="px-2.5 py-1.5 text-xs" disabled={locked} onClick={() => regen("audio")} title="Sesi yeniden üret">
            <Mic className="size-3.5" /> Ses
          </Button>
          <Button variant="ghost" className="px-2.5 py-1.5 text-xs" disabled={locked} onClick={() => regen("image")} title="Görseli yeniden üret">
            <ImageIcon className="size-3.5" /> Görsel
          </Button>
          {p.config.videoMode === "image-to-video" && (
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs" disabled={locked || !s.image} onClick={() => regen("clip")} title="Klibi yeniden üret">
              <Video className="size-3.5" /> Klip
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
