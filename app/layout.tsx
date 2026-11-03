import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Literata, Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StarField } from "@/components/StarField";
import type { Theme } from "@/components/ThemeToggle";
import { ALLOW_INDEXING, SITE_NAME, SITE_URL } from "@/lib/site";

const manrope = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-manrope", display: "swap" });
const literata = Literata({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-literata", display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-unbounded", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Buqancha — kitob narxlarini solishtirish",
    template: "%s | Buqancha",
  },
  description:
    "O'zbekistondagi kitob do'konlari, nashriyotlar va marketpleyslarda kitob narxlarini solishtiring va eng arzonini toping.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "uz_UZ", type: "website" },
  robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
};

export async function generateViewport(): Promise<Viewport> {
  const store = await cookies();
  const sodda = store.get("theme")?.value === "sodda";
  return { width: "device-width", initialScale: 1, themeColor: sodda ? "#ffffff" : "#060816" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme: Theme = store.get("theme")?.value === "sodda" ? "sodda" : "koinot";

  return (
    <html
      lang="uz"
      data-theme={theme}
      className={`${manrope.variable} ${literata.variable} ${unbounded.variable}`}
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <StarField />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
          Asosiy qismga o'tish
        </a>
        <Header theme={theme} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
