import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ScrollReveal from "@/components/ScrollReveal";
import FeedbackWidget from "@/components/FeedbackWidget";
import { ToolChatProvider } from "@/components/ToolChatProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Meridix Labs — AI-Powered Medical Lab Analysis",
  description:
    "Meridix Labs helps you understand your blood test results using AI. Analyze, track, and get insights from your lab results instantly.",
  keywords: ["medical AI", "lab results", "blood test analysis", "Meridix Labs", "AI doctor", "blood test AI"],
  authors: [{ name: "Meridix Labs", url: "https://www.meridixlabs.com" }],
  metadataBase: new URL("https://www.meridixlabs.com"),
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          try {
            var t = localStorage.getItem('meridix-theme');
            var p = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'dark' || (!t && p)) document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-surface text-ink">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <ScrollReveal />
            <Navigation />
            <ToolChatProvider>
              <main className="pt-16">{children}</main>
              <Footer />
            </ToolChatProvider>
            <FeedbackWidget />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
