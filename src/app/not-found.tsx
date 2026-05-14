import Link from "next/link";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import "./globals.css";

export default async function RootNotFound() {
  const messages = await getMessages();

  return (
    <html lang="cs" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages} locale="cs">
          <Navbar locale="cs" user={null} />

          <main className="flex-1">
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
              <div className="w-full max-w-2xl px-6 py-20 text-center">
                <div className="mb-8">
                  <div className="text-8xl font-extrabold text-[#C8102E] mb-6">404</div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text)] mb-4">
                    Stránka nenalezena
                  </h1>
                  <p className="text-lg text-[var(--color-text-muted)] max-w-lg mx-auto mb-10">
                    Omlouváme se, ale stránka, kterou hledáš, neexistuje nebo byla přesunuta.
                    Pojď se vrátit na úvod nebo procházet pracovní nabídky.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/cs"
                    className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#9e0b21] hover:shadow-xl"
                  >
                    Zpět na úvod
                  </Link>
                  <Link
                    href="/cs/prace"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[#046353] bg-white px-8 py-4 text-base font-semibold text-[#046353] shadow-md transition hover:bg-[#f0f9f7]"
                  >
                    Procházet nabídky
                  </Link>
                </div>
              </div>
            </div>
          </main>

          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
