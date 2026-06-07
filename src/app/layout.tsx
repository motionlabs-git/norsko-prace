import type { Metadata } from "next";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://norsko-prace.cz"),
  title: {
    default: "Práce v Norsku česky | Sezónní nabídky — Norsko-práce.cz",
    template: "%s | Norsko-práce.cz",
  },
  description:
    "Stovky sezónních pracovních nabídek z Norska přeložených do češtiny. Zemědělství, gastronomie, stavebnictví — aktualizováno denně.",
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Norsko-práce.cz",
    images: [{ url: "/images/hero.jpg", width: 1920, height: 1440, alt: "Práce v Norsku" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: "https://norsko-prace.cz",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: string | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "user";
    fullName = profile?.full_name ?? null;
  }

  return (
    <html lang="cs" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar user={user ? { email: user.email ?? "", fullName, role } : null} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
