import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Uygulama yerel bir araçtır: API sadece bu bilgisayardan ve uygulamanın kendi sayfalarından kullanılabilir.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostname(host: string | null) {
  if (!host) return "";
  if (host.startsWith("[")) return host.slice(0, host.indexOf("]") + 1).toLowerCase();
  return host.split(":")[0].toLowerCase();
}

function deny(msg: string) {
  return NextResponse.json({ error: msg }, { status: 403 });
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host");

  // 1) Ağdaki başka cihazlardan veya DNS rebinding ile gelen istekleri reddet
  if (!LOCAL_HOSTS.has(hostname(host))) return deny("Bu API sadece yerel bilgisayardan kullanılabilir.");

  // 2) Başka web sitelerinin tarayıcı üzerinden istek atmasını (CSRF) engelle
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return deny("Başka sitelerden gelen istekler engellendi.");

  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host.toLowerCase();
      } catch {}
      if (originHost !== host?.toLowerCase()) return deny("Geçersiz istek kaynağı.");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
