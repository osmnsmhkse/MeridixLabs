import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ScrollReveal from "@/components/ScrollReveal";
import MotionEffects from "@/components/MotionEffects";
import SmoothScroll from "@/components/SmoothScroll";
import FeedbackWidget from "@/components/FeedbackWidget";
import LandingChatWidget from "@/components/LandingChatWidget";
import { FloatingDock, FloatingDockProvider } from "@/components/FloatingDock";
import { ToolChatProvider } from "@/components/ToolChatProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { headers } from "next/headers";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: {
    default: "Meridix Labs — AI-Powered Medical Lab Analysis",
    template: "%s · Meridix Labs",
  },
  applicationName: "Meridix Labs",
  description:
    "Meridix Labs helps you understand your blood test results using AI. Analyze, track, and get insights from your lab results instantly.",
  keywords: ["Meridix Labs", "meridixlabs", "medical AI", "lab results", "blood test analysis", "AI doctor", "blood test AI"],
  authors: [{ name: "Meridix Labs", url: "https://www.meridixlabs.com" }],
  creator: "Meridix Labs",
  publisher: "Meridix Labs",
  metadataBase: new URL("https://www.meridixlabs.com"),
  alternates: {
    canonical: "/",
  },
  verification: {
    // Paste the token from Google Search Console → Settings → Ownership
    // verification → "HTML tag" into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/meridix-favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Meridix Labs — AI-Powered Medical Lab Analysis",
    description: "Understand your lab results with AI. Fast, accurate, and easy.",
    url: "https://www.meridixlabs.com",
    siteName: "Meridix Labs",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridix Labs — AI-Powered Medical Lab Analysis",
    description: "Understand your lab results with AI. Fast, accurate, and easy.",
    site: "@meridixlabs",
  },
};

// viewport-fit=cover lets the page use the full display instead of being
// letterboxed inside the safe area. It only works paired with the
// env(safe-area-inset-*) padding on every pinned surface (globals.css) —
// on its own it would slide content under the Island and home indicator.
/** Locales written right-to-left. Only Arabic today; Hebrew/Farsi would join here. */
const RTL_LOCALES = new Set(["ar"]);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  // Per-request CSP nonce set by middleware (src/middleware.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Arabic is one of the nine supported locales but `dir` was never set, so it
  // rendered inside an LTR document: the browser reordered each Arabic run but
  // every layout, alignment and mirrored affordance stayed left-to-right.
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <StructuredData nonce={nonce} />
        <script nonce={nonce} dangerouslySetInnerHTML={{__html: `
          try {
            var t = localStorage.getItem('meridix-theme');
            var p = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'dark' || (!t && p)) document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-surface text-ink">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <ScrollReveal />
            <SmoothScroll />
            <MotionEffects />
            <Navigation />
            <ToolChatProvider>
              <main className="pt-[calc(4rem+var(--safe-top))]">{children}</main>
              <Footer />
            </ToolChatProvider>
            <FloatingDockProvider>
              <FloatingDock />
              <FeedbackWidget />
              <LandingChatWidget />
            </FloatingDockProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
