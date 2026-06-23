import Link from "next/link";
import {
  Sparkles,
  Link2,
  Wand2,
  CalendarClock,
  BarChart3,
  Clapperboard,
  ArrowRight,
  Bot,
  ShoppingBag,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo-flag";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Link2, title: "Drop a link", body: "Paste a product URL, a TikTok/Reel you own, or upload your product media." },
  { icon: Bot, title: "AI analyzes it", body: "Claude extracts benefits, pain points, the target buyer, and the best selling angles." },
  { icon: Wand2, title: "It writes the ads", body: "10 hooks, 5 angles, 3 full scripts with storyboards, captions, and CTAs — instantly." },
  { icon: Clapperboard, title: "Renders 9:16 video", body: "Hook-first, fast-paced vertical ads with subtitles, callouts, voiceover, and music." },
  { icon: CalendarClock, title: "Posts on autopilot", body: "Connect your accounts and publish one fresh ad a day to TikTok, Reels & Shorts." },
  { icon: BarChart3, title: "Learns & improves", body: "Performance feeds back into the next batch, so your ads compound over time." },
];

const STYLES = [
  "UGC", "Problem → Solution", "Before / After", "Product showcase", "Fast-paced TikTok",
  "Luxury", "Direct-response", "Testimonial", "Faceless", "TikTok made me buy it",
  "3 reasons you need this", "Stop scrolling",
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.25),transparent)]" />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          AdMagic
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className={buttonClasses("ghost", "sm")}>
            Log in
          </Link>
          <Link href={DEMO_MODE ? "/dashboard" : "/signup"} className={buttonClasses("primary", "sm")}>
            {DEMO_MODE ? "View demo" : "Get started"}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
          <ShoppingBag className="h-3.5 w-3.5 text-brand-300" />
          Built for ecommerce, dropshippers & affiliates
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          AI product ads, generated and posted{" "}
          <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
            while you sleep
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-ink-300">
          Paste a product link and AdMagic builds a full short-form ad strategy, renders
          high-performing 9:16 videos, and auto-posts one a day to TikTok, Reels, and Shorts.
          FacelessReels meets an AI TikTok-ads agency — focused on products.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          {DEMO_MODE ? (
            <Link href="/dashboard" className={buttonClasses("primary", "lg")}>
              Explore the live demo <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/signup" className={buttonClasses("primary", "lg")}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link href="/login" className={buttonClasses("outline", "lg")}>
            Log in
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          {DEMO_MODE
            ? "Demo mode · seeded sample data · no signup needed"
            : "No credit card required · Posts only content you own"}
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">From link to live, in one flow</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-ink-500">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Styles */}
      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold">Every winning ad format, on tap</h2>
        <p className="mt-2 text-ink-400">The AI picks the right style per product — or you choose.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {STYLES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-300"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className={cn("card overflow-hidden p-10 text-center", "bg-gradient-to-b from-brand-600/20 to-transparent")}>
          <h2 className="text-3xl font-bold">Turn one product into 30 days of ads</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            Spin up a campaign, let the AI plan a month of fresh videos, review them in one
            queue, and let autopilot handle posting.
          </p>
          <Link href={DEMO_MODE ? "/dashboard" : "/signup"} className={cn(buttonClasses("primary", "lg"), "mt-6")}>
            {DEMO_MODE ? "Open the demo dashboard" : "Create your first campaign"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} AdMagic. Posts only content you own — see our compliance docs.
      </footer>
    </main>
  );
}
