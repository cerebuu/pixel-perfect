import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAWBrand, GAWWordmark } from "@/components/gaw/GAWBrand";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw } from "@/lib/gaw/store";
import welcome from "@/assets/gaw-welcome.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GAW — Grab a Work | Find Local Talent. Discover Nearby Work." },
      {
        name: "description",
        content:
          "GAW (Grab a Work) connects Davao City residents with nearby plumbers, electricians, cleaners and more.",
      },
      {
        property: "og:title",
        content: "GAW — Grab a Work | Find Local Talent. Discover Nearby Work.",
      },
      {
        property: "og:description",
        content:
          "GAW (Grab a Work) connects Davao City residents with nearby plumbers, electricians, cleaners and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { hydrated, signedIn, mode } = useGaw();
  const { tx } = useI18n();
  const resume = hydrated && signedIn;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-contour text-deep-foreground outline-none"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-[1460px] items-center gap-7 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 md:py-10 lg:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)] lg:gap-10 lg:px-12 lg:py-10 xl:gap-14 xl:px-14">
        {/* Right Column on Desktop: Prominent Davao Landmarks Hero Card */}
        <figure className="relative w-full overflow-hidden rounded-3xl bg-[#0A1E1C] shadow-lift ring-1 ring-white/15 lg:order-2 lg:rounded-[2.25rem]">
          {/* Non-destructive CSS crop (scale-[1.105] inside overflow-hidden) trims the outer patterned frame while preserving all Davao landmarks */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0D2623] sm:aspect-[16/9.6] lg:aspect-[16/10.2]">
            <img
              src={welcome}
              alt="Panoramic view of iconic Davao City landmarks featuring Mount Apo, San Pedro Cathedral, the Centennial Clock Tower, and the Durian Monument"
              width={1024}
              height={581}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full scale-[1.105] object-cover object-[50%_46%] select-none"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A1E1C] via-[#0A1E1C]/45 to-transparent sm:h-20"
            />
          </div>

          {/* Enhanced Bottom Overlay Plaque */}
          <figcaption className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/12 bg-[#0A1E1C]/95 px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5 lg:px-7 lg:py-5">
            <div className="min-w-0">
              <GAWWordmark size="md" />
              <p className="mt-1.5 text-[0.8125rem] font-medium leading-snug text-deep-muted sm:text-[0.9375rem] lg:text-[1.02rem]">
                {tx(
                  "Davao City’s Hyperlocal Hiring & Work Marketplace",
                  "Lokal na Marketplace ng Serbisyo at Trabaho sa Davao City",
                  "Lokal nga Marketplace sa Serbisyo ug Trabaho sa Davao City",
                )}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold/15 px-3.5 py-1.5 text-[0.8125rem] font-bold text-gold ring-1 ring-gold/35 sm:px-4 sm:py-2 sm:text-[0.9375rem]">
              <MapPin className="size-4" aria-hidden /> Davao City, PH
            </span>
          </figcaption>
        </figure>

        {/* Left Column on Desktop: Brand Identity, Headline, Description, CTAs & Highlights */}
        <div className="relative flex flex-col justify-center pb-2 lg:py-4">
          <header className="flex items-center">
            <GAWBrand variant="expanded" size="xl" onDeep />
          </header>

          <p className="mt-7 text-[clamp(0.75rem,0.95vw,0.9375rem)] font-bold uppercase tracking-[0.12em] text-gold sm:mt-8 lg:mt-9">
            {tx(
              "Local Work. Nearby Opportunities.",
              "Lokal na Serbisyo. Trabahong Malapit sa Iyo.",
              "Lokal nga Serbisyo. Trabaho Duol Nimo.",
            )}
          </p>

          <h1 className="mt-3 text-balance text-[clamp(2.125rem,3.9vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-deep-foreground sm:mt-3.5">
            {tx(
              "Find Local Talent. Discover Nearby Work.",
              "Maghanap ng Manggagawa. Tuklasin ang Trabaho sa Malapit.",
              "Pangita og Hanas nga Trabahante. Diskubreha ang Trabaho sa Duol.",
            )}
          </h1>

          <p className="mt-4 max-w-[33rem] text-[clamp(0.95rem,1.15vw,1.125rem)] leading-[1.6] text-deep-muted sm:mt-5">
            {tx(
              "Trusted plumbers, electricians, cleaners and more — right in your barangay. Or find your next job close to home.",
              "Maaasahang tubero, electrician, tagalinis at iba pa — mismo sa iyong barangay. O hanapin ang susunod mong trabaho malapit sa bahay.",
              "Kasaligang tubero, electrician, tiglimpyo ug uban pa — diha ra sa imong barangay. O pangitaa ang sunod nimong trabaho duol sa inyoha.",
            )}
          </p>

          <div className="mt-7 flex flex-col gap-3.5 sm:mt-8 sm:flex-row sm:items-center">
            {resume ? (
              <Button
                asChild
                size="xl"
                variant="gold"
                className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-10 sm:text-[1.1875rem]"
              >
                <Link to={mode === "work" ? "/work" : mode === "hire" ? "/hire" : "/mode"}>
                  {tx("Continue to GAW", "Magpatuloy sa GAW", "Padayon sa GAW")}
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="xl"
                  variant="gold"
                  className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-10 sm:text-[1.1875rem]"
                >
                  <Link to="/signup">{tx("Get Started", "Magsimula Na", "Sugdi Na")}</Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="ghostOnDeep"
                  className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-9 sm:text-[1.1875rem]"
                >
                  <Link to="/login">{tx("Log In", "Mag-log In", "Mag-log In")}</Link>
                </Button>
              </>
            )}
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-4 border-t border-white/12 pt-6 text-[0.9rem] font-medium leading-snug text-deep-foreground/90 sm:grid-cols-3 sm:gap-5 sm:text-[0.95rem] lg:mt-9 lg:pt-7 lg:text-[1.02rem]">
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <MapPin className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>
                {tx(
                  "Workers near your barangay",
                  "Manggagawa malapit sa iyong barangay",
                  "Trabahante duol sa imong barangay",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>
                {tx(
                  "Reviews from neighbors",
                  "Mga review mula sa kapitbahay",
                  "Mga review gikan sa silingan",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <Sparkles className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>
                {tx(
                  "Hire or work, one account",
                  "Mag-hire o magtrabaho, iisang account",
                  "Mag-hire o magtrabaho, usa ra ka account",
                )}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
