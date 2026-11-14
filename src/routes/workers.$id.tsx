import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Briefcase, Clock, MapPin, Pencil, Star } from "lucide-react";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { iconFor } from "@/components/gaw/categoryIcons";
import { Avatar, Availability, SectionHeader } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { BARANGAYS, barangayName, WORKERS, type Worker } from "@/lib/gaw/data";
import { distanceKm, roundKm } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso, hiringOrigin, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/workers/$id")({
  loader: ({ params }) => {
    if (params.id === "w-me") {
      return { worker: null, isSelf: true };
    }
    const worker = WORKERS.find((w) => w.id === params.id);
    if (!worker) throw notFound();
    return { worker, isSelf: false };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.worker
      ? [
          { title: `${loaderData.worker.name}, ${loaderData.worker.skill} — GAW` },
          { name: "description", content: loaderData.worker.bio },
          {
            property: "og:title",
            content: `${loaderData.worker.name}, ${loaderData.worker.skill} — GAW`,
          },
          { property: "og:description", content: loaderData.worker.bio },
        ]
      : [{ title: "Worker Profile — GAW" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-xl font-bold">This worker profile isn't available.</p>
        <Button asChild className="mt-4">
          <Link to="/find">Back to Nearby Finder</Link>
        </Button>
      </div>
    </div>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const { worker, isSelf } = Route.useLoaderData();
  const { workerProfile, account, available } = useGaw();
  const { tx } = useI18n();

  const resolvedWorker: Worker | null = isSelf
    ? workerProfile
      ? {
          id: "w-me",
          name: `${account?.name ?? tx("Your Profile", "Iyong Profile", "Imong Profile")} (${tx("Your Worker Profile", "Iyong Worker Profile", "Imong Worker Profile")})`,
          initials: "ME",
          skill: workerProfile.skill,
          skills: workerProfile.skills,
          barangayId: workerProfile.barangayId,
          lat: (workerProfile.area ?? BARANGAYS[0]!).lat,
          lng: (workerProfile.area ?? BARANGAYS[0]!).lng,
          rate: 350,
          available,
          rating: 4.9,
          jobsDone: 12,
          years: 3,
          bio: workerProfile.description,
          hours: tx("Flexible schedule", "Flexible na iskedyul", "Flexible nga iskedyul"),
          reviews: [
            {
              author: "Maria S.",
              rating: 5,
              text: "Great communication and reliable work.",
              when: "Recent",
            },
          ],
          portfolio: [workerProfile.skill, ...workerProfile.skills.slice(0, 2)],
        }
      : null
    : worker;

  const backLabel = tx("Back to Nearby Finder", "Bumalik sa Paghahanap", "Balik sa Pangita");
  const titleLabel = tx("Worker profile", "Profile ng Manggagawa", "Profile sa Trabahante");

  if (!resolvedWorker) {
    return (
      <AppLayout mode="hire" back={<BackButton to="/find" label={backLabel} />} title={titleLabel}>
        <div className="rounded-3xl border bg-card p-6 text-center shadow-soft">
          <p className="font-bold">
            {tx(
              "Set up your worker profile in Working Mode to preview it here.",
              "I-set up muna ang worker profile mo sa Magtrabaho mode para makita rito.",
              "I-set up una ang imong worker profile sa Magtrabaho mode aron makita dinhi.",
            )}
          </p>
          <Button asChild className="mt-4">
            <Link to="/work">
              {tx("Go to Working Mode", "Pumunta sa Magtrabaho Mode", "Adto sa Magtrabaho Mode")}
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="hire" back={<BackButton to="/find" label={backLabel} />} title={titleLabel}>
      <WorkerProfile worker={resolvedWorker} isSelf={isSelf} />
    </AppLayout>
  );
}

function WorkerProfile({ worker, isSelf }: { worker: Worker; isSelf?: boolean }) {
  const gaw = useGaw();
  const { tx, translateCategory } = useI18n();
  const distance = roundKm(distanceKm(hiringOrigin(gaw), worker));
  const Icon = iconFor(worker.skill);

  const cta = isSelf ? (
    <Button asChild size="lg" variant="outline" className="w-full">
      <Link to="/work">
        <Pencil className="size-4" />{" "}
        {tx("Edit Your Worker Profile", "I-edit ang Worker Profile", "Usba ang Worker Profile")}
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="w-full">
      <Link to="/book/$workerId" params={{ workerId: worker.id }}>
        {tx("Request Booking", "Mag-book Ngayon", "I-book Karon")}
      </Link>
    </Button>
  );

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_320px] lg:pb-0">
      <div className="space-y-6">
        <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar initials={worker.initials} size="xl" />
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">{worker.name}</h2>
              <p className="font-semibold text-primary">{translateCategory(worker.skill)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-4 fill-gold text-gold" aria-hidden />{" "}
                  {worker.rating.toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({worker.reviews.length}{" "}
                    {tx("sample reviews", "sample na review", "sample nga review")})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-4" aria-hidden /> {worker.jobsDone}{" "}
                  {tx("jobs", "trabaho", "trabaho")} · {worker.years} {tx("yrs", "taon", "tuig")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden /> {barangayName(worker.barangayId)}{" "}
                  {tx("area", "lugar", "dapit")} · ≈{distance} km{" "}
                  {tx("from your location", "mula sa lokasyon mo", "gikan sa imong lokasyon")}
                </span>
              </div>
              <div className="mt-2.5">
                <Availability available={worker.available} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <SectionHeader title={tx("About", "Tungkol", "Mahitungod")} />
          <p className="leading-relaxed text-muted-foreground">{worker.bio}</p>
          <h3 className="mt-5 text-sm font-bold">
            {tx("Skills", "Mga Kasanayan", "Mga Abilidad")}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
              {translateCategory(worker.skill)} ({tx("Primary", "Pangunahin", "Panguna")})
            </li>
            {worker.skills.map((s) => (
              <li
                key={s}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
              >
                {translateCategory(s)}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-bold">
            {tx("Availability", "Oras na Available", "Oras nga Bakante")}
          </h3>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" aria-hidden /> {worker.hours}
          </p>
        </section>

        <section>
          <SectionHeader title={tx("Portfolio", "Portfolio", "Portfolio")} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {worker.portfolio.map((p, i) => (
              <li
                key={p}
                className={`flex aspect-[4/3] flex-col justify-between rounded-2xl p-4 shadow-soft ${
                  [
                    "bg-contour text-deep-foreground",
                    "bg-secondary text-secondary-foreground",
                    "bg-gold-sheen text-gold-foreground",
                  ][i % 3]
                }`}
              >
                <Icon className="size-6 opacity-80" aria-hidden />
                <span className="text-sm font-bold leading-tight">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {tx(
              "Sample portfolio for demo purposes.",
              "Sample na portfolio para sa demo.",
              "Sample nga portfolio alang sa demo.",
            )}
          </p>
        </section>

        <section>
          <SectionHeader title={tx("Reviews", "Mga Review", "Mga Review")} />
          <ul className="space-y-3">
            {worker.reviews.map((r) => (
              <li key={r.author} className="rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.author}</p>
                  <span className="text-xs text-muted-foreground">{r.when}</span>
                </div>
                <p className="mt-0.5 text-sm text-gold" aria-label={`${r.rating} out of 5 stars`}>
                  {"★".repeat(r.rating)}
                  <span className="text-border">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">{tx("Rate", "Singil", "Bayad")}</p>
          <p className="text-3xl font-extrabold">
            {worker.rate ? (
              <>
                {formatPeso(worker.rate)}
                <span className="text-base font-medium text-muted-foreground">
                  {" "}
                  / {tx("hour", "oras", "oras")}
                </span>
              </>
            ) : (
              tx("Request Quote", "Humingi ng Presyo", "Mangayo og Presyo")
            )}
          </p>
          <div className="mt-5">{cta}</div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {isSelf
              ? tx(
                  "You cannot hire yourself. Switch to Working Mode to edit.",
                  "Hindi mo puwedeng i-hire ang sarili mo. Lumipat sa Magtrabaho Mode para i-edit.",
                  "Dili nimo pwede i-hire ang imong kaugalingon. Balhin sa Magtrabaho Mode aron usbon.",
                )
              : tx(
                  "No payment now. The worker confirms first.",
                  "Walang bayad ngayon. Kukumpirmahin muna ng manggagawa.",
                  "Walay bayad karon. Kumpirmahon una sa trabahante.",
                )}
          </p>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t bg-card/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <p className="shrink-0 text-sm font-bold">
            {worker.rate
              ? `${formatPeso(worker.rate)}/${tx("hr", "oras", "oras")}`
              : tx("Quote", "Presyo", "Presyo")}
          </p>
          {cta}
        </div>
      </div>
    </div>
  );
}
