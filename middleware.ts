import { NextResponse, type NextRequest } from "next/server";

// Middleware rulează pe runtime-ul Edge. Pentru a fi 100% compatibil și a nu crăpa,
// verificăm JWT-ul HS256 cu Web Crypto nativ (fără dependențe), iar totul e în try/catch.

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
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Decodează base64url -> bytes (atob există pe Edge). */
function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Verifică un JWT HS256 (semnat de `jose` pe server) folosind Web Crypto. */
async function verifyJwt(token: string, secret: string): Promise<{ role?: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  // Verificăm algoritmul din antet.
  let header: { alg?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(h)));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(s) as unknown as BufferSource,
    new TextEncoder().encode(`${h}.${p}`) as unknown as BufferSource
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

async function readSession(req: NextRequest): Promise<{ role: string } | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const payload = await verifyJwt(token, secret);
    if (!payload?.role) return null;
    return { role: String(payload.role) };
  } catch {
    return null;
  }
}

const ROLE_PREFIX: Record<string, string> = {
  admin: "/admin",
  operator: "/operator",
  instructor: "/instructor",
  theory: "/theory",
  examiner: "/examiner",
};

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    if (isPublic(pathname)) return NextResponse.next();

    const session = await readSession(req);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const home = ROLE_PREFIX[session.role] ?? "/login";

    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    for (const [role, prefix] of Object.entries(ROLE_PREFIX)) {
      if (pathname.startsWith(prefix) && session.role !== role) {
        const url = req.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch {
    // Niciodată nu lăsăm edge-ul să crape — degradăm grațios.
    // Paginile/Server Actions verifică oricum sesiunea pe server.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
