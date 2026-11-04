import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // story rasmlari uchun shriftlar serverga birga olinadi
  outputFileTracingIncludes: {
    "/rasm/story/[promoterId]/[bookId]": ["./assets/fonts/*.ttf"],
    "/rasm/shablon/[promoterId]": ["./assets/fonts/*.ttf"],
  },
  experimental: {
    // hamkorlar Excel/Word fayl yuklaydi (Vercel so'rov chegarasi ~4,5 MB)
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
