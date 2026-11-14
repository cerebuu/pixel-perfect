import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { VerificationCenter } from "@/components/gaw/VerificationCenter";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verification Center — GAW" },
      {
        name: "description",
        content: "Submit basic identity verification and optional worker credentials on GAW.",
      },
      { property: "og:title", content: "Verification Center — GAW" },
      {
        property: "og:description",
        content: "Submit basic identity verification and optional worker credentials on GAW.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { mode } = useGaw();
  const { t, tx } = useI18n();
  const backTo = mode === "work" ? "/work" : "/hire";
  return (
    <AppLayout
      back={
        <BackButton
          to={backTo}
          label={tx("Back to Dashboard", "Bumalik sa Dashboard", "Balik sa Dashboard")}
        />
      }
      title={t("verify.pageTitle")}
    >
      <div className="mx-auto max-w-3xl">
        <VerificationCenter showRoleToggle />
      </div>
    </AppLayout>
  );
}
