import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Meridix Labs — Your health, clearly explained.",
  description:
    "Upload your medical lab results and receive a clear, AI-powered interpretation at three levels — from plain language to clinical detail. Meridix Labs: Your health, clearly explained.",
  keywords: ["lab results", "medical AI", "health interpretation", "blood test", "AI health"],
  authors: [{ name: "Meridix Labs" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Meridix Labs — Your health, clearly explained.",
    description:
      "AI-powered interpretation of your medical lab results in plain language, with clinical depth when you need it.",
    url: "https://meridixlabs.com",
    siteName: "Meridix Labs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridix Labs",
    description: "Your health, clearly explained.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-white text-ink">
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
