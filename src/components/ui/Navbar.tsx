"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";

interface NavUser {
  email: string;
  fullName: string | null;
  role: string | null;
}

interface NavbarProps {
  locale: string;
  user: NavUser | null;
}

export function Navbar({ locale, user }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname.includes(path);
  const localePath = pathname.replace(/^\/(cs|sk)/, "");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email.slice(0, 2).toUpperCase() ?? "?");

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center relative z-50"
          >
            {/* Mobile: jen vlajková ikonka (ořez na 36×36) */}
            <span
              className="flex md:hidden overflow-hidden"
              style={{ width: 36, height: 36 }}
            >
              <Image
                src="/images/norsko-prace-logo.svg"
                alt="NorskoPráce"
                width={184}
                height={36}
                style={{ maxWidth: "none" }}
                priority
              />
            </span>
            {/* Desktop: plné logo */}
            <Image
              src="/images/norsko-prace-logo.svg"
              alt="NorskoPráce"
              width={184}
              height={36}
              className="hidden md:block"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/prace"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive("/prace")
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {t("jobs")}
            </Link>
            <Link
              href="/pruvodce"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive("/pruvodce")
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {t("guides")}
            </Link>
            <Link
              href="/blog"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive("/blog")
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {t("blog")}
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Locale switcher */}
            <div className="hidden md:flex items-center rounded-full border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
              <a
                href={`/cs${localePath}`}
                className={`px-3 py-1.5 transition-colors ${
                  locale === "cs"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                }`}
              >
                CZ
              </a>
              <a
                href={`/sk${localePath}`}
                className={`px-3 py-1.5 transition-colors ${
                  locale === "sk"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                }`}
              >
                SK
              </a>
            </div>

            {/* Auth — desktop */}
            {user ? (
              <div className="relative hidden md:block " ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold transition hover:opacity-90"
                >
                  {initials}
                </button>
                {dropdownOpen && (
                  <div className="absolute overflow-hidden right-0 top-11 w-48 rounded-2xl bg-white shadow-lg border border-[var(--color-border)] py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
                      <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                        {user.fullName ?? user.email}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/oblibene"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                    >
                      ♥ {locale === "cs" ? "Oblíbené" : "Obľúbené"}
                    </Link>
                    <Link
                      href="/profil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                    >
                      ⚙ {locale === "cs" ? "Profil" : "Profil"}
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
                      >
                        🛠 Admin
                      </Link>
                    )}
                    <div className="border-t border-[var(--color-border)] mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        → {locale === "cs" ? "Odhlásit se" : "Odhlásiť sa"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary-dark)] hover:shadow-lg"
              >
                {locale === "cs" ? "Přihlásit se" : "Prihlásiť sa"}
              </Link>
            )}

            {/* Hamburger / close — mobile only */}
            <button
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-border)] relative z-50"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Zavřít menu" : "Otevřít menu"}
            >
              <span className="relative flex items-center justify-center w-4 h-4">
                <span
                  className="absolute block h-[2px] w-4 rounded-full bg-current transition-all duration-300"
                  style={{
                    transform: menuOpen
                      ? "translateY(0) rotate(45deg)"
                      : "translateY(-4px)",
                  }}
                />
                <span
                  className="absolute block h-[2px] w-4 rounded-full bg-current transition-all duration-300"
                  style={{
                    transform: menuOpen
                      ? "translateY(0) rotate(-45deg)"
                      : "translateY(4px)",
                  }}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile overlay */}
      <div
        className="fixed inset-0 z-40 flex flex-col md:hidden"
        style={{
          background: "linear-gradient(135deg, #001849 0%, #003087 100%)",
          transition:
            "opacity 0.35s cubic-bezier(0.32,0.72,0,1), transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? "translateY(0)" : "translateY(-100%)",
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        <div className="h-16 flex-shrink-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white opacity-[0.03]" />
          <div className="absolute -left-16 bottom-24 h-56 w-56 rounded-full bg-[var(--color-accent)] opacity-10" />
        </div>

        <div className="relative flex flex-col flex-1 px-6 pt-10 pb-12 overflow-y-auto">
          <nav className="flex flex-col">
            {[
              { href: "/prace", label: t("jobs"), delay: "0.1s" },
              { href: "/pruvodce", label: t("guides"), delay: "0.18s" },
              { href: "/blog", label: t("blog"), delay: "0.26s" },
              ...(user
                ? [
                    {
                      href: "/oblibene",
                      label: locale === "cs" ? "Oblíbené" : "Obľúbené",
                      delay: "0.34s",
                    },
                    {
                      href: "/profil",
                      label: locale === "cs" ? "Profil" : "Profil",
                      delay: "0.40s",
                    },
                  ]
                : []),
              ...(user?.role === "admin"
                ? [{ href: "/admin", label: "Admin", delay: "0.46s" }]
                : []),
            ].map(({ href, label, delay }) => (
              <Link
                key={href}
                href={href as Parameters<typeof Link>[0]["href"]}
                onClick={() => setMenuOpen(false)}
                className="group flex items-center justify-between border-b border-white/10 py-5"
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateX(0)" : "translateX(-16px)",
                  transition: "opacity 0.3s ease, transform 0.3s ease",
                  transitionDelay: menuOpen ? delay : "0s",
                }}
              >
                <span
                  className={`text-2xl font-extrabold tracking-tight transition-colors ${isActive(href) ? "text-white" : "text-white/40"}`}
                >
                  {label}
                </span>
                <span className={`text-2xl transition-opacity ${isActive(href) ? "opacity-100 text-white" : "opacity-30 text-white"}`}>→</span>
              </Link>
            ))}
          </nav>

          <div
            className="mt-auto pt-8"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              transitionDelay: menuOpen ? "0.5s" : "0s",
            }}
          >
            {user ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="w-full rounded-full border border-white/30 py-3.5 text-sm font-bold text-white/80 hover:text-white transition"
              >
                {locale === "cs" ? "Odhlásit se" : "Odhlásiť sa"}
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-white py-4 text-base font-bold text-[var(--color-primary)] transition hover:opacity-90"
              >
                {locale === "cs" ? "Přihlásit se" : "Prihlásiť sa"}
              </Link>
            )}

            <div className="mt-5 flex items-center justify-center gap-2">
              <a
                href={`/cs${localePath}`}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${locale === "cs" ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                🇨🇿 Česky
              </a>
              <span className="text-white/20">·</span>
              <a
                href={`/sk${localePath}`}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${locale === "sk" ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                🇸🇰 Slovensky
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
