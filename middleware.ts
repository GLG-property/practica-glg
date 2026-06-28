import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "glg_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/cron",
  "/api/webhooks",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons",
  "/offline",
];

function isPublic(pathname: string): boolean {
  // Potrivire pe segment exact (evităm ca „/login-foo" sau „/api/cron-x" să fie publice).
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function readSession(req: NextRequest): Promise<{ role: string } | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return { role: String(payload.role) };
  } catch {
    return null;
  }
}

// Prefix de rută permis per rol.
const ROLE_PREFIX: Record<string, string> = {
  admin: "/admin",
  operator: "/operator",
  instructor: "/instructor",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = await readSession(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const home = ROLE_PREFIX[session.role] ?? "/login";

  // Rădăcina → home-ul rolului.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  // Fiecare rol intră doar în zona lui.
  for (const [role, prefix] of Object.entries(ROLE_PREFIX)) {
    if (pathname.startsWith(prefix) && session.role !== role) {
      const url = req.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
