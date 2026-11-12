"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ProjectStatus, StepStatus } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel/80 backdrop-blur ${className}`}>{children}</div>;
}

type Variant = "primary" | "ghost" | "outline" | "danger";
export function Button({
  variant = "outline",
  loading,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "btn-primary text-white hover:brightness-110",
    outline: "border border-line bg-panel-2 hover:bg-white/5 text-white",
    ghost: "hover:bg-white/5 text-muted hover:text-white",
    danger: "border border-red-500/30 text-red-300 hover:bg-red-500/10",
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-sm border transition text-left ${
        active
          ? "border-accent/60 bg-accent/15 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
          : "border-line bg-panel-2 text-muted hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-white/90">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-white placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition";

const STATUS: Record<ProjectStatus, { label: string; cls: string }> = {
  draft: { label: "Taslak", cls: "bg-white/10 text-white/70" },
  running: { label: "Üretiliyor", cls: "bg-blue-500/15 text-blue-300" },
  review: { label: "Onay bekliyor", cls: "bg-amber-500/15 text-amber-300" },
  done: { label: "Hazır", cls: "bg-emerald-500/15 text-emerald-300" },
  error: { label: "Hata", cls: "bg-red-500/15 text-red-300" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {status === "running" && <Loader2 className="size-3 animate-spin" />}
      {s.label}
    </span>
  );
}

export const STEP_LABELS = {
  script: "Senaryo",
  voice: "Seslendirme",
  images: "Görseller",
  clips: "Video klipler",
  render: "Montaj",
} as const;

export function stepDot(status: StepStatus) {
  return {
    pending: "bg-white/10 text-muted",
    running: "bg-blue-500/20 text-blue-300 ring-2 ring-blue-400/40",
    done: "bg-emerald-500/20 text-emerald-300",
    error: "bg-red-500/20 text-red-300",
    skipped: "bg-white/5 text-muted/50",
  }[status];
}

export function media(projectId: string, file: string) {
  return `/api/media/projects/${projectId}/${file}`;
}

export function money(n: number) {
  return `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`;
}
