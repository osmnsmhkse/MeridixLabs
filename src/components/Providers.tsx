"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AnalyticsTracker from "@/components/AnalyticsTracker";

export default function Providers({ children }: { children: React.ReactNode }) {
  // If Clerk isn't configured (local dev without keys), skip the provider
  // so the rest of the site keeps working for anonymous users.
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const tree = (
    <ThemeProvider>
      <LanguageProvider>
        <AnalyticsTracker />
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );

  if (!clerkEnabled) return tree;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2F6BFF", // brand-blue
          borderRadius: "0.75rem",
        },
      }}
    >
      {tree}
    </ClerkProvider>
  );
}
