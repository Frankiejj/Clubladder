import { ArrowRight, Calendar, CheckCircle2, Globe, Smartphone, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const appStoreUrl = "";
const playStoreUrl = "";

const features = [
  {
    icon: Trophy,
    title: "Rankings that actually move",
    description:
      "Run singles or doubles ladders with clear rounds, automatic match states, and a view players can understand at a glance.",
  },
  {
    icon: Calendar,
    title: "Scheduling without the back-and-forth",
    description:
      "Players schedule their own matches, reschedule when needed, and get email confirmations without admin babysitting.",
  },
  {
    icon: Users,
    title: "Built for clubs, not spreadsheets",
    description:
      "Keep club members, ladders, rules, and match activity in one place instead of WhatsApp threads and shared sheets.",
  },
];

const steps = [
  "Join your club and set your match frequency.",
  "Get matched automatically inside the current round.",
  "Schedule, reschedule, and report scores from the app.",
];

const storeLinks = [
  { label: "App Store", href: appStoreUrl, note: "iPhone release" },
  { label: "Google Play", href: playStoreUrl, note: "Android release" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f3efe5] text-slate-950">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(21,128,61,0.16),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(180,83,9,0.14),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.72),_rgba(243,239,229,0.92))]" />
        <div className="absolute left-[-7rem] top-20 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute right-[-5rem] top-10 h-48 w-48 rounded-full bg-amber-300/40 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
          <header className="mb-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#14532d] shadow-[0_18px_40px_rgba(20,83,45,0.24)]">
                <img src="/favicon.svg" alt="Sportsladder" className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800/70">
                  Sportsladder
                </div>
                <div className="text-lg font-semibold text-slate-900">Club competition, the new way!</div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" className="hidden sm:inline-flex text-slate-700 hover:bg-white/70">
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-[#14532d] px-5 text-white shadow-[0_16px_30px_rgba(20,83,45,0.26)] hover:bg-[#166534]"
              >
                <Link to="/registration">Join now</Link>
              </Button>
            </div>
          </header>

          <main className="grid flex-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900/75 shadow-sm">
                <Globe className="h-3.5 w-3.5" />
                Ladders for tennis, padel, squash, golf and more
              </div>

              <h1 className="max-w-xl font-serif text-5xl leading-[0.96] text-slate-950 sm:text-6xl lg:text-7xl">
                Your internal club competition!
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
                Sportsladder keeps rankings, matches, schedules, and results in one place so players can manage
                their own round and clubs can stop chasing updates manually.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#14532d] px-6 text-white shadow-[0_18px_36px_rgba(20,83,45,0.28)] hover:bg-[#166534]"
                >
                  <Link to="/">
                    Open web app
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-slate-300 bg-white/70 px-6 text-slate-900 hover:bg-white"
                >
                  <Link to="/registration">Create account</Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <Card className="border-0 bg-white/78 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                  <CardContent className="p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Players</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-950">Self-service</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Schedule and report matches without waiting for an admin.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-[#14532d] text-white shadow-[0_20px_45px_rgba(20,83,45,0.25)]">
                  <CardContent className="p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-emerald-100/80">Clubs</div>
                    <div className="mt-2 text-3xl font-semibold">Less chasing</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/85">Match reminders and schedule updates happen inside the workflow.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-white/78 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                  <CardContent className="p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Rounds</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-950">Clear cadence</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Players always know who they play next and when the round ends.</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-white/35 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white/60 bg-slate-950 p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#11251a_0%,#0f172a_100%)] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.26em] text-emerald-200/75">Live round</div>
                      <div className="mt-1 text-2xl font-semibold">Weekend ladder board</div>
                    </div>
                    <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                      3 matches pending
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white/8 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-emerald-100/70">Upcoming match</div>
                          <div className="mt-1 text-lg font-semibold">Emma Wilson vs Sarah Chen</div>
                        </div>
                        <div className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-amber-950">
                          Rescheduled
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-200/85">Thursday, 19:30 at Riverside Tennis Club</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 text-slate-900">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
                          <Trophy className="h-4 w-4" />
                          Top positions
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span>#1 Emma Wilson</span>
                            <span className="font-semibold text-emerald-700">defending</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span>#2 Sarah Chen</span>
                            <span className="font-semibold text-slate-600">challenging</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span>#3 James Rodriguez</span>
                            <span className="font-semibold text-slate-600">waiting</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#dbeafe] p-4 text-slate-900">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-sky-900">
                          <Smartphone className="h-4 w-4" />
                          Player flow
                        </div>
                        <ul className="space-y-2 text-sm leading-6">
                          {steps.map((step) => (
                            <li key={step} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sky-700" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border-[#d6d0c0] bg-[#fffdf7] shadow-[0_20px_55px_rgba(148,163,184,0.12)]"
              >
                <CardContent className="p-6">
                  <div className="mb-5 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-950">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-900/8 bg-[#1c1917] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-emerald-300/70">Launch surfaces</div>
              <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
                Web first now. Store links ready to drop in when your mobile release is live.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300">
                This landing page already gives you a public front door for the product. When your App Store and Play
                Store listings are ready, you only need to plug the URLs into this page.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {storeLinks.map((store) =>
                store.href ? (
                  <a
                    key={store.label}
                    href={store.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 transition-transform hover:-translate-y-1 hover:bg-white/10"
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">{store.note}</div>
                    <div className="mt-3 text-2xl font-semibold">{store.label}</div>
                    <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-100">
                      Open store listing
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </a>
                ) : (
                  <div
                    key={store.label}
                    className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/6 p-5 text-white/90"
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">{store.note}</div>
                    <div className="mt-3 text-2xl font-semibold">{store.label}</div>
                    <div className="mt-3 text-sm text-stone-300">Add your published store URL here later.</div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 border-t border-slate-900/10 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>Sportsladder</div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link to="/login" className="hover:text-slate-900">
              Log in
            </Link>
            <Link to="/registration" className="hover:text-slate-900">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
