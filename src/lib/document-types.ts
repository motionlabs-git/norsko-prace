/**
 * Typy a drobné pomocníky pro dokumenty — bez serverových závislostí,
 * aby šly použít i v klientských komponentách (administrace).
 */
export type DocumentAccess = "all" | "premium";

export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  file_path: string;
  access: DocumentAccess;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

/** „1,8 MB" pro výpis */
export function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}
