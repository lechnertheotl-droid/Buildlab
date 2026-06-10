// Skeleton.tsx — Ladezustand (DESIGN.md §4): paper-deep-Flächen mit
// „schimmer"-Glanz statt eines nackten „lädt …"-Texts. ScreenSkeleton liefert
// fertige Layout-Gerüste, die der späteren Seite ähneln (kein Layout-Sprung).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bl-schimmer rounded ${className}`} />;
}

export type SkeletonLayout = 'list' | 'detail' | 'two-col' | 'workspace';

export function ScreenSkeleton({ layout = 'list' }: { layout?: SkeletonLayout }) {
  return (
    <div
      role="status"
      aria-label="lädt"
      className={
        layout === 'workspace'
          ? 'mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8'
          : 'mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10'
      }
    >
      <span className="sr-only">lädt …</span>
      {layout !== 'workspace' && <Skeleton className="mb-6 h-9 w-2/5" />}
      {layout === 'list' && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {layout === 'detail' && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-36" />
          <Skeleton className="h-24" />
        </div>
      )}
      {layout === 'two-col' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}
      {layout === 'workspace' && (
        <div className="grid gap-6 md:grid-cols-[38fr_62fr]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-40" />
          </div>
          <Skeleton className="h-72 md:h-96" />
        </div>
      )}
    </div>
  );
}
