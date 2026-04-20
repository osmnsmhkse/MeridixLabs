import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in · Meridix Labs",
  description: "Sign in to your Meridix Labs account.",
};

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Sign in to see your lab history and health timeline.
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
        <p className="mt-6 text-center text-xs text-ink-tertiary">
          You can keep using Meridix Labs without an account — signing in just
          saves your reports and personalizes the experience.
        </p>
      </div>
    </div>
  );
}
