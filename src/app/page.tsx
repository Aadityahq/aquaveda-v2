import { FoundationStatusCard } from "@/components/foundation/foundation-status-card";
import { getSystemSnapshot } from "@/lib/system";

export default function HomePage() {
  const initial = getSystemSnapshot();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl space-y-4">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Foundation Slice
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          AquaVeda is being rebuilt from first principles.
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed text-pretty">
          This is a reconstruction, not a port. The app shell, design system,
          and data loop on this page are what every later module gets built on
          top of.
        </p>
      </div>

      <FoundationStatusCard initial={initial} />
    </div>
  );
}
