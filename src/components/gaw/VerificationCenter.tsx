import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { REDUCED_MOTION_RESET, segmentedOptionClass, subtleLinkClass } from "./interactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/gaw/i18n";
import {
  canPerformProtectedAction,
  identityVerified,
  useGaw,
  type VerifDoc,
} from "@/lib/gaw/store";
import {
  CREDENTIAL_TYPES,
  formatBytes,
  ID_TYPES,
  MAX_FILE_MB,
  validateUpload,
  type CredentialKey,
  type VerifStatus,
} from "@/lib/gaw/verification";
import { cn } from "@/lib/utils";

export function VerifStatusPill({ status }: { status: VerifStatus }) {
  const { verifLabel } = useI18n();
  const styles: Record<VerifStatus, string> = {
    not_submitted: "bg-muted text-muted-foreground",
    unverified: "bg-muted text-muted-foreground",
    pending: "bg-status-pending-bg text-status-pending",
    verified: "bg-status-confirmed-bg text-status-confirmed",
    rejected: "bg-status-declined-bg text-status-declined",
    resubmission_required: "bg-gold-soft text-gold-foreground",
  };
  const icons: Record<VerifStatus, typeof Clock> = {
    not_submitted: FileText,
    unverified: FileText,
    pending: Clock,
    verified: CheckCircle2,
    rejected: XCircle,
    resubmission_required: RefreshCw,
  };
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        styles[status],
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {verifLabel(status)}
    </span>
  );
}

interface PendingUpload {
  fileName: string;
  fileSize: number;
  fileType: string;
  isSample: boolean;
  previewUrl: string | null;
}

export interface VerificationGuardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "hire" | "work";
  /** Context label describing the preserved draft (e.g. worker name or job title) */
  actionContext?: string | undefined;
  /** Invoked when the user is verified and clicks Continue to complete their protected action */
  onVerifiedContinue?: (() => void) | undefined;
}

/**
 * Reusable Action-Based Identity Verification Modal.
 * Triggered only when a user attempts a protected marketplace transaction
 * (applying for a job or submitting a hiring request) while preserving their draft state.
 */
export function VerificationGuardModal({
  open,
  onOpenChange,
  role,
  actionContext,
  onVerifiedContinue,
}: VerificationGuardModalProps) {
  const { account, verification, submitVerification, setVerificationStatus } = useGaw();
  const { t, tx } = useI18n();
  const guard = canPerformProtectedAction(verification);
  const identityDoc = verification.identity;

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState<string>(ID_TYPES[0]);
  const [stagedIdentity, setStagedIdentity] = useState<PendingUpload | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setShowUploadForm(false);
      setIdentityError(null);
    } else if (guard.status === "rejected" || guard.status === "resubmission_required") {
      setShowUploadForm(true);
    }
  }, [open, guard.status]);

  const handleIdentityFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setIdentityError(err);
      return;
    }
    setIdentityError(null);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedIdentity({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSample: false,
      previewUrl,
    });
  };

  const handleUseSampleIdentity = () => {
    setIdentityError(null);
    setStagedIdentity({
      fileName: `SAMPLE-${selectedIdType.replace(/[^a-zA-Z0-9]/g, "_")}-DEMO.png`,
      fileSize: 284 * 1024,
      fileType: "image/png",
      isSample: true,
      previewUrl: null,
    });
  };

  const handleSubmitIdentity = () => {
    if (!stagedIdentity) {
      setIdentityError(
        tx(
          "Select a file or choose a clearly labeled sample document first.",
          "Pumili muna ng file o gumamit ng sample document.",
          "Pagpili una og file o gamita ang sample document.",
        ),
      );
      return;
    }
    submitVerification("identity", {
      kind: selectedIdType,
      fileName: stagedIdentity.fileName,
      fileSize: stagedIdentity.fileSize,
      fileType: stagedIdentity.fileType,
      isSample: stagedIdentity.isSample,
    });
    setStagedIdentity(null);
    setShowUploadForm(false);
    toast.success(
      tx(
        "Identity document submitted for review (Status: Pending Review)",
        "Naisumite ang ID para i-review (Status: Nakabinbin)",
        "Na-submit na ang ID alang sa review (Status: Naghulat og review)",
      ),
    );
  };

  const displayStatus: VerifStatus = guard.status === "not_submitted" ? "unverified" : guard.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" aria-hidden /> {t("verify.gateModalTitle")}
            </span>
            <VerifStatusPill status={displayStatus} />
          </div>
          <DialogTitle className="mt-3 text-2xl font-extrabold tracking-tight">
            {tx(
              "Verify Your Identity to Continue",
              "I-verify ang Iyong Identity para Magpatuloy",
              "I-verify ang Imong Identity aron Makapadayon",
            )}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {role === "work" ? t("verify.gateWorkerDesc") : t("verify.gateEmployerDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Draft preservation notice */}
          {actionContext && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border bg-muted/50 px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {tx("Protected action:", "Pinoprotektahang aksyon:", "Giprotektahan nga aksyon:")}{" "}
                <strong className="text-foreground">{actionContext}</strong>
              </span>
              <span className="shrink-0 font-semibold text-primary">
                {tx("Draft saved", "Naka-save ang draft", "Na-save ang draft")}
              </span>
            </div>
          )}

          {/* Rejected / Resubmission Required Alert Banner */}
          {(guard.status === "rejected" || guard.status === "resubmission_required") &&
            guard.reason && (
              <div
                role="alert"
                className={cn(
                  "rounded-2xl border p-4 text-xs leading-relaxed",
                  guard.status === "rejected"
                    ? "border-status-declined/35 bg-status-declined-bg text-status-declined"
                    : "border-gold/40 bg-gold-soft text-gold-foreground",
                )}
              >
                <p className="font-bold">
                  {guard.status === "rejected"
                    ? tx(
                        "Previous verification was rejected",
                        "Hindi naaprubahan ang nakaraang verification",
                        "Wala maaprobahi ang miaging verification",
                      )
                    : tx(
                        "Resubmission required",
                        "Kailangang mag-submit muli",
                        "Kinahanglan i-submit pag-usab",
                      )}
                </p>
                <p className="mt-1">{guard.reason}</p>
              </div>
            )}

          {/* Verified State */}
          {guard.allowed && (
            <div className="space-y-4 rounded-2xl border border-status-confirmed/30 bg-status-confirmed-bg p-4 text-sm">
              <div className="flex items-center gap-2.5 font-bold text-status-confirmed">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                <span>
                  {tx(
                    "Your identity is verified and approved!",
                    "Verified at aprubado na ang iyong identity!",
                    "Verified ug aprubado na ang imong identity!",
                  )}
                </span>
              </div>
              <p className="text-xs text-foreground/85">
                {role === "work"
                  ? tx(
                      "You can now complete your job application immediately with all your details preserved.",
                      "Maaari mo nang ituloy ang iyong job application agad nang naka-save ang lahat ng detalye.",
                      "Mahimo na nimong ipadayon dayon ang imong job application nga na-save na ang tanang detalye.",
                    )
                  : tx(
                      "You can now complete your booking request immediately with all your details preserved.",
                      "Maaari mo nang ituloy ang iyong booking request agad nang naka-save ang lahat ng detalye.",
                      "Mahimo na nimong ipadayon dayon ang imong booking request nga na-save na ang tanang detalye.",
                    )}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    onVerifiedContinue?.();
                  }}
                >
                  {tx("Continue & Submit", "Magpatuloy at I-submit", "Padayon ug I-submit")}{" "}
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}

          {/* Pending State */}
          {guard.isPending && identityDoc && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-status-pending-bg text-status-pending">
                    <Clock className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {tx(
                        "Verification Pending Review",
                        "Nakabinbin para sa Review",
                        "Naghulat sa Review",
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tx("Submitted ID:", "Isinumiteng ID:", "Gi-submit nga ID:")}{" "}
                      <strong>{identityDoc.kind}</strong> ({identityDoc.fileName})
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {role === "work"
                        ? tx(
                            "Uploading a document does not automatically approve your account. An authorized reviewer must verify your ID before you can submit job applications.",
                            "Hindi awtomatikong naaaprubahan ang account pagka-upload. Kailangan munang i-verify ng authorized reviewer ang ID bago makapag-apply sa trabaho.",
                            "Dili awtomatikong maaprobahan ang account inig upload. Kinahanglan una i-verify sa authorized reviewer ang ID sa dili pa maka-apply og trabaho.",
                          )
                        : tx(
                            "Uploading a document does not automatically approve your account. An authorized reviewer must verify your ID before you can submit hiring requests.",
                            "Hindi awtomatikong naaaprubahan ang account pagka-upload. Kailangan munang i-verify ng authorized reviewer ang ID bago makapag-book ng worker.",
                            "Dili awtomatikong maaprobahan ang account inig upload. Kinahanglan una i-verify sa authorized reviewer ang ID sa dili pa maka-book og worker.",
                          )}
                    </p>
                  </div>
                </div>

                {/* Prototype Reviewer Simulation Controls */}
                <div className="mt-4 rounded-xl border border-dashed bg-card p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {tx(
                      "Authorized Review Simulation (Prototype Demo)",
                      "Authorized Review Simulation (Prototype Demo)",
                      "Authorized Review Simulation (Prototype Demo)",
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setVerificationStatus("identity", "verified");
                        toast.success(
                          tx(
                            "Identity verified! You can now continue your action.",
                            "Na-verify na ang identity! Maaari ka nang magpatuloy.",
                            "Na-verify na ang identity! Makapadayon na ka karon.",
                          ),
                        );
                      }}
                    >
                      <CheckCircle2 className="size-3.5" /> {t("verify.instantVerifyDemoBtn")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVerificationStatus("identity", "resubmission_required");
                        setShowUploadForm(true);
                        toast(
                          tx(
                            "Status updated: Resubmission required",
                            "Na-update ang status: Kailangan mag-submit muli",
                            "Na-update ang status: Kinahanglan i-submit pag-usab",
                          ),
                        );
                      }}
                    >
                      <RefreshCw className="size-3.5" />{" "}
                      {tx(
                        "Request Resubmission",
                        "Humingi ng Resubmission",
                        "Hangyo og Resubmission",
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVerificationStatus("identity", "rejected");
                        setShowUploadForm(true);
                        toast(
                          tx(
                            "Status updated: Rejected",
                            "Na-update ang status: Tinanggihan",
                            "Na-update ang status: Gisalikway",
                          ),
                        );
                      }}
                    >
                      <XCircle className="size-3.5" /> {tx("Reject", "Tanggihan", "Isalikway")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {tx("Maybe Later", "Mamaya na lang", "Unya na lang")}
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/verify" onClick={() => onOpenChange(false)}>
                    {tx(
                      "Open Verification Center",
                      "Buksan ang Verification Center",
                      "Ablihi ang Verification Center",
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Unverified / Rejected / Resubmission Required State */}
          {guard.requiresSubmission && (
            <>
              {!showUploadForm ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-muted/35 p-4 text-xs leading-relaxed">
                    <p className="font-bold text-foreground">
                      {tx(
                        "What you need to verify:",
                        "Ano ang kailangan i-verify:",
                        "Unsa ang kinahanglan i-verify:",
                      )}
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                      <li>
                        {tx(
                          "Valid government-issued photo ID matching",
                          "Valid na government ID na tugma sa pangalan ng",
                          "Valid nga government ID nga tugma sa ngalan sa",
                        )}{" "}
                        <strong>
                          {account?.name ?? tx("your account", "iyong account", "imong account")}
                        </strong>
                      </li>
                      <li>
                        {tx(
                          "Optional Barangay Clearance or trade certificate when applicable",
                          "Opsyonal na Barangay Clearance o trade certificate kung mayroon",
                          "Opsyonal nga Barangay Clearance o trade certificate kon naa",
                        )}
                      </li>
                      <li>
                        {tx(
                          "Documents are kept private and accessible only to authorized reviewers",
                          "Pribado ang mga dokumento at authorized reviewers lang ang makakakita",
                          "Pribado ang mga dokumento ug authorized reviewers ra ang makakita",
                        )}
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      type="button"
                      size="lg"
                      className="flex-1"
                      onClick={() => setShowUploadForm(true)}
                    >
                      <ShieldCheck className="size-4" />{" "}
                      {tx("Verify Now", "I-verify Ngayon", "I-verify Karon")}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      {tx("Maybe Later", "Mamaya na lang", "Unya na lang")}
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    {tx(
                      "Prefer the full page?",
                      "Gusto mo ang buong pahina?",
                      "Mas ganahan sa tibuok pahina?",
                    )}{" "}
                    <Link
                      to="/verify"
                      onClick={() => onOpenChange(false)}
                      className={subtleLinkClass}
                    >
                      {tx(
                        "Go to Account Settings → Verification Center",
                        "Pumunta sa Account Settings → Verification Center",
                        "Adto sa Account Settings → Verification Center",
                      )}
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border bg-card p-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="modal-id-type-select"
                      className="block text-xs font-bold uppercase tracking-wide text-primary"
                    >
                      {tx(
                        "Select Government-Issued Photo ID",
                        "Pumili ng Government-Issued Photo ID",
                        "Pagpili og Government-Issued Photo ID",
                      )}
                    </label>
                    <select
                      id="modal-id-type-select"
                      className="field"
                      value={selectedIdType}
                      onChange={(e) => setSelectedIdType(e.target.value)}
                    >
                      {ID_TYPES.map((idOpt) => (
                        <option key={idOpt} value={idOpt}>
                          {idOpt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed bg-muted/40 p-3.5 text-center transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-primary hover:bg-hover-surface/65 hover:shadow-soft active:translate-y-0 active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        REDUCED_MOTION_RESET,
                      )}
                    >
                      <Upload className="size-4 text-primary" aria-hidden />
                      <span className="text-xs font-bold">
                        {tx(
                          "Upload ID Photo / PDF",
                          "Mag-upload ng ID / PDF",
                          "Pag-upload og ID / PDF",
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {tx(
                          `Max ${MAX_FILE_MB} MB`,
                          `Max ${MAX_FILE_MB} MB`,
                          `Max ${MAX_FILE_MB} MB`,
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleIdentityFile}
                        className="sr-only"
                        aria-label={tx(
                          "Upload government ID file",
                          "Mag-upload ng government ID file",
                          "Pag-upload og government ID file",
                        )}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleUseSampleIdentity}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border bg-gold-soft/60 p-3.5 text-center text-gold-foreground transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-gold hover:bg-gold-soft hover:shadow-soft active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        REDUCED_MOTION_RESET,
                      )}
                    >
                      <Sparkles className="size-4" aria-hidden />
                      <span className="text-xs font-bold">{t("verify.uploadSampleBtn")}</span>
                      <span className="text-[11px] opacity-85">
                        {tx(
                          `Safe sample ${selectedIdType.split(" ")[0]}`,
                          `Ligtas na sample ${selectedIdType.split(" ")[0]}`,
                          `Luwas nga sample ${selectedIdType.split(" ")[0]}`,
                        )}
                      </span>
                    </button>
                  </div>

                  {identityError && (
                    <p role="alert" className="text-xs font-semibold text-destructive">
                      {identityError}
                    </p>
                  )}

                  {stagedIdentity && (
                    <div className="rounded-xl border bg-muted/50 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{stagedIdentity.fileName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedIdType} · {formatBytes(stagedIdentity.fileSize)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setStagedIdentity(null)}
                        >
                          {t("common.clear")}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <Button type="button" className="flex-1" onClick={handleSubmitIdentity}>
                      {guard.status === "rejected" || guard.status === "resubmission_required"
                        ? tx(
                            "Resubmit ID for Review",
                            "I-submit Muli ang ID",
                            "I-submit Pag-usab ang ID",
                          )
                        : t("verify.submitVerificationBtn")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      {tx("Maybe Later", "Mamaya na lang", "Unya na lang")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VerificationCenter({ showRoleToggle = true }: { showRoleToggle?: boolean }) {
  const gaw = useGaw();
  const {
    account,
    mode,
    verification,
    submitVerification,
    setVerificationStatus,
    removeVerification,
  } = gaw;
  const { t, tx, verifNext } = useI18n();
  const [roleView, setRoleView] = useState<"hire" | "work">(mode ?? "work");
  const [selectedIdType, setSelectedIdType] = useState<string>(ID_TYPES[0]);
  const [stagedIdentity, setStagedIdentity] = useState<PendingUpload | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [credErrors, setCredErrors] = useState<Partial<Record<CredentialKey, string>>>({});
  const [stagedCreds, setStagedCreds] = useState<Partial<Record<CredentialKey, PendingUpload>>>({});

  const identityDoc: VerifDoc | null = verification.identity;
  const identityStatus: VerifStatus = identityDoc?.status ?? "not_submitted";

  const handleIdentityFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setIdentityError(err);
      return;
    }
    setIdentityError(null);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedIdentity({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSample: false,
      previewUrl,
    });
  };

  const handleUseSampleIdentity = () => {
    setIdentityError(null);
    setStagedIdentity({
      fileName: `SAMPLE-${selectedIdType.replace(/[^a-zA-Z0-9]/g, "_")}-DEMO.png`,
      fileSize: 284 * 1024,
      fileType: "image/png",
      isSample: true,
      previewUrl: null,
    });
  };

  const handleSubmitIdentity = () => {
    if (!stagedIdentity) {
      setIdentityError(
        tx(
          "Select a file or choose a clearly labeled sample document first.",
          "Pumili muna ng file o gumamit ng sample document.",
          "Pagpili una og file o gamita ang sample document.",
        ),
      );
      return;
    }
    submitVerification("identity", {
      kind: selectedIdType,
      fileName: stagedIdentity.fileName,
      fileSize: stagedIdentity.fileSize,
      fileType: stagedIdentity.fileType,
      isSample: stagedIdentity.isSample,
    });
    setStagedIdentity(null);
    toast.success(
      tx(
        "Identity document submitted for review (Status: Pending Review)",
        "Naisumite ang ID para i-review (Status: Nakabinbin)",
        "Na-submit na ang ID alang sa review (Status: Naghulat og review)",
      ),
    );
  };

  const handleCredFile = (key: CredentialKey, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setCredErrors((s) => ({ ...s, [key]: err }));
      return;
    }
    setCredErrors((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedCreds((s) => ({
      ...s,
      [key]: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isSample: false,
        previewUrl,
      },
    }));
  };

  const handleUseSampleCred = (key: CredentialKey, label: string) => {
    setCredErrors((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    setStagedCreds((s) => ({
      ...s,
      [key]: {
        fileName: `SAMPLE-${key.toUpperCase()}-CREDENTIAL-DEMO.pdf`,
        fileSize: 196 * 1024,
        fileType: "application/pdf",
        isSample: true,
        previewUrl: null,
      },
    }));
    toast(
      tx(
        `Sample ${label.split("/")[0]?.trim()} staged — click Submit to send for review`,
        `Nakahanda ang sample ${label.split("/")[0]?.trim()} — i-click ang I-submit para ma-review`,
        `Andam na ang sample ${label.split("/")[0]?.trim()} — i-click ang I-submit aron ma-review`,
      ),
    );
  };

  const handleSubmitCred = (key: CredentialKey, label: string) => {
    const staged = stagedCreds[key];
    if (!staged) {
      setCredErrors((s) => ({
        ...s,
        [key]: tx(
          "Upload a file or select the sample document first.",
          "Mag-upload muna ng file o piliin ang sample document.",
          "Pag-upload una og file o pilia ang sample document.",
        ),
      }));
      return;
    }
    submitVerification(key, {
      kind: label,
      fileName: staged.fileName,
      fileSize: staged.fileSize,
      fileType: staged.fileType,
      isSample: staged.isSample,
    });
    setStagedCreds((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    toast.success(
      tx(
        `${label.split("/")[0]?.trim()} submitted for review`,
        `Naisumite ang ${label.split("/")[0]?.trim()} para i-review`,
        `Na-submit ang ${label.split("/")[0]?.trim()} alang sa review`,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* Purpose & Privacy Banner */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <ShieldCheck className="size-4" aria-hidden />{" "}
              {tx(
                "GAW Trust & Verification Center",
                "GAW Trust at Verification Center",
                "GAW Trust ug Verification Center",
              )}
            </span>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              {tx(
                "Role-aware verification for safer local hiring",
                "Pag-verify na angkop sa papel para sa mas ligtas na pag-hire",
                "Pag-verify nga haom sa papel alang sa mas luwas nga pag-hire",
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tx(
                "Verification helps Davao City residents and workers know they are dealing with real people. Submitting an ID places it in Pending Review — a Verified badge only appears after review is approved.",
                "Tinutulungan ng verification ang mga taga-Davao at manggagawa na makasigurong totoong tao ang kausap. Mapupunta muna ito sa Nakabinbin — lalabas lang ang Verified badge kapag aprubado na.",
                "Makatabang ang verification sa mga taga-Davao ug trabahante nga makasiguro nga tinuod nga tawo ang kaistorya. Moadto una kini sa Naghulat — mogawas ra ang Verified badge kon aprubado na.",
              )}
            </p>
          </div>
          <div className="shrink-0">
            <VerifStatusPill status={identityStatus} />
          </div>
        </div>

        {/* Account Summary (Never duplicates inputs; reuses existing account details) */}
        {account && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3 text-xs">
            <div>
              <span className="font-bold text-foreground">{account.name}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{account.email}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{account.mobile}</span>
            </div>
            {identityVerified(verification) && (
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                {tx("Identity Verified", "Verified ang Identity", "Verified ang Identity")}
              </span>
            )}
          </div>
        )}

        {/* Prototype Privacy & Security Disclaimer */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-secondary/60 p-3.5 text-xs text-secondary-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-bold">
              {tx(
                "Prototype Privacy Protection",
                "Proteksyon sa Privacy ng Prototype",
                "Proteksyon sa Privacy sa Prototype",
              )}
            </p>
            <p className="mt-0.5">
              {tx(
                "Because this is a hackathon prototype without encrypted government-ID storage infrastructure, do not upload sensitive real IDs. Only file metadata is stored locally in your browser, or you can use the one-click Sample Document (Demo) buttons below.",
                "Dahil hackathon prototype ito at walang naka-encrypt na storage para sa ID, huwag mag-upload ng totoong sensitibong ID. Metadata lang ng file ang naka-save sa browser, o gamitin ang mga Sample Document (Demo) button sa ibaba.",
                "Tungod kay hackathon prototype kini ug walay naka-encrypt nga storage para sa ID, ayaw pag-upload og tinuod nga sensitibong ID. Metadata ra sa file ang naka-save sa browser, o gamita ang mga Sample Document (Demo) button sa ubos.",
              )}
            </p>
          </div>
        </div>

        {showRoleToggle && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {tx(
                "Viewing requirements for:",
                "Tinitingnang mga kinakailangan para sa:",
                "Gitan-aw nga mga kinahanglanon alang sa:",
              )}
            </p>
            <div className="inline-flex rounded-full border border-border/60 bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                aria-pressed={roleView === "work"}
                onClick={() => setRoleView("work")}
                className={segmentedOptionClass(
                  roleView === "work",
                  "card",
                  "rounded-full px-3.5 py-1.5",
                )}
              >
                {tx("Worker Verification", "Verification ng Worker", "Verification sa Worker")}
              </button>
              <button
                type="button"
                aria-pressed={roleView === "hire"}
                onClick={() => setRoleView("hire")}
                className={segmentedOptionClass(
                  roleView === "hire",
                  "card",
                  "rounded-full px-3.5 py-1.5",
                )}
              >
                {tx(
                  "Employer Verification",
                  "Verification ng Nag-book",
                  "Verification sa Nag-book",
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Step 1: Basic Identity Verification (Shared by Workers & Employers) */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {tx(
                "Basic Identity Verification",
                "Pangunahing Pag-verify ng Identity",
                "Panguna nga Pag-verify sa Identity",
              )}{" "}
              ·{" "}
              {roleView === "hire"
                ? tx("Household Employer", "May-ari ng Bahay / Nag-book", "Tagbalay / Nag-book")
                : tx("Worker & Employer", "Worker at Nag-book", "Worker ug Nag-book")}
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold">1. {t("verify.idSectionTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                `Used only to confirm your legal name matches your GAW account (${account?.name ?? "your profile"}).`,
                `Ginagamit lang ito para tiyaking tugma ang pangalan mo sa iyong GAW account (${account?.name ?? "iyong profile"}).`,
                `Gigamit ra kini aron masiguro nga tugma ang imong ngalan sa imong GAW account (${account?.name ?? "imong profile"}).`,
              )}
              {roleView === "hire" &&
                tx(
                  " Ordinary household employers only need basic identity verification — no trade credentials required.",
                  " Basic ID verification lang ang kailangan para sa mga household employer — hindi kailangan ng trade credentials.",
                  " Basic ID verification ra ang kinahanglan sa mga household employer — dili kinahanglan og trade credentials.",
                )}
            </p>
          </div>
          <VerifStatusPill status={identityStatus} />
        </div>

        {/* Next required action indicator */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs">
          <AlertCircle className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong>{tx("Next step:", "Susunod:", "Sunod:")}</strong> {verifNext(identityStatus)}
          </span>
        </div>

        {/* Rejection or Resubmission Reason Banner */}
        {identityDoc &&
          (identityDoc.status === "rejected" || identityDoc.status === "resubmission_required") &&
          identityDoc.reason && (
            <div
              role="alert"
              className={cn(
                "mt-4 rounded-2xl border p-4 text-xs leading-relaxed",
                identityDoc.status === "rejected"
                  ? "border-status-declined/35 bg-status-declined-bg text-status-declined"
                  : "border-gold/40 bg-gold-soft text-gold-foreground",
              )}
            >
              <p className="font-bold">
                {identityDoc.status === "rejected"
                  ? tx(
                      "Reason for rejection:",
                      "Dahilan ng pagtanggi:",
                      "Hinungdan sa pagkasalikway:",
                    )
                  : tx(
                      "Reason resubmission is required:",
                      "Dahilan kung bakit kailangang mag-submit muli:",
                      "Hinungdan ngano kinahanglan i-submit pag-usab:",
                    )}
              </p>
              <p className="mt-1">{identityDoc.reason}</p>
            </div>
          )}

        {/* Existing submitted Identity Document */}
        {identityDoc && (
          <div className="mt-4 space-y-3 rounded-2xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <FileCheck2 className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">{identityDoc.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {identityDoc.fileName} · {formatBytes(identityDoc.fileSize)}{" "}
                    {identityDoc.isSample && (
                      <span className="ml-1 rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                        SAMPLE DEMO DOC
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  removeVerification("identity");
                  toast(
                    tx(
                      "Removed submitted ID — you can upload a replacement.",
                      "Naalis ang isinumiteng ID — maaari kang mag-upload ng kapalit.",
                      "Gikuha ang na-submit nga ID — mahimo ka mag-upload og puli.",
                    ),
                  );
                }}
              >
                <Trash2 className="size-3.5" />{" "}
                {tx("Remove / Replace", "Alisin / Palitan", "Kuhaa / Ilisi")}
              </Button>
            </div>

            {/* Demo Reviewer Simulation Controls (only when pending) */}
            {identityDoc.status === "pending" && (
              <div className="rounded-xl border border-dashed bg-card p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {tx(
                    "Prototype Demo Controls — Simulate Trust & Safety review outcome:",
                    "Prototype Demo Controls — I-simulate ang resulta ng review:",
                    "Prototype Demo Controls — I-simulate ang resulta sa review:",
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setVerificationStatus("identity", "verified");
                      toast.success(
                        tx(
                          "Demo review: Identity marked as Verified!",
                          "Demo review: Minarkahang Verified ang Identity!",
                          "Demo review: Gimarkahang Verified ang Identity!",
                        ),
                      );
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />{" "}
                    {tx(
                      "Simulate: Approve (Verified)",
                      "I-simulate: Aprubahan (Verified)",
                      "I-simulate: Aprobahan (Verified)",
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerificationStatus("identity", "resubmission_required");
                      toast(
                        tx(
                          "Demo review: Resubmission requested",
                          "Demo review: Humiling ng resubmission",
                          "Demo review: Nangayo og resubmission",
                        ),
                      );
                    }}
                  >
                    <RefreshCw className="size-3.5" />{" "}
                    {tx(
                      "Simulate: Request Resubmission",
                      "I-simulate: Humingi ng Resubmission",
                      "I-simulate: Pangayo og Resubmission",
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerificationStatus("identity", "rejected");
                      toast(
                        tx(
                          "Demo review: Identity marked as Rejected",
                          "Demo review: Minarkahang Tinanggihan ang Identity",
                          "Demo review: Gimarkahang Gisalikway ang Identity",
                        ),
                      );
                    }}
                  >
                    <XCircle className="size-3.5" />{" "}
                    {tx("Simulate: Reject", "I-simulate: Tanggihan", "I-simulate: Isalikway")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload / Replace Form (shown when not submitted, rejected, resubmission_required, or staging a replacement) */}
        {(!identityDoc ||
          identityDoc.status === "rejected" ||
          identityDoc.status === "resubmission_required" ||
          stagedIdentity) && (
          <div className="mt-5 space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <label htmlFor="id-type-select" className="block text-sm font-semibold">
                {tx(
                  "Acceptable Government-Issued Photo ID",
                  "Tinatanggap na Government-Issued Photo ID",
                  "Madawat nga Government-Issued Photo ID",
                )}
              </label>
              <select
                id="id-type-select"
                className="field"
                value={selectedIdType}
                onChange={(e) => setSelectedIdType(e.target.value)}
              >
                {ID_TYPES.map((idOpt) => (
                  <option key={idOpt} value={idOpt}>
                    {idOpt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-muted/40 p-4 text-center transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-primary hover:bg-hover-surface/65 hover:shadow-soft active:translate-y-0 active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  REDUCED_MOTION_RESET,
                )}
              >
                <Upload className="size-5 text-primary" aria-hidden />
                <span className="text-xs font-bold">
                  {tx(
                    "Upload ID Photo or PDF",
                    "Mag-upload ng Larawan ng ID o PDF",
                    "Pag-upload og Hulagway sa ID o PDF",
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG, WEBP, PDF · Max {MAX_FILE_MB} MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleIdentityFile}
                  className="sr-only"
                  aria-label={tx(
                    "Upload government ID file",
                    "Mag-upload ng government ID file",
                    "Pag-upload og government ID file",
                  )}
                />
              </label>

              <button
                type="button"
                onClick={handleUseSampleIdentity}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border bg-gold-soft/60 p-4 text-center text-gold-foreground transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-gold hover:bg-gold-soft hover:shadow-soft active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  REDUCED_MOTION_RESET,
                )}
              >
                <Sparkles className="size-5" aria-hidden />
                <span className="text-xs font-bold">{t("verify.uploadSampleBtn")}</span>
                <span className="text-[11px] opacity-85">
                  {tx(
                    `Safe sample ${selectedIdType.split(" ")[0]} for testing`,
                    `Ligtas na sample ${selectedIdType.split(" ")[0]} para sa demo`,
                    `Luwas nga sample ${selectedIdType.split(" ")[0]} para sa demo`,
                  )}
                </span>
              </button>
            </div>

            {identityError && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {identityError}
              </p>
            )}

            {/* Staged Upload Preview */}
            {stagedIdentity && (
              <div className="rounded-2xl border bg-muted/50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {stagedIdentity.previewUrl ? (
                      <img
                        src={stagedIdentity.previewUrl}
                        alt={tx(
                          "Uploaded ID preview",
                          "Preview ng na-upload na ID",
                          "Preview sa na-upload nga ID",
                        )}
                        className="size-14 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="grid size-14 place-items-center rounded-xl border bg-card text-[10px] font-extrabold text-primary">
                        SAMPLE ID
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold">
                        {tx("Preview:", "Preview:", "Preview:")} {stagedIdentity.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedIdType} · {formatBytes(stagedIdentity.fileSize)}{" "}
                        {stagedIdentity.isSample &&
                          tx(
                            "· Demo sample document",
                            "· Demo sample document",
                            "· Demo sample document",
                          )}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setStagedIdentity(null)}
                  >
                    {t("common.clear")}
                  </Button>
                </div>

                <Button type="button" className="mt-3 w-full" onClick={handleSubmitIdentity}>
                  {identityDoc?.status === "rejected" ||
                  identityDoc?.status === "resubmission_required"
                    ? tx(
                        "Resubmit ID for Verification Review",
                        "I-submit Muli ang ID para I-review",
                        "I-submit Pag-usab ang ID alang sa Review",
                      )
                    : t("verify.submitVerificationBtn")}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Additional Worker Supporting Credentials (Shown in Worker View) */}
      {roleView === "work" && (
        <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {tx(
                "Optional Worker Supporting Credentials",
                "Opsyonal na Mga Kredensyal ng Worker",
                "Opsyonal nga Mga Kredensyal sa Worker",
              )}
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold">2. {t("verify.credSectionTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                "You can save and use your worker profile while verification is pending or unsubmitted. Barangay Clearance is not mandatory by default and does not verify trade skill or guarantee safety.",
                "Maaari mong i-save at gamitin ang worker profile kahit nakabinbin o hindi pa naisusumite ang verification. Hindi sapilitan ang Barangay Clearance at hindi ito garantiya ng kasanayan o kaligtasan.",
                "Mahimo nimong i-save ug gamiton ang worker profile bisan og naghulat o wala pa na-submit ang verification. Dili pugos ang Barangay Clearance ug dili kini garantiya sa kahanas o kaluwasan.",
              )}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {CREDENTIAL_TYPES.map((c) => {
              const doc = verification.credentials[c.key];
              const status: VerifStatus = doc?.status ?? "not_submitted";
              const staged = stagedCreds[c.key];
              const err = credErrors[c.key];
              const credLabel = c.label.includes("Barangay")
                ? tx("Barangay Clearance", "Barangay Clearance", "Barangay Clearance")
                : c.label.includes("TESDA")
                  ? tx(
                      "TESDA National Certificate (NC II / NC III)",
                      "TESDA National Certificate (NC II / NC III)",
                      "TESDA National Certificate (NC II / NC III)",
                    )
                  : c.label.includes("PRC")
                    ? tx("PRC / Trade License", "PRC / Trade License", "PRC / Trade License")
                    : c.label;
              const credHelp = c.label.includes("Barangay")
                ? tx(
                    "Optional residency clearance issued by your Davao City barangay hall.",
                    "Opsyonal na clearance ng paninirahan mula sa inyong barangay hall sa Davao.",
                    "Opsyonal nga clearance sa pinuy-anan gikan sa inyong barangay hall sa Davao.",
                  )
                : c.label.includes("TESDA")
                  ? tx(
                      "Optional TESDA NC certificate to showcase formal trade training.",
                      "Opsyonal na TESDA NC certificate para maipakita ang pormal na pagsasanay.",
                      "Opsyonal nga TESDA NC certificate aron mapakita ang pormal nga pagbansay.",
                    )
                  : tx(
                      "Optional trade or professional credential.",
                      "Opsyonal na propesyonal o trade credential.",
                      "Opsyonal nga propesyonal o trade credential.",
                    );

              return (
                <div key={c.key} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{credLabel}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">{credHelp}</p>
                    </div>
                    <VerifStatusPill status={status} />
                  </div>

                  {doc ? (
                    <div className="mt-3 space-y-2.5 rounded-xl bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          <strong>{doc.fileName}</strong> ({formatBytes(doc.fileSize)})
                          {doc.isSample && (
                            <span className="ml-1.5 rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                              SAMPLE
                            </span>
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            removeVerification(c.key);
                            toast(
                              tx(
                                `Removed ${credLabel}`,
                                `Naalis ang ${credLabel}`,
                                `Gikuha ang ${credLabel}`,
                              ),
                            );
                          }}
                        >
                          <Trash2 className="size-3.5" />{" "}
                          {tx("Remove / Replace", "Alisin / Palitan", "Kuhaa / Ilisi")}
                        </Button>
                      </div>

                      {doc.status === "pending" && (
                        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {tx("Demo review:", "Demo review:", "Demo review:")}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setVerificationStatus(c.key, "verified");
                              toast.success(
                                tx(
                                  `${credLabel.split("/")[0]?.trim()} marked as Verified`,
                                  `Minarkahang Verified ang ${credLabel.split("/")[0]?.trim()}`,
                                  `Gimarkahang Verified ang ${credLabel.split("/")[0]?.trim()}`,
                                ),
                              );
                            }}
                          >
                            {tx(
                              "Simulate: Approve",
                              "I-simulate: Aprubahan",
                              "I-simulate: Aprobahan",
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setVerificationStatus(c.key, "rejected");
                              toast(
                                tx(
                                  `${credLabel.split("/")[0]?.trim()} marked as Rejected`,
                                  `Minarkahang Tinanggihan ang ${credLabel.split("/")[0]?.trim()}`,
                                  `Gimarkahang Gisalikway ang ${credLabel.split("/")[0]?.trim()}`,
                                ),
                              );
                            }}
                          >
                            {tx(
                              "Simulate: Reject",
                              "I-simulate: Tanggihan",
                              "I-simulate: Isalikway",
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border bg-card px-3 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-hover-border hover:bg-hover-surface active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            REDUCED_MOTION_RESET,
                          )}
                        >
                          <Upload className="size-3.5 text-primary" aria-hidden />
                          {tx("Upload File", "Mag-upload ng File", "Pag-upload og File")}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => handleCredFile(c.key, e)}
                            className="sr-only"
                          />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseSampleCred(c.key, credLabel)}
                        >
                          <Sparkles className="size-3.5" />{" "}
                          {tx(
                            `Use Sample ${c.key.toUpperCase()} Doc`,
                            `Gumamit ng Sample ${c.key.toUpperCase()} Doc`,
                            `Gamita ang Sample ${c.key.toUpperCase()} Doc`,
                          )}
                        </Button>
                      </div>

                      {err && (
                        <p role="alert" className="text-xs font-medium text-destructive">
                          {err}
                        </p>
                      )}

                      {staged && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 p-2.5 text-xs">
                          <span>
                            {tx("Ready:", "Handa:", "Andam:")} <strong>{staged.fileName}</strong> (
                            {formatBytes(staged.fileSize)})
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSubmitCred(c.key, credLabel)}
                            >
                              {tx(
                                "Submit Credential",
                                "I-submit ang Kredensyal",
                                "I-submit ang Kredensyal",
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
