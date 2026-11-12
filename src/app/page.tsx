"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard, Film, Plus, Sparkles, Wallet } from "lucide-react";
import { Button, Card, media, money, StatusBadge, STEP_LABELS } from "@/components/ui";
import { GENRES } from "@/lib/catalog";
import type { Project } from "@/lib/types";
import { STEP_ORDER } from "@/lib/types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => alive && setProjects(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const done = projects?.filter((p) => p.status === "done").length ?? 0;
  const spent = projects?.reduce((s, p) => s + p.cost, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hikayeni anlat, <span className="gradient-text">videon hazır olsun.</span>
          </h1>
          <p className="text-muted mt-1.5">Senaryo, ses, görsel, video ve montaj. Hepsi tek akışta.</p>
        </div>
        <Link href="/new">
          <Button variant="primary" className="px-5 py-2.5">
            <Plus className="size-4" /> Yeni Video
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={Clapperboard} label="Toplam proje" value={projects?.length ?? "–"} />
        <Stat icon={Film} label="Tamamlanan video" value={projects ? done : "–"} />
        <Stat icon={Wallet} label="Tahmini harcama" value={projects ? money(spent) : "–"} />
      </div>

      {projects === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-72 rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="btn-primary mx-auto grid place-items-center size-14 rounded-2xl mb-4">
            <Sparkles className="size-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold">İlk videonu oluştur</h2>
          <p className="text-muted mt-1 mb-6">Bir tür, dil ve stil seç. Gerisini Story Automation halleder.</p>
          <Link href="/new">
            <Button variant="primary">
              <Plus className="size-4" /> Başla
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Film; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="grid place-items-center size-11 rounded-xl bg-accent/15 text-violet-300">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </Card>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const genre = GENRES.find((g) => g.id === p.config.genre);
  const steps = STEP_ORDER.filter((s) => p.steps[s].status !== "skipped");
  const doneSteps = steps.filter((s) => p.steps[s].status === "done").length;
  const cover = p.thumbnail ?? p.scenes.find((s) => s.image)?.image?.file;
  const vertical = p.config.aspect === "9:16";

  return (
    <Link href={`/projects/${p.id}`} className="group">
      <Card className="overflow-hidden transition group-hover:border-accent/40 group-hover:-translate-y-0.5">
        <div className="relative aspect-video bg-panel-2 overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media(p.id, cover)} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="size-full grid place-items-center text-5xl">{genre?.emoji ?? "🎬"}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute top-3 left-3">
            <StatusBadge status={p.status} />
          </div>
          <div className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium">
            {vertical ? "9:16 Shorts" : "16:9"}
          </div>
        </div>
        <div className="p-4">
          <div className="font-medium line-clamp-1">{p.meta?.title ?? p.config.topic ?? "Başlıksız"}</div>
          <div className="text-xs text-muted mt-1 flex items-center gap-2">
            <span>{genre?.label ?? p.config.genre}</span>·<span>{p.config.durationSec} sn</span>·<span>{money(p.cost)}</span>
          </div>
          <div className="mt-3 flex gap-1">
            {steps.map((s) => (
              <div
                key={s}
                title={STEP_LABELS[s]}
                className={`h-1.5 flex-1 rounded-full ${
                  p.steps[s].status === "done"
                    ? "bg-emerald-400/80"
                    : p.steps[s].status === "running"
                      ? "bg-blue-400 animate-pulse"
                      : p.steps[s].status === "error"
                        ? "bg-red-400"
                        : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <div className="text-[11px] text-muted mt-1.5">
            {doneSteps}/{steps.length} adım
          </div>
        </div>
      </Card>
    </Link>
  );
}
