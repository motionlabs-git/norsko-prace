"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSize, type DocumentRow } from "@/lib/document-types";

/** Nahrávání a správa PDF dokumentů pro profil uživatelů. */
export function AdminDocuments({ documents }: { documents: DocumentRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const res = await fetch("/api/admin/documents", { method: "POST", body: new FormData(e.currentTarget) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setMessage({ ok: false, text: body.error ?? "Nahrání selhalo" });
      return;
    }
    setMessage({ ok: true, text: "Dokument nahrán." });
    formRef.current?.reset();
    router.refresh();
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Opravdu smazat „${title}"? Soubor se odstraní i z úložiště.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/documents?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ ok: false, text: body.error ?? "Smazání selhalo" });
      return;
    }
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-[var(--color-text)]">Dokumenty v profilu</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        PDF ke stažení v profilu uživatele. Soubory leží v soukromém úložišti, stahují se přes
        dočasný odkaz až po kontrole oprávnění.
      </p>

      <form ref={formRef} onSubmit={handleUpload} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input name="title" required placeholder="Název (např. Práce v Norsku – praktický průvodce)" className={`${inputClass} sm:col-span-2`} />
        <input name="description" placeholder="Krátký popis (nepovinné)" className={`${inputClass} sm:col-span-2`} />

        <select name="access" defaultValue="premium" className={inputClass} aria-label="Kdo může stáhnout">
          <option value="premium">Jen pro Premium</option>
          <option value="all">Pro všechny přihlášené</option>
        </select>

        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="w-full rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Nahrávám…" : "Nahrát dokument"}
          </button>
          {message && (
            <span className={`text-sm font-semibold ${message.ok ? "text-emerald-600" : "text-[#C8102E]"}`}>
              {message.text}
            </span>
          )}
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">PDF, max 25 MB</span>
        </div>
      </form>

      {documents.length > 0 && (
        <ul className="mt-6 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-text)]">{doc.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {doc.access === "premium" ? "Premium" : "Pro všechny"}
                  {formatSize(doc.size_bytes) ? ` · ${formatSize(doc.size_bytes)}` : ""} · /{doc.slug}
                </p>
              </div>
              <a
                href={`/api/documents/${doc.slug}`}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Otevřít
              </a>
              <button
                onClick={() => handleDelete(doc.slug, doc.title)}
                disabled={busy}
                className="cursor-pointer text-xs font-semibold text-[#C8102E] hover:underline disabled:opacity-60"
              >
                Smazat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
