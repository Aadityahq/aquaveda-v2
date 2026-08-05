"use client";

import * as React from "react";

import { FoundationRefreshButton } from "@/components/foundation/foundation-refresh-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SystemSnapshot } from "@/lib/system";

function formatUptime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function FoundationStatusCard({ initial }: { initial: SystemSnapshot }) {
  const [snapshot, setSnapshot] = React.useState(initial);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>System status</CardTitle>
          <CardDescription>Foundation slice status readout</CardDescription>
        </div>
        <Badge variant="verified">
          <span aria-hidden="true" className="bg-current size-1.5 rounded-full opacity-70" />
          {snapshot.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="font-mono grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Uptime</dt>
          <dd className="text-right">{formatUptime(snapshot.uptimeSeconds)}</dd>
          <dt className="text-muted-foreground">Runtime</dt>
          <dd className="text-right">{snapshot.runtime}</dd>
          <dt className="text-muted-foreground">Checked at</dt>
          <dd className="text-right">{new Date(snapshot.timestamp).toLocaleTimeString()}</dd>
        </dl>
        <div className="flex justify-end">
          <FoundationRefreshButton onRefreshed={setSnapshot} />
        </div>
      </CardContent>
    </Card>
  );
}
