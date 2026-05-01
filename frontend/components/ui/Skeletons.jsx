'use client';

export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border)] animate-pulse">
      <div className="skeleton h-52 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="skeleton h-6 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="skeleton h-4 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedSkeleton() {
  return <div className="skeleton h-[520px] rounded-2xl" />;
}

export function HeroSkeleton() {
  return <div className="skeleton h-[75vh] rounded-none" />;
}

export function BlogPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-6">
      <div className="skeleton h-8 w-32 rounded-full" />
      <div className="skeleton h-14 w-full rounded" />
      <div className="skeleton h-10 w-3/4 rounded" />
      <div className="skeleton h-4 w-48 rounded" />
      <div className="skeleton h-[450px] w-full rounded-2xl mt-8" />
      <div className="space-y-3 mt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`skeleton h-4 rounded ${i % 5 === 4 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
