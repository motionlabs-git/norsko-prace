import Link from "next/link";
import { canDownload, formatSize, type DocumentRow } from "@/lib/documents";
import type { Entitlement } from "@/lib/entitlement";

function PdfIcon({ locked }: { locked: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
        locked ? "bg-[var(--color-bg)] text-[var(--color-text-muted)]" : "bg-[#fde8ec] text-[#C8102E]"
      }`}
      aria-hidden
    >
      PDF
    </span>
  );
}

/**
 * Dokumenty ke stažení. Zamčené se schovávají jen „na pohled" — soubor chrání
 * serverová kontrola v /api/documents/[slug], ne tahle komponenta.
 */
export function Documents({ documents, ent }: { documents: DocumentRow[]; ent: Entitlement }) {
  if (documents.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        Dokumenty ke stažení
      </h2>

      <ul className="mt-4 space-y-3">
        {documents.map((doc) => {
          const allowed = canDownload(doc, ent, true);
          const size = formatSize(doc.size_bytes);

          return (
            <li
              key={doc.id}
              className="flex items-start gap-4 rounded-2xl border border-[var(--color-border)] p-4"
            >
              <PdfIcon locked={!allowed} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--color-text)]">{doc.title}</p>
                {doc.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {doc.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {doc.access === "premium" ? "Premium" : "Pro všechny"}
                  {size ? ` · ${size}` : ""}
                </p>
              </div>

              {allowed ? (
                <a
                  href={`/api/documents/${doc.slug}`}
                  className="mt-0.5 flex-shrink-0 rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Stáhnout
                </a>
              ) : (
                <Link
                  href="/premium?from=dokumenty"
                  className="mt-0.5 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Odemknout
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
