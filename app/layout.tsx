import type { Metadata, Viewport } from "next";
import { Titillium_Web, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientBoot from "@/components/ClientBoot";
import CursorFollower from "@/components/CursorFollower";
import { SITE } from "@/lib/siteConfig";

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-titillium",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Formula Code — ${SITE.name} · ${SITE.role}`,
  description:
    "A scroll-driven, 3D-interactive portfolio. Explore the anatomy of a stylized single-seater, build your own setup, and see how fast it laps.",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0D",
};

/**
 * Runs before first paint: restores the persisted theme / motion preference
 * onto <html data-*> so CSS is correct before React hydrates (no flash).
 */
const bootScript = `(function(){try{
var t=localStorage.getItem('fc-theme');
if(t==='pit-lane'||t==='race-night'){document.documentElement.dataset.theme=t;}
var m=localStorage.getItem('fc-motion');
if(m==='reduce'||(m!=='full'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){document.documentElement.dataset.motion='reduce';}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="race-night"
      suppressHydrationWarning
      className={`${titillium.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <a href="#main" className="skipLink">
          Skip to content
        </a>
        <ClientBoot />
        <CursorFollower />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
