import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-surface-raised border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <Image
                src="/meridixlabs-logo-primary.svg"
                alt="Meridix Labs"
                width={200}
                height={38}
              />
            </Link>
            <p className="text-sm text-ink-secondary leading-relaxed max-w-xs">
              Your health, clearly explained. We believe everyone deserves to understand their own medical data — simply, accurately, and without the jargon.
            </p>
            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-tertiary bg-white px-3 py-1.5 rounded-full border border-surface-border">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                Powered by Claude AI
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Analyze Results",  href: "/app"           },
                { label: "How It Works",     href: "/#how-it-works" },
                { label: "Features",         href: "/#features"     },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-ink-secondary hover:text-brand-blue transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2.5">
              {[
                { label: "About",            href: "/about"                   },
                { label: "meridixlabs.com",  href: "https://meridixlabs.com" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-ink-secondary hover:text-brand-blue transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-tertiary">
            &copy; {new Date().getFullYear()} Meridix Labs. All rights reserved.
          </p>
          <p className="text-xs text-ink-tertiary text-center md:text-right max-w-md">
            Meridix Labs is an educational tool. This is not medical advice. Always consult a qualified physician.
          </p>
        </div>
      </div>
    </footer>
  );
}
