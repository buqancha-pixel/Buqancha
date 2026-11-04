import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { ALLOW_INDEXING, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    // Namunaviy narxlar bilan sayt hali indekslanmasin
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/qidiruv", "/api/", "/admin", "/hamkor/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
