import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Play,
  Plus,
  Trash2,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { filterTabPillClass, subtleLinkClass } from "@/components/gaw/interactions";
import { Avatar, EmptyState, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { type BookingAction } from "@/lib/gaw/bookings";
import { barangayName, CATEGORIES, OTHER_CATEGORY, WORKERS } from "@/lib/gaw/data";
import { FREE_OPEN_GIGS_LIMIT } from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso, useGaw, type Booking, type BookingStatus } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>): { tab?: "bookings" | "requests" } =>
    search["tab"] === "requests"
      ? { tab: "requests" }
      : search["tab"] === "bookings"
        ? { tab: "bookings" }
        : {},
  head: () => ({
    meta: [
      { title: "My Bookings — GAW" },
      { name: "description", content: "Track your booking requests with nearby workers." },
      { property: "og:title", content: "My Bookings — GAW" },
      { property: "og:description", content: "Track your booking requests with nearby workers." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { tx } = useI18n();
  return (
    <AppLayout mode="hire" title={tx("My Bookings", "Mga Booking Ko", "Akong mga Booking")}>
      <BookingsList />
    </AppLayout>
  );
}

function resolveWorkerDisplay(
  b: Booking,
  workerSkill: string | undefined,
  tx: (en: string, fil: string, ceb: string) => string,
) {
  const w = WORKERS.find((x) => x.id === b.workerId);
  if (w) {
    return {
      id: w.id,
      name: w.name,
      initials: w.initials,
      skill: w.skill,
      isLinkable: true,
    };
  }
  const fallback = WORKERS[0]!;
  return {
    id: fallback.id,
    name: workerSkill
      ? `${tx("Assigned Worker", "Nakatalagang Manggagawa", "Natudlo nga Trabahante")} (${workerSkill})`
      : `${fallback.name} (${tx("Synced Worker", "Synced na Manggagawa", "Synced nga Trabahante")})`,
    initials: "WK",
    skill: workerSkill ?? b.service,
    isLinkable: false,
  };
}

function BookingsList() {
  const { tab } = Route.useSearch();
  const [view, setView] = useState<"bookings" | "requests">(tab ?? "bookings");
  const { bookings, bookingAction, workerProfile, customJobs, removeJob, plans } = useGaw();
  const { locale, t, tx, statusLabel, translateCategory } = useI18n();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const localizedFilters: { key: BookingStatus | "all"; label: string }[] = [
    { key: "all", label: tx("All", "Lahat", "Tanan") },
    { key: "pending", label: tx("Pending", "Pending", "Pending") },
    { key: "confirmed", label: tx("Accepted", "Tinanggap", "Gidawat") },
    { key: "in_progress", label: tx("In Progress", "Ginagawa Na", "Ginahimo Na") },
    {
      key: "awaiting_confirmation",
      label: tx("Awaiting Confirmation", "Naghihintay ng Kumpirmasyon", "Naghulat sa Kumpirmasyon"),
    },
    { key: "completed", label: tx("Completed", "Tapos Na", "Nahuman Na") },
    { key: "cancelled", label: tx("Cancelled", "Kinansela", "Gikansela") },
    { key: "declined", label: tx("Declined", "Tinanggihan", "Gibalibaran") },
  ];

  useEffect(() => {
    if (tab) setView(tab);
  }, [tab]);

  const list = bookings.filter((b) => filter === "all" || b.status === filter);

  const act = (id: string, action: BookingAction, msg: string) => {
    bookingAction(id, action);
    toast.success(msg);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Shared state note */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
        <span>
          <strong>
            {tx(
              "Shared Booking State:",
              "Pinagsamang Estado ng Booking:",
              "Gipaambit nga Estado sa Booking:",
            )}
          </strong>{" "}
          {tx(
            "Status changes in Worker",
            "Ang pagbabago ng status sa",
            "Ang kausaban sa status sa",
          )}{" "}
          <Link to="/my-jobs" className={cn(subtleLinkClass, "inline text-[length:inherit]")}>
            {tx("My Jobs", "Aking Trabaho", "Akong Trabaho")}
          </Link>{" "}
          {tx("immediately update here.", "ay agad na makikita rito.", "makita dayon dinhi.")}
        </span>
        <Button asChild size="sm" variant="soft">
          <Link to="/find">
            {tx("+ Request New Booking", "+ Mag-book ng Bago", "+ Pag-book og Bag-o")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3" role="tablist">
        {(
          [
            ["bookings", t("bookings.tabBookings", { count: bookings.length })],
            ["requests", t("bookings.tabRequests", { count: customJobs.length })],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            id={`bookings-tab-${k}`}
            type="button"
            role="tab"
            aria-selected={view === k}
            aria-controls={`bookings-panel-${k}`}
            onClick={() => setView(k)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              view === k
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "requests" && (
        <section
          id="bookings-panel-requests"
          role="tabpanel"
          aria-labelledby="bookings-tab-requests"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 shadow-soft">
            <div>
              <h2 className="text-base font-bold">{t("hire.yourRequestsTitle")}</h2>
              <p className="text-xs text-muted-foreground">
                {plans.includes("employer")
                  ? tx(
                      "Employer Pro · Unlimited open service requests",
                      "Employer Pro · Walang limit na requests",
                      "Employer Pro · Walay limit nga requests",
                    )
                  : tx(
                      `${customJobs.length} of ${FREE_OPEN_GIGS_LIMIT} Free active open requests used`,
                      `${customJobs.length} sa ${FREE_OPEN_GIGS_LIMIT} Free open requests nagamit`,
                      `${customJobs.length} sa ${FREE_OPEN_GIGS_LIMIT} Free open requests nagamit`,
                    )}
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/hire">
                <Plus className="size-4" aria-hidden /> {t("hire.postRequestCta")}
              </Link>
            </Button>
          </div>

          {customJobs.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title={tx(
                "No posted requests yet",
                "Wala pang nakapost na request",
                "Wala pay na-post nga request",
              )}
              body={tx(
                "Post an open service request from Employer Home to receive worker applications across Davao City.",
                "Mag-post ng bukas na service request mula sa Employer Home para makahanap ng mga manggagawa.",
                "Pag-post og abli nga service request gikan sa Employer Home aron makadawat og mga aplikante.",
              )}
              action={
                <Button asChild size="lg">
                  <Link to="/hire">{t("hire.postRequestCta")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {customJobs.map((job) => {
                const matchCount = WORKERS.filter(
                  (w) =>
                    job.category === OTHER_CATEGORY ||
                    w.skill.toLowerCase() === job.category.toLowerCase() ||
                    w.skills.some((s) => s.toLowerCase() === job.category.toLowerCase()),
                ).length;
                return (
                  <li key={job.id} className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="text-base font-bold text-foreground hover:text-primary"
                          >
                            {job.title}
                          </Link>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {translateCategory(job.category)}
                          </span>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground">
                              <Zap className="size-3" aria-hidden />
                              {tx("Urgent", "Apurahan", "Dinalian")}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden />
                            {barangayName(job.barangayId)}
                            {job.landmark ? ` · ${job.landmark}` : ""}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Wallet className="size-3.5" aria-hidden />
                            {job.budget} · {job.estimatedHours}h
                          </span>
                          <span>{job.schedule}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="soft">
                          <Link to="/jobs/$id" params={{ id: job.id }}>
                            {tx("View listing", "Tingnan", "Tan-awa")}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/find"
                            search={
                              (CATEGORIES as readonly string[]).includes(job.category)
                                ? { category: job.category }
                                : { q: job.category }
                            }
                          >
                            {tx(
                              `${matchCount} workers`,
                              `${matchCount} manggagawa`,
                              `${matchCount} trabahante`,
                            )}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            removeJob(job.id);
                            toast.success(
                              tx("Request removed", "Inalis ang request", "Gikuha ang request"),
                            );
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          {tx("Close", "Isara", "Sirad-a")}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {view === "bookings" && (
        <div
          id="bookings-panel-bookings"
          role="tabpanel"
          aria-labelledby="bookings-tab-bookings"
          className="space-y-4"
        >
          {/* Filter pills */}
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5"
            role="group"
            aria-label={tx(
              "Filter by status",
              "I-filter ayon sa status",
              "I-filter base sa status",
            )}
          >
            {localizedFilters.map((f) => {
              const n =
                f.key === "all"
                  ? bookings.length
                  : bookings.filter((b) => b.status === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={filterTabPillClass(
                    filter === f.key,
                    "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
                  )}
                >
                  {f.label} <span className="opacity-70">({n})</span>
                </button>
              );
            })}
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title={
                filter === "all"
                  ? tx("No bookings yet", "Wala pang mga booking", "Wala pay mga booking")
                  : tx(
                      `No ${statusLabel(filter).toLowerCase()} bookings`,
                      `Walang booking na ${statusLabel(filter).toLowerCase()}`,
                      `Walay booking nga ${statusLabel(filter).toLowerCase()}`,
                    )
              }
              body={tx(
                "Find a nearby worker and send a booking request — it will show up here.",
                "Maghanap ng manggagawa sa malapit at magpadala ng booking request — lalabas ito rito.",
                "Pangita og trabahante sa duol ug pagpadala og booking request — makita kana dinhi.",
              )}
              action={
                <Button asChild>
                  <Link to="/find">
                    {tx("Open Nearby Finder", "Buksan ang Paghahanap", "Ablihi ang Pangita")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {list.map((b) => {
                const w = resolveWorkerDisplay(b, workerProfile?.skill, tx);
                const rateDisplay =
                  b.rateText ??
                  (b.budget
                    ? formatPeso(b.budget)
                    : tx("Quote requested", "Humihingi ng presyo", "Nangayo og presyo"));
                const locDisplay = b.location?.label ?? barangayName(b.barangayId);

                return (
                  <li
                    key={b.id}
                    className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft md:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar initials={w.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {w.isLinkable ? (
                              <Link
                                to="/workers/$id"
                                params={{ id: w.id }}
                                className={cn(
                                  subtleLinkClass,
                                  "inline text-base font-bold text-foreground hover:text-primary",
                                )}
                              >
                                {w.name}
                              </Link>
                            ) : (
                              <p className="font-bold">{w.name}</p>
                            )}
                            <p className="text-sm font-semibold text-primary">{b.service}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx("Employer:", "Nagpapa-hire:", "Nagpa-hire:")} {b.client.name}
                            </p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {b.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden />
                            {new Date(b.date + "T00:00").toLocaleDateString(locale, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {formatTime(b.time)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden /> {locDisplay}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Wallet className="size-3.5" aria-hidden /> {rateDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Optional Live Location Sharing for Active In-Progress Booking */}
                    {b.status === "in_progress" && (
                      <LiveJobSharingCard
                        bookingTitle={b.service}
                        barangayId={b.barangayId}
                        targetLocation={b.location}
                      />
                    )}

                    {/* Employer Confirmation Banner when Worker marks job finished */}
                    {b.status === "awaiting_confirmation" && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-secondary/60 p-3.5">
                        <div className="text-xs">
                          <p className="font-bold text-foreground">
                            {tx(
                              "Worker marked this job as finished",
                              "Minarkahan ng manggagawa na tapos na ito",
                              "Gimarkahan sa trabahante nga human na kini",
                            )}
                          </p>
                          <p className="text-muted-foreground">
                            {tx(
                              "Confirm completion to move this booking to Completed.",
                              "Kumpirmahin para mailipat ang booking sa Tapos Na.",
                              "Kumpirmaha aron mabalhin ang booking sa Nahuman Na.",
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            act(
                              b.id,
                              "confirm",
                              tx(
                                "Confirmed job completion!",
                                "Nakumpirma ang pagtatapos!",
                                "Nakumpirma ang pagkahuman!",
                              ),
                            )
                          }
                        >
                          <CheckCircle2 className="size-4" />{" "}
                          {tx(
                            "Confirm Completion",
                            "Kumpirmahin na Tapos",
                            "Kumpirmaha nga Human Na",
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Pending / Confirmed / In Progress Controls */}
                    {b.status === "pending" && (
                      <div className="mt-4 rounded-xl bg-muted p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {tx("Respond in", "Sumagot sa", "Tubag sa")}{" "}
                            <Link
                              to="/my-jobs"
                              className={cn(
                                subtleLinkClass,
                                "inline text-[length:inherit] underline",
                              )}
                            >
                              {tx(
                                "Worker My Jobs",
                                "Aking Trabaho ng Manggagawa",
                                "Akong Trabaho sa Trabahante",
                              )}
                            </Link>{" "}
                            {tx(
                              "or simulate worker response:",
                              "o i-simulate ang sagot ng manggagawa:",
                              "o i-simulate ang tubag sa trabahante:",
                            )}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act(
                                b.id,
                                "cancel",
                                tx(
                                  "Booking cancelled",
                                  "Kinansela ang booking",
                                  "Gikansela ang booking",
                                ),
                              )
                            }
                          >
                            <XCircle className="size-3.5" />{" "}
                            {tx(
                              "Cancel Booking",
                              "Kanselahin ang Booking",
                              "Kanselahon ang Booking",
                            )}
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              act(
                                b.id,
                                "accept",
                                tx(
                                  `${w.name} accepted the booking`,
                                  `Tinanggap ni ${w.name} ang booking`,
                                  `Gidawat ni ${w.name} ang booking`,
                                ),
                              )
                            }
                          >
                            {tx(
                              "Worker Accepts",
                              "Tinanggap ng Manggagawa",
                              "Gidawat sa Trabahante",
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              act(
                                b.id,
                                "decline",
                                tx(
                                  `${w.name} declined this booking`,
                                  `Tinanggihan ni ${w.name} ang booking`,
                                  `Gibalibaran ni ${w.name} ang booking`,
                                ),
                              )
                            }
                          >
                            {tx(
                              "Worker Declines",
                              "Tinanggihan ng Manggagawa",
                              "Gibalibaran sa Trabahante",
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {b.status === "confirmed" && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <span className="text-xs text-muted-foreground">
                          {tx(
                            "Accepted & scheduled. Worker can start the job from My Jobs.",
                            "Tinanggap at naka-iskedyul na. Maaaring simulan ng manggagawa mula sa Aking Trabaho.",
                            "Gidawat ug naka-iskedyul na. Pwede sugdan sa trabahante gikan sa Akong Trabaho.",
                          )}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act(
                                b.id,
                                "cancel",
                                tx(
                                  "Booking cancelled",
                                  "Kinansela ang booking",
                                  "Gikansela ang booking",
                                ),
                              )
                            }
                          >
                            {tx("Cancel Booking", "Kanselahin", "Kanselahon")}
                          </Button>
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() =>
                              act(
                                b.id,
                                "start",
                                tx(
                                  "Worker started the job (In Progress)",
                                  "Sinimulan na ang trabaho",
                                  "Gisugdan na ang trabaho",
                                ),
                              )
                            }
                          >
                            <Play className="size-3.5" />{" "}
                            {tx(
                              "Simulate: Worker Starts Job",
                              "I-simulate: Simulan ang Trabaho",
                              "I-simulate: Sugdi ang Trabaho",
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {b.status === "in_progress" && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <span className="text-xs text-muted-foreground">
                          {tx(
                            "Job is currently in progress.",
                            "Kasalukuyang ginagawa ang trabaho.",
                            "Ginahimo karon ang trabaho.",
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() =>
                            act(
                              b.id,
                              "finish",
                              tx(
                                "Worker marked job finished — now awaiting your confirmation",
                                "Minarkahang tapos — naghihintay ng iyong kumpirmasyon",
                                "Gimarkahan nga human na — naghulat sa imong kumpirmasyon",
                              ),
                            )
                          }
                        >
                          {tx(
                            "Simulate: Worker Marks Completed",
                            "I-simulate: Markahang Tapos Na",
                            "I-simulate: Markahi nga Human Na",
                          )}
                        </Button>
                      </div>
                    )}

                    {(b.status === "completed" ||
                      b.status === "declined" ||
                      b.status === "cancelled") &&
                      w.isLinkable && (
                        <div className="mt-4 flex justify-end">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/book/$workerId" params={{ workerId: w.id }}>
                              {b.status === "completed"
                                ? tx("Book again", "I-book muli", "I-book pag-usab")
                                : tx("Try again", "Subukan muli", "Sulayi pag-usab")}
                            </Link>
                          </Button>
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
