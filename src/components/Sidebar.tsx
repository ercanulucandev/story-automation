"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, LayoutGrid, Plus, Settings } from "lucide-react";

const NAV = [
  { href: "/", label: "Projeler", icon: LayoutGrid },
  { href: "/new", label: "Yeni Video", icon: Plus },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 h-screen w-16 md:w-60 shrink-0 border-r border-line bg-panel/70 backdrop-blur flex flex-col">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-line">
        <div className="btn-primary grid place-items-center size-9 rounded-xl">
          <Clapperboard className="size-5 text-white" />
        </div>
        <div className="hidden md:block leading-tight">
          <div className="font-semibold">Story</div>
          <div className="text-xs text-muted -mt-0.5">Automation</div>
        </div>
      </div>
      <nav className="p-2 md:p-3 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" || path.startsWith("/projects") : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active ? "bg-accent/15 text-white ring-1 ring-accent/30" : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 hidden md:block text-[11px] text-muted/70">
        AI destekli video stüdyosu
      </div>
    </aside>
  );
}
