import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw } from "@/lib/gaw/store";
import { evaluateVerificationGuard, type VerifStatus } from "@/lib/gaw/verification";
import { cn } from "@/lib/utils";

export interface VerificationStatusBannerProps {
  role: "hire" | "work";
  className?: string;
}

/**
 * State-aware identity verification status banner displayed at the top of
 * Hiring (/hire) and Working (/work) dashboards without blocking public browsing.
 */
export function VerificationStatusBanner({ role, className }: VerificationStatusBannerProps) {
  const { verification } = useGaw();
  const { tx, verifLabel } = useI18n();
  const guard = evaluateVerificationGuard(verification.identity);
  const status: VerifStatus = guard.status;

  if (status === "verified") {
    return (
      <section
        role="status"
        aria-live="polite"
        data-testid="verification-banner-verified"
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-status-confirmed/35 bg-status-confirmed-bg px-4 py-3 text-status-confirmed shadow-soft sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-status-confirmed/15 text-status-confirmed">
            <CheckCircle2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-bold">
              {tx(
                "Identity Verified · Full Marketplace Access",
                "Beripikado ang ID · Kumpletong Access sa Marketplace",
                "Beripikado ang ID · Kompleto nga Access sa Marketplace",
              )}
            </p>
            <p className="mt-0.5 text-xs text-foreground/85">
              {role === "hire"
                ? tx(
                    "You can book workers, publish open service requests, and manage proposals across Davao City.",
                    "Maaari kang mag-book ng manggagawa, mag-post ng request, at pumili ng aplikante sa Davao City.",
                    "Mahimo ka mag-book og trabahante, mag-post og request, ug modumala sa mga aplikante sa Davao City.",
                  )
                : tx(
                    "Your Verified badge is active. You can apply for open Davao gigs and accept resident bookings.",
                    "Aktibo ang iyong Verified badge. Maaari kang mag-apply sa mga trabaho at tumanggap ng booking.",
                    "Aktibo ang imong Verified badge. Mahimo ka mo-apply sa mga trabaho ug modawat og booking.",
                  )}
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="shrink-0 bg-card/85">
          <Link to="/verify">
            <ShieldCheck className="size-4" aria-hidden />
            {tx("Manage ID", "Pamahalaan ang ID", "Dumalaa ang ID")}
          </Link>
        </Button>
      </section>
    );
  }

  if (status === "rejected") {
    return (
      <section
        role="alert"
        data-testid="verification-banner-rejected"
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-status-declined/40 bg-status-declined-bg p-4 text-status-declined shadow-soft sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-status-declined/15 text-status-declined">
            <XCircle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">
                {tx(
                  "ID verification rejected — action required",
                  "Tinanggihan ang beripikasyon ng ID — kailangan ng bagong upload",
                  "Gisalikway ang beripikasyon sa ID — kinahanglan og bag-ong upload",
                )}
              </p>
              <span className="rounded-full bg-status-declined/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-status-declined">
                {verifLabel(status)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">
              {guard.reason ??
                tx(
                  "Please upload a clearer government-issued photo ID in the Verification Center to unlock bookings and gig actions.",
                  "Mag-upload ng mas malinaw na government ID sa Verification Center para makapag-book at maka-post ng trabaho.",
                  "Pag-upload og mas klaro nga government ID sa Verification Center aron maka-book ug maka-post og trabaho.",
                )}
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="destructive" className="shrink-0">
          <Link to="/verify">
            {tx("Upload New ID", "Mag-upload ng Bagong ID", "Pag-upload og Bag-ong ID")}
          </Link>
        </Button>
      </section>
    );
  }

  const isPending = status === "pending";
  const isResubmission = status === "resubmission_required";

  const headline = isPending
    ? tx(
        "ID verification is pending review",
        "Nasa pagsusuri ang iyong ID verification",
        "Ginasusi pa ang imong ID verification",
      )
    : isResubmission
      ? tx(
          "Clearer ID photo requested before posting or booking",
          "Kailangan ng mas malinaw na larawan ng ID",
          "Kinahanglan og mas klaro nga hulagway sa ID",
        )
      : role === "hire"
        ? tx(
            "Verify your ID to book workers or post service requests",
            "I-verify ang iyong ID bago mag-book o mag-post ng request",
            "I-verify ang imong ID usa ka mag-book o mag-post og request",
          )
        : tx(
            "Verify your ID to apply for jobs or accept resident bookings",
            "I-verify ang iyong ID bago mag-apply o tumanggap ng booking",
            "I-verify ang imong ID usa ka mo-apply o modawat og booking",
          );

  const description = isPending
    ? tx(
        "You can keep browsing nearby workers and jobs while your document is checked. Open Verification Center to review status or simulate instant demo approval.",
        "Maaari ka pang mag-browse ng mga manggagawa at trabaho habang sinusuri ang ID mo. Buksan ang Verification Center para makita ang status.",
        "Mahimo ka gihapon mag-browse sa mga trabahante ug trabaho samtang ginasusi ang imong ID. Ablihi ang Verification Center para sa status.",
      )
    : isResubmission
      ? (guard.reason ??
        tx(
          "Your previous upload needs a clearer, unobstructed photo so we can approve your account.",
          "Kailangan ng mas malinaw at buong larawan ng iyong ID para maaprubahan.",
          "Kinahanglan og mas klaro ug kompleto nga hulagway sa imong ID aron maaprobahan.",
        ))
      : role === "hire"
        ? tx(
            "Browsing Davao workers is open to everyone. Submitting a quick government-issued ID once protects workers and unlocks booking requests and gig posting.",
            "Bukas sa lahat ang paghahanap ng manggagawa sa Davao. Mag-submit ng government ID nang isang beses para makapag-book at makapag-post ng request.",
            "Abli sa tanan ang pagpangita og trabahante sa Davao. Pag-submit og government ID kausa aron maka-book ug maka-post og request.",
          )
        : tx(
            "You can complete your worker profile and explore open Davao jobs right now. Verify one government ID to apply to gigs and accept incoming bookings.",
            "Maaari mo nang buuin ang worker profile at mag-explore ng trabaho sa Davao. Mag-verify ng ID para makapag-apply at tumanggap ng booking.",
            "Mahimo na nimo buhaton ang worker profile ug motan-aw og trabaho sa Davao. I-verify ang ID aron maka-apply ug modawat og booking.",
          );

  const ctaLabel = isPending
    ? tx("Review Status", "Tingnan ang Status", "Tan-awa ang Status")
    : isResubmission
      ? tx("Resubmit ID", "I-submit Muli ang ID", "I-submit Pag-usab ang ID")
      : tx("Verify ID", "I-verify ang ID", "I-verify ang ID");

  return (
    <section
      role="alert"
      data-testid={`verification-banner-${status}`}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-gold/45 bg-gold-soft p-4 text-gold-foreground shadow-soft dark:border-gold/35 dark:text-gold sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold-foreground dark:bg-gold/15 dark:text-gold">
          {isPending ? (
            <Clock className="size-5" aria-hidden />
          ) : (
            <AlertTriangle className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{headline}</p>
            <span className="rounded-full border border-gold/35 bg-gold/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold-foreground dark:text-gold">
              {verifLabel(status)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/85 dark:text-foreground/90">
            {description}
          </p>
        </div>
      </div>

      <Button asChild size="sm" variant="gold" className="shrink-0">
        <Link to="/verify">{ctaLabel}</Link>
      </Button>
    </section>
  );
}
