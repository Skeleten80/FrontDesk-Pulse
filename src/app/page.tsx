import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,106,79,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(201,120,43,0.12),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <p className="font-display text-2xl text-primary">FrontDesk Pulse</p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">Open demo</Link>
            </Button>
          </div>
        </header>

        <section className="mt-20 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-up space-y-6">
            <p className="font-display text-5xl leading-tight text-foreground md:text-6xl">
              FrontDesk Pulse
            </p>
            <h1 className="max-w-xl text-2xl font-medium text-foreground/90 md:text-3xl">
              Your AI receptionist that books work and shows what needs attention.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Answer calls, qualify leads, book appointments, and track a clear Business
              Health Score — built for local service businesses, not generic chatbots.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">Sign in to workspace</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/sign-in">Try demo owner login</Link>
              </Button>
            </div>
          </div>

          <div className="animate-fade-up-delay relative min-h-[360px] overflow-hidden rounded-2xl border border-border bg-[linear-gradient(160deg,#0f6a4f_0%,#184e3d_45%,#24352f_100%)] p-8 text-primary-foreground shadow-xl">
            <div className="absolute -right-8 top-8 h-40 w-40 rounded-full bg-accent/30 blur-2xl animate-pulse-soft" />
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Business Health</p>
            <p className="mt-4 font-display text-7xl">82</p>
            <p className="mt-2 text-lg">Healthy — three overdue quote leads need a callback.</p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              <li>Calls answered with approved business knowledge</li>
              <li>Leads and appointments captured automatically</li>
              <li>Owner dashboard with prioritized next actions</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
