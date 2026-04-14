import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Meridix Labs — AI-Powered Medical Lab Analysis",
  description: "Meridix Labs helps you understand your blood test results using AI. Analyze, track, and get insights from your lab results instantly.",
  keywords: ["medical AI", "lab results", "blood test analysis", "Meridix Labs"],
  openGraph: {
    title: "Meridix Labs — AI-Powered Medical Lab Analysis",
    description: "Understand your lab results with AI. Fast, accurate, and easy.",
    url: "https://www.meridixlabs.com",
    siteName: "Meridix Labs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <Providers>
          <ScrollReveal />
          <Navigation />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
