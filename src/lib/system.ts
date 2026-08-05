export interface SystemSnapshot {
  status: "operational";
  uptimeSeconds: number;
  timestamp: string;
  runtime: "nodejs" | "edge";
}

export function getSystemSnapshot(): SystemSnapshot {
  return {
    status: "operational",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    runtime: "nodejs",
  };
}
