/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fixăm rădăcina pentru tracing (există un alt lockfile în home, care deruta Next).
  outputFileTracingRoot: process.cwd(),
  // Permitem imagini din Supabase Storage (poze cursanți/șoferi, screenshot-uri).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Antete de securitate de bază.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
