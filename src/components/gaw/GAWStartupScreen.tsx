import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import gawIconUrl from "@/assets/gaw-icon.jpg";
import { FOCUS_RING, prefersReducedMotion } from "@/components/gaw/interactions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/gaw/i18n";
import { STORAGE_KEY } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

/** Tracks whether the root startup screen is currently covering initial boot. */
export const StartupOverlayContext = createContext(false);

export function useStartupOverlayActive() {
  return useContext(StartupOverlayContext);
}

export interface GAWConnectionMotifProps {
  /** Render compactly when reused in post-startup success states. */
  size?: "md" | "lg";
  /** Disable convergence arcs when displaying an error recovery card. */
  showConnections?: boolean;
  className?: string;
}

/**
 * Signature visual motif for GAW: untouched official G-arrow logo anchored between
 * converging left (community green) and right (worker gold) Davao connection arcs.
 */
export function GAWConnectionMotif({
  size = "lg",
  showConnections = true,
  className,
}: GAWConnectionMotifProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const boxSizeClass =
    size === "lg"
      ? "size-[76px] sm:size-[86px] md:size-[92px] rounded-[18px] sm:rounded-[21px]"
      : "size-14 sm:size-16 rounded-[14px] sm:rounded-[16px]";

  const haloSizeClass =
    size === "lg"
      ? "size-[96px] sm:size-[108px] md:size-[116px] rounded-[24px] sm:rounded-[27px]"
      : "size-[72px] sm:size-[80px] rounded-[19px] sm:rounded-[21px]";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none",
        size === "lg" ? "h-28 w-[280px] sm:h-32 sm:w-[344px]" : "h-20 w-[220px]",
        className,
      )}
    >
      {showConnections && (
        <>
          <svg
            viewBox="0 0 360 112"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {/* Left path — community member / household seeking local service */}
            <path
              d="M 22 64 Q 96 26 142 56"
              pathLength={1}
              strokeWidth="1.75"
              strokeLinecap="round"
              className="gaw-startup-arc stroke-[#0E7048]/75 dark:stroke-[#43C486]/80"
            />
            <circle
              cx="22"
              cy="64"
              r="7"
              className="gaw-startup-node fill-none stroke-[#0E7048]/28 dark:stroke-[#43C486]/32"
              strokeWidth="1.25"
            />
            <circle
              cx="22"
              cy="64"
              r="3.5"
              className="gaw-startup-node fill-[#0E7048] dark:fill-[#43C486]"
            />

            {/* Right path — skilled Davao worker ready nearby */}
            <path
              d="M 338 48 Q 264 86 218 56"
              pathLength={1}
              strokeWidth="1.75"
              strokeLinecap="round"
              className="gaw-startup-arc stroke-[#D99416]/80 dark:stroke-[#F4B544]/85"
            />
            <circle
              cx="338"
              cy="48"
              r="7"
              className="gaw-startup-node fill-none stroke-[#D99416]/28 dark:stroke-[#F4B544]/32"
              strokeWidth="1.25"
            />
            <circle
              cx="338"
              cy="48"
              r="3.5"
              className="gaw-startup-node fill-[#D99416] dark:fill-[#F4B544]"
            />
          </svg>

          {/* Single-shot restrained convergence halo */}
          <span
            aria-hidden="true"
            className={cn(
              "gaw-startup-halo pointer-events-none absolute border border-[#0E7048]/35 dark:border-[#43C486]/40",
              haloSizeClass,
            )}
          />
        </>
      )}

      {/* Official GAW G-arrow asset, unaltered when loaded; clean geometric fallback if unavailable */}
      <div
        data-logo-fallback={imgFailed ? "true" : undefined}
        className={cn(
          "gaw-startup-emblem relative z-10 inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#0E7048]",
          "ring-1 ring-[#123C39]/14 shadow-[0_12px_28px_-8px_rgba(18,60,57,0.22)]",
          "dark:ring-[#43C486]/28 dark:shadow-[0_14px_34px_-10px_rgba(0,0,0,0.72),0_0_24px_-8px_rgba(67,196,134,0.22)]",
          boxSizeClass,
        )}
      >
        {imgFailed ? (
          <svg viewBox="0 0 64 64" aria-hidden="true" className="size-[68%] text-white" fill="none">
            <path
              d="M46 21a18 18 0 1 0 3.5 14H33"
              stroke="currentColor"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M39 29l10.5 6L39 41"
              fill="none"
              stroke="#F4B544"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <img
            src={gawIconUrl}
            alt="GAW"
            width={92}
            height={92}
            decoding="async"
            fetchPriority="high"
            onError={() => setImgFailed(true)}
            className="size-full object-contain"
          />
        )}
      </div>
    </div>
  );
}

type ScreenPhase = "entering" | "exiting" | "error" | "timeout";

export interface GAWStartupScreenProps {
  /** True when essential app initialization (theme, locale, store, initial route settle) is complete. */
  essentialReady: boolean;
  /** Optional explicit initialization failure reason. */
  initError?: string | null;
  /** Called once the exit fade finishes so RootComponent permanently unmounts the startup overlay. */
  onComplete: () => void;
  /** Invoked when the user clicks Retry on an initialization or timeout error state. */
  onRetry?: () => void;
  /** Invoked when the user clears local storage state for safe recovery. */
  onRecoveryReset?: () => void;
  /**
   * Brief visual entrance floor (ms from mount) when initialization finishes instantaneously.
   * Bypassed automatically when `prefers-reduced-motion: reduce` is enabled.
   */
  minEntranceMs?: number;
  /** Safety timeout (ms) before switching from loading to recovery controls so users never get stuck. */
  maxTimeoutMs?: number;
  /** Crossfade duration (ms) on dismissal. */
  exitDurationMs?: number;
  /** Override reduced-motion detection cleanly in automated tests. */
  reducedMotion?: boolean;
}

/**
 * GAWStartupScreen ("THE GAW CONNECTION"):
 * Signature cold-startup overlay driven by genuine initialization readiness,
 * theme-synchronized pre-hydration via CSS variables, reduced-motion safe, and
 * protected against failed assets, chunk errors, and stuck timeouts.
 */
export function GAWStartupScreen({
  essentialReady,
  initError = null,
  onComplete,
  onRetry,
  onRecoveryReset,
  minEntranceMs = 640,
  maxTimeoutMs = 5000,
  exitDurationMs = 280,
  reducedMotion: reducedMotionProp,
}: GAWStartupScreenProps) {
  const i18n = useI18n();
  const { tx } = i18n;
  const mountTimeRef = useRef(Date.now());
  const retryCountRef = useRef(0);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);

  const [phase, setPhase] = useState<ScreenPhase>("entering");
  const [capturedError, setCapturedError] = useState<string | null>(null);
  const [reduced, setReduced] = useState(Boolean(reducedMotionProp));
  const [hadCriticalAssetFailure, setHadCriticalAssetFailure] = useState(false);

  const activeError = initError ?? capturedError;

  // Move focus cleanly to the recovery CTA only when an error/timeout recovery dialog appears
  useEffect(() => {
    if (phase === "error" || phase === "timeout") {
      retryButtonRef.current?.focus();
    }
  }, [phase]);

  // Sync reduced-motion preference after mount so SSR HTML matches initial hydration output
  useEffect(() => {
    if (typeof reducedMotionProp === "boolean") {
      setReduced(reducedMotionProp);
      return;
    }
    setReduced(prefersReducedMotion());
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    return undefined;
  }, [reducedMotionProp]);

  // Listen for critical chunk / stylesheet load errors during startup
  useEffect(() => {
    if (typeof window === "undefined" || phase === "exiting") return;

    const handlePreloadError = () => {
      setHadCriticalAssetFailure(true);
      setCapturedError("Unable to load a required application resource.");
    };

    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "SCRIPT") {
        setHadCriticalAssetFailure(true);
        setCapturedError("A required application script failed to load.");
      } else if (tag === "LINK" && target.getAttribute("rel") === "stylesheet") {
        setHadCriticalAssetFailure(true);
        setCapturedError("Application styles failed to finish loading.");
      }
    };

    window.addEventListener("vite:preloadError", handlePreloadError);
    window.addEventListener("error", handleResourceError, true);
    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
      window.removeEventListener("error", handleResourceError, true);
    };
  }, [phase]);

  // Transition cleanly to error state whenever a critical startup error appears
  useEffect(() => {
    if (activeError && phase === "entering") {
      setPhase("error");
    }
  }, [activeError, phase]);

  // Failsafe timeout: guarantee the user is never trapped on the loading screen
  useEffect(() => {
    if (phase !== "entering" || essentialReady || activeError) return;
    const timer = window.setTimeout(() => {
      setPhase((current) => (current === "entering" ? "timeout" : current));
    }, maxTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [phase, essentialReady, activeError, maxTimeoutMs]);

  // Genuine initialization completion + brief non-blocking entrance reveal (stage 1: enter -> exit)
  useEffect(() => {
    if (!essentialReady || activeError || phase !== "entering") return;

    const elapsed = Date.now() - mountTimeRef.current;
    const holdRemaining = reduced ? 0 : Math.max(0, minEntranceMs - elapsed);

    if (holdRemaining <= 0) {
      setPhase("exiting");
      return undefined;
    }

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, holdRemaining);

    return () => {
      window.clearTimeout(exitTimer);
    };
  }, [essentialReady, activeError, phase, reduced, minEntranceMs]);

  // Stage 2: once exiting (with pointer-events already released), finish fade and unmount once
  useEffect(() => {
    if (phase !== "exiting") return undefined;

    if (reduced || exitDurationMs <= 0) {
      const doneTimer = window.setTimeout(() => {
        onComplete();
      }, 0);
      return () => window.clearTimeout(doneTimer);
    }

    const finishTimer = window.setTimeout(() => {
      onComplete();
    }, exitDurationMs);

    return () => {
      window.clearTimeout(finishTimer);
    };
  }, [phase, reduced, exitDurationMs, onComplete]);

  const handleRetry = useCallback(() => {
    retryCountRef.current += 1;
    setCapturedError(null);
    mountTimeRef.current = Date.now();
    if (hadCriticalAssetFailure && typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    setPhase("entering");
    onRetry?.();
  }, [hadCriticalAssetFailure, onRetry]);

  const handleResetAndRecover = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore restricted storage */
    }
    onRecoveryReset?.();
    onComplete();
  }, [onComplete, onRecoveryReset]);

  const handleContinueAnyway = useCallback(() => {
    setPhase("exiting");
    onComplete();
  }, [onComplete]);

  const isExiting = phase === "exiting";
  const isFailureUI = phase === "error" || phase === "timeout";

  // SSR + frame 0 safe status text; switches cleanly to saved locale once i18n restores
  const liveStatusText =
    phase === "error"
      ? tx(
          "Startup encountered an issue.",
          "Nagkaroon ng problema sa pagsisimula ng GAW.",
          "Naay problema sa pagsugod sa GAW.",
        )
      : phase === "timeout"
        ? tx(
            "Startup is taking longer than expected.",
            "Mas matagal ang pagbukas kaysa karaniwan.",
            "Mas dugay ang pagbukas kaysa kasagaran.",
          )
        : i18n.ready
          ? tx(
              "Connecting local work and opportunities…",
              "Kumokonekta sa trabaho at serbisyo sa malapit…",
              "Nagkonekta sa duol nga trabaho ug serbisyo…",
            )
          : "Connecting local work and opportunities…";

  return (
    <div
      data-testid="gaw-startup-screen"
      data-phase={phase}
      aria-hidden={isExiting || undefined}
      style={{
        transitionDuration: reduced ? "0ms" : `${exitDurationMs}ms`,
      }}
      className={cn(
        "fixed inset-0 z-50 flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-5 py-8",
        "bg-[#F7F9F5] text-[#172B27] dark:bg-[#0D1512] dark:text-[#F3F7F4]",
        "transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        isExiting ? "pointer-events-none scale-[1.012] opacity-0" : "opacity-100",
      )}
    >
      {/* Stage A — Restrained deep forest/sage radial atmosphere (zero muddy brown tones) */}
      <div
        aria-hidden="true"
        className={cn(
          "gaw-startup-aura pointer-events-none absolute inset-0",
          "bg-[radial-gradient(64%_48%_at_50%_42%,rgba(14,112,72,0.085)_0%,rgba(247,249,245,0)_76%)]",
          "dark:bg-[radial-gradient(64%_48%_at_50%_42%,rgba(18,60,57,0.62)_0%,rgba(67,196,134,0.07)_34%,rgba(13,21,18,0)_76%)]",
        )}
      />

      {!isFailureUI ? (
        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          {/* Stage B & C — Official G-arrow Emblem + Converging Davao Connection Motif */}
          <GAWConnectionMotif size="lg" />

          {/* Stage D — Clean GAW Wordmark + Tagline (without duplicating "Grab a Work") */}
          <div className="mt-4 flex flex-col items-center sm:mt-5">
            <p className="gaw-startup-wordmark text-[2.125rem] font-extrabold leading-none tracking-[-0.04em] text-[#172B27] dark:text-[#F3F7F4] sm:text-[2.5rem] md:text-[2.75rem]">
              GAW
            </p>

            <span
              aria-hidden="true"
              className="gaw-startup-bridge mt-3 h-[2px] w-11 rounded-full bg-gradient-to-r from-[#0E7048] via-[#43C486] to-[#F4B544]"
            />

            <p className="gaw-startup-tagline mt-3 max-w-xs text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#0E7048] dark:text-[#F4B544] sm:max-w-sm sm:text-[0.8125rem]">
              Local Work. Nearby Opportunities.
            </p>
          </div>

          {/* Indeterminate activity hairline (never displays fake percentages) */}
          <div className="gaw-startup-status mt-7 flex flex-col items-center gap-2.5 sm:mt-8">
            <div
              aria-hidden="true"
              className="h-[2px] w-24 overflow-hidden rounded-full bg-[#123C39]/14 dark:bg-[#34483A] sm:w-28"
            >
              <div className="gaw-startup-progress-bar h-full w-1/2 rounded-full bg-gradient-to-r from-[#0E7048] via-[#43C486] to-[#F4B544]" />
            </div>

            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="min-h-[1rem] text-[11px] font-medium tracking-[0.02em] text-[#61736C] dark:text-[#B5C8BC]"
            >
              {liveStatusText}
            </p>
          </div>
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="gaw-startup-recovery-title"
          aria-describedby="gaw-startup-recovery-desc"
          className={cn(
            "relative z-10 w-full max-w-sm rounded-3xl border p-6 text-center shadow-lift sm:p-7",
            "border-[#123C39]/15 bg-white text-[#172B27]",
            "dark:border-[#34483A] dark:bg-[#192820] dark:text-[#F3F7F4]",
          )}
        >
          <div className="mx-auto mb-4 flex justify-center">
            <GAWConnectionMotif size="md" showConnections={false} />
          </div>

          <span
            aria-hidden="true"
            className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#D99416]/35 bg-[#FDF3D7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6E4903] dark:border-[#F4B544]/35 dark:bg-[#F4B544]/12 dark:text-[#F4B544]"
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            {phase === "error"
              ? tx("Startup Issue", "Problema sa Pagbukas", "Problema sa Pagbukas")
              : tx("Slow Connection", "Mabagal na Koneksyon", "Hinay ang Koneksyon")}
          </span>

          <h2
            id="gaw-startup-recovery-title"
            className="text-lg font-extrabold tracking-tight text-[#172B27] dark:text-[#F3F7F4]"
          >
            {phase === "error"
              ? tx(
                  "Unable to finish starting GAW",
                  "Hindi nakumpleto ang pagbukas ng GAW",
                  "Wala mahuman ang pagbukas sa GAW",
                )
              : tx(
                  "Taking longer than expected",
                  "Mas matagal kaysa karaniwan",
                  "Mas dugay kaysa kasagaran",
                )}
          </h2>

          <p
            id="gaw-startup-recovery-desc"
            className="mt-2 text-xs leading-relaxed text-[#61736C] dark:text-[#B5C8BC]"
          >
            {activeError ??
              tx(
                "You can retry initialization, continue into the app, or reset saved demo state.",
                "Maaari mong subukan muli, magpatuloy sa app, o i-reset ang naka-save na demo state.",
                "Mahimo nimong sulayan pag-usab, mopadayon sa app, o i-reset ang naka-save nga demo state.",
              )}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button
              ref={retryButtonRef}
              type="button"
              size="lg"
              onClick={handleRetry}
              className={cn("h-11 w-full", FOCUS_RING)}
            >
              <RefreshCw className="size-4 shrink-0" />
              {tx("Try Again", "Subukan Muli", "Sulayi Pag-usab")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleContinueAnyway}
              className={cn("h-11 w-full", FOCUS_RING)}
            >
              {tx("Continue to GAW", "Magpatuloy sa GAW", "Padayon sa GAW")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetAndRecover}
              className={cn("mt-0.5 text-xs text-muted-foreground", FOCUS_RING)}
            >
              <RotateCcw className="size-3.5 shrink-0" />
              {tx(
                "Reset local cache & continue",
                "I-reset ang local cache at magpatuloy",
                "I-reset ang local cache ug mopadayon",
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
