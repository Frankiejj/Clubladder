import { ArrowRight, Calendar, Clock3, Globe, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const appStoreUrl = "";
const playStoreUrl = "";

const storeLinks = [
  {
    label: "App Store",
    href: appStoreUrl,
    note: "iPhone release",
    eta: "Expected before March 31, 2026",
  },
  {
    label: "Google Play",
    href: playStoreUrl,
    note: "Android release",
    eta: "Expected before March 31, 2026",
  },
];

const webAppLinks = [
  {
    label: "Add on iPhone",
    href: "https://support.apple.com/nl-nl/guide/iphone/iphea86e5236/ios",
  },
  {
    label: "Add on Android",
    href: "https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid&oco=0",
  },
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
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Players schedule their own matches, reschedule when needed, and report scores without waiting
                      for an admin.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-[#14532d] text-white shadow-[0_20px_45px_rgba(20,83,45,0.25)]">
                  <CardContent className="p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-emerald-100/80">Clubs</div>
                    <div className="mt-2 text-3xl font-semibold">Less chasing</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                      Keep club members, ladders, rules, and match activity in one place instead of WhatsApp threads
                      and shared sheets.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-white/78 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                  <CardContent className="p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Rounds</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-950">Clear cadence</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Run singles or doubles ladders with clear rounds, automatic match states, and a view players can
                      understand at a glance.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-white/35 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white/60 bg-slate-950 p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#eefaf1_0%,#dff2e5_100%)] p-4 text-slate-900 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.26em] text-green-700/70">Live round</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-950">Ladder board</div>
                    </div>
                    <div className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-semibold text-green-800 shadow-sm">
                      Riverside Tennisclub
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/90 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.10)]">
                    <div className="rounded-xl border border-green-100 bg-green-50/70 px-4 py-3 text-left shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                        <Users className="h-4 w-4 text-green-700" />
                        Riverside Tennisclub Singles
                      </div>
                      <div className="mt-1 text-xs text-green-800/75">Singles ladder</div>
                    </div>

                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900">
                        <Users className="h-5 w-5" />
                        Rankings
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-100 bg-white px-4 py-2 shadow-sm">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">12 Players</span>
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        <div className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                          Rankings
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                          Matches
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-gray-700">
                        Round 2026-R6: Mar 03 - Mar 16
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center">
                          <div className="mr-4 flex-shrink-0 font-bold text-yellow-600">#1</div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                            E
                          </div>
                          <div className="ml-3 flex-1 text-left">
                            <div className="text-base font-bold text-gray-800">Emma Wilson</div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center">
                          <div className="mr-4 flex-shrink-0 font-bold text-gray-500">#2</div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                            S
                          </div>
                          <div className="ml-3 flex-1 text-left">
                            <div className="text-base font-bold text-gray-800">Sarah Chen</div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center">
                          <div className="mr-4 flex-shrink-0 font-bold text-amber-600">#3</div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                            J
                          </div>
                          <div className="ml-3 flex-1 text-left">
                            <div className="text-base font-bold text-gray-800">James Rodriguez</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="grid grid-cols-3 items-start gap-3">
                        <div className="flex min-w-0 flex-col items-center text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                            E
                          </div>
                          <div className="mt-1 text-sm font-semibold text-green-800">Emma Wilson</div>
                          <div className="text-xs text-gray-600">Rank #1</div>
                        </div>

                        <div className="flex flex-col items-center gap-2 text-center">
                          <Swords className="h-5 w-5 text-green-600" />
                          <span className="text-xs font-medium text-green-700">VS</span>
                          <div className="rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            <Clock3 className="mr-1 inline h-3 w-3" />
                            Scheduled
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            Thu 19:30
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col items-center text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                            S
                          </div>
                          <div className="mt-1 text-sm font-semibold text-green-800">Sarah Chen</div>
                          <div className="text-xs text-gray-600">Rank #2</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <section className="border-y border-slate-900/8 bg-[#1c1917] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-emerald-300/70">Launch surfaces</div>
              <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
                Web app first.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300">
                Sportsladder is available as a web app first. See below instructions on how to add a web app.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {webAppLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    {item.label}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ))}
              </div>
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
                    <div className="mt-2 text-sm text-stone-300">{store.eta}</div>
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
                    <div className="mt-2 text-sm text-stone-300">{store.eta}</div>
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
