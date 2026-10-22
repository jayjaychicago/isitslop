import { Suspense } from "react";
import { ClaimView } from "./ClaimView";

export const metadata = { title: "Claim · is it slop?" };

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>}>
      <ClaimView />
    </Suspense>
  );
}
