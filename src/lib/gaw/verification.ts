export type VerifStatus = "not_submitted" | "pending" | "verified" | "rejected";

export const ID_TYPES = [
  "Philippine National ID (PhilSys)",
  "Passport",
  "Driver's License",
  "UMID",
  "Other government-issued photo ID",
] as const;

export const CREDENTIAL_TYPES = [
  {
    key: "barangay",
    label: "Barangay Clearance / proof of residency",
    help: "Optional. Shows where you live. It does not prove skill or guarantee safety.",
  },
  {
    key: "tesda",
    label: "TESDA National Certificate or skills certificate",
    help: "Optional. Helps residents see formal training for your trade.",
  },
  {
    key: "prc",
    label: "PRC license or professional credential",
    help: "Only needed if the law requires a license for the service you offer.",
  },
] as const;
export type CredentialKey = (typeof CREDENTIAL_TYPES)[number]["key"];

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILE_MB = 5;

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Use a JPG, PNG, WEBP or PDF file.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `File is too large. Maximum is ${MAX_FILE_MB} MB.`;
  if (file.size === 0) return "This file looks empty. Try another one.";
  return null;
}

export const VERIF_LABEL: Record<VerifStatus, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

export const VERIF_NEXT: Record<VerifStatus, string> = {
  not_submitted: "Choose an ID type and upload a clear photo.",
  pending: "Nothing to do. We'll review it (simulated in this demo).",
  verified: "You're verified. A badge now shows on your profile.",
  rejected: "Upload a clearer photo of the same ID, or use a different ID.",
};

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
