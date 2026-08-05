export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl space-y-4">
        <div className="bg-muted h-3 w-32 animate-pulse rounded" />
        <div className="bg-muted h-10 w-full max-w-lg animate-pulse rounded" />
        <div className="bg-muted h-4 w-full animate-pulse rounded" />
        <div className="bg-muted h-4 w-4/5 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-56 w-full max-w-md animate-pulse rounded-xl" />
    </div>
  );
}
