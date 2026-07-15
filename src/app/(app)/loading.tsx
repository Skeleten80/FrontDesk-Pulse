export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse-soft" aria-live="polite" aria-busy="true">
      <div className="h-40 rounded-xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
    </div>
  );
}
