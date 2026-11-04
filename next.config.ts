import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // hamkorlar Excel/Word fayl yuklaydi (Vercel so'rov chegarasi ~4,5 MB)
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
