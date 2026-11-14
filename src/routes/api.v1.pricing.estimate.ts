import { createFileRoute } from "@tanstack/react-router";

/**
 * TanStack Start server API route exposing `POST /api/v1/pricing/estimate`.
 * Dynamically imports the server-only Gemini pricing module inside the POST handler
 * so server secrets (`GEMINI_API_KEY`) never enter client bundles.
 */
export const Route = createFileRoute("/api/v1/pricing/estimate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePricingEstimateRequest } = await import("@/lib/gaw/server/gemini-pricing");
        return handlePricingEstimateRequest(request);
      },
    },
  },
});
