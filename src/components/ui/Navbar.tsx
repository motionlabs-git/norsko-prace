"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface NavUser {
  email: string;
  fullName: string | null;
  role: string | null;
}

interface NavbarProps {
  user: NavUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Rozbalená skupina v hlavním menu (na desktopu jen jedna naráz)
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname.includes(path);

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

  // Klik mimo skupinu ji zavře; stejně tak přechod na jinou stránku
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);


  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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

  // Rady a návody jsou pod jednou rozbalovací položkou, aby se menu nelámalo.
  // „children" = podpoložky; na mobilu se vypisují všechny, tam místo je.
  type NavItem = { href: string; label: string; accent?: boolean; children?: { href: string; label: string; short: string; desc: string }[] };
  const navLinks: NavItem[] = [
    { href: "/prace", label: "Sezónní práce" },
    { href: "/stale-pozice", label: "Stálé pozice" },
    { href: "/vybrane", label: "Vybrané inzeráty" },
    {
      href: "/pruvodce",
      label: "Průvodce",
      children: [
        { href: "/pruvodce", label: "Průvodce krok za krokem", short: "Průvodce", desc: "D-number, BankID, daně, první kroky" },
        { href: "/ubytovani", label: "Ubytování", short: "Ubytování", desc: "Jak si najít bydlení před příjezdem" },
        { href: "/blog", label: "Blog", short: "Blog", desc: "Články a zkušenosti z Norska" },
      ],
    },
    { href: "/o-mne", label: "Můj příběh" },
    { href: "/premium", label: "Premium", accent: true },
  ];
  const groupActive = (item: NavItem) =>
    item.children ? item.children.some((c) => isActive(c.href)) : isActive(item.href);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex flex-shrink-0 items-center relative z-50"
          >
            <Image
              src="/images/norsko-prace-logo.svg"
              alt="NorskoPráce"
              width={200}
              height={40}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6" ref={groupRef}>
            {navLinks.map((item) =>
              item.children ? (
                <div key={item.label} className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                    aria-expanded={openGroup === item.label}
                    aria-haspopup="true"
                    className={`flex cursor-pointer items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                      groupActive(item) || openGroup === item.label
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {item.label}
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                      className={`h-4 w-4 transition-transform ${openGroup === item.label ? "rotate-180" : ""}`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {openGroup === item.label && (
                    <div className="absolute left-0 top-9 z-50 w-72 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white py-1.5 shadow-lg">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenGroup(null)}
                          className="block px-4 py-2.5 transition-colors hover:bg-[var(--color-bg)]"
                        >
                          <span
                            className={`block text-sm font-bold ${
                              isActive(child.href) ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
                            }`}
                          >
                            {child.label}
                          </span>
                          <span className="block text-xs text-[var(--color-text-muted)]">{child.desc}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenGroup(null)}
                  className={
                    item.accent
                      ? "whitespace-nowrap text-sm font-bold text-[var(--color-primary)] transition-opacity hover:opacity-70"
                      : `whitespace-nowrap text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                          isActive(item.href)
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-text-muted)]"
                        }`
                  }
                >
                  {item.accent ? `★ ${item.label}` : item.label}
                </Link>
              )
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="relative hidden lg:block" ref={dropdownRef}>
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
                      ♥ Oblíbené
                    </Link>
                    <Link
                      href="/profil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                    >
                      ⚙ Profil
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
                        → Odhlásit se
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="cta-arrow hidden lg:inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary-dark)] hover:shadow-lg"
              >
                Přihlásit se
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="flex lg:hidden items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-border)] relative z-50"
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

      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 flex flex-col lg:hidden"
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
            {navLinks.map((item, i) => {
              const delay = `${0.1 + i * 0.05}s`;
              const reveal = {
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateX(0)" : "translateX(-16px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                transitionDelay: menuOpen ? delay : "0s",
              } as const;

              // Skupina se na mobilu rozbaluje stejně jako na počítači, aby menu
              // nebylo zbytečně dlouhé
              if (item.children) {
                const open = openGroup === item.label;
                return (
                  <div key={item.label} style={reveal}>
                    <button
                      onClick={() => setOpenGroup(open ? null : item.label)}
                      aria-expanded={open}
                      className="flex w-full cursor-pointer items-center justify-between border-b border-white/10 py-5"
                    >
                      <span
                        className={`text-2xl font-extrabold tracking-tight transition-colors ${
                          groupActive(item) || open ? "text-white" : "text-white/40"
                        }`}
                      >
                        {item.label}
                      </span>
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                        className={`h-6 w-6 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {open &&
                      item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => {
                            setMenuOpen(false);
                            setOpenGroup(null);
                          }}
                          className="flex items-center justify-between border-b border-white/10 py-4 pl-5"
                        >
                          <span
                            className={`text-lg font-bold transition-colors ${
                              isActive(child.href) ? "text-white" : "text-white/45"
                            }`}
                          >
                            {child.short}
                          </span>
                          <span className="text-lg text-white/30">→</span>
                        </Link>
                      ))}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="group flex items-center justify-between border-b border-white/10 py-5"
                  style={reveal}
                >
                  <span
                    className={`text-2xl font-extrabold tracking-tight transition-colors ${
                      isActive(item.href) ? "text-white" : "text-white/40"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-2xl transition-opacity ${
                      isActive(item.href) ? "text-white opacity-100" : "text-white opacity-30"
                    }`}
                  >
                    →
                  </span>
                </Link>
              );
            })}

            {/* Odkazy přihlášeného uživatele až pod hlavní nabídkou */}
            {[
              ...(user
                ? [
                    { href: "/oblibene", label: "Oblíbené", delay: "0.38s" },
                    { href: "/profil", label: "Profil", delay: "0.43s" },
                  ]
                : []),
              ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", delay: "0.48s" }] : []),
            ].map(({ href, label, delay }) => (
              <Link
                key={href}
                href={href}
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
                <span
                  className={`text-2xl transition-opacity ${isActive(href) ? "opacity-100 text-white" : "opacity-30 text-white"}`}
                >
                  →
                </span>
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
                Odhlásit se
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="cta-arrow flex items-center justify-center gap-2 w-full rounded-full bg-white py-4 text-base font-bold text-[var(--color-primary)] transition hover:opacity-90"
              >
                Přihlásit se
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
