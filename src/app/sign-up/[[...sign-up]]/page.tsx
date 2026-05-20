import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up · Meridix Labs",
  description: "Create your Meridix Labs account — save lab reports, track your biomarkers over time.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Save your reports, track biomarkers over time, and skip the repeat questions.
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/profile?welcome=1"
        />
        <p className="mt-6 text-center text-xs text-ink-tertiary">
          Free to use · No card required · You can still use every tool without an account.
        </p>
      </div>
    </div>
  );
}
