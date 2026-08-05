"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import type { SystemSnapshot } from "@/lib/system";

interface ApiEnvelope {
  success: boolean;
  data: SystemSnapshot | null;
  message: string;
}

export function FoundationRefreshButton({
  onRefreshed,
}: {
  onRefreshed: (snapshot: SystemSnapshot) => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const handleRefresh = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/system", { cache: "no-store" });
        const body = (await res.json()) as ApiEnvelope;

        if (!res.ok || !body.success || !body.data) {
          throw new Error(body.message || "System check failed");
        }

        onRefreshed(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
        {isPending ? "Checking..." : "Refresh"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
