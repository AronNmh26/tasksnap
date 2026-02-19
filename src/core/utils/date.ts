export function nowIso() {
  return new Date().toISOString();
}

export function toLocalReadable(iso?: string | null) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  return d.toLocaleString();
}
