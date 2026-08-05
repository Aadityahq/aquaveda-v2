import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        This part of AquaVeda has not been built yet.
      </h1>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        The route is reserved for a real module and will be implemented in a later milestone.
      </p>
      <Button asChild>
        <Link href="/">Back to the Foundation Slice</Link>
      </Button>
    </div>
  );
}
