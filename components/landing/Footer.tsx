import Link from "next/link";

const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Motivation", href: "#motivation" },
  { label: "Login", href: "/login" },
  { label: "Sign Up", href: "#" },
];

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-border-custom">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Brand line */}
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-text-secondary">
            <span className="text-accent-cyan">MedVision AI</span>
            <span className="mx-3 text-accent-cyan/50">·</span>
            © {new Date().getFullYear()}
            <span className="mx-3 text-accent-cyan/50">·</span>
            Built for radiology students everywhere
          </p>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-text-secondary hover:text-accent-cyan transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-text-secondary hover:text-accent-cyan transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
