import type React from 'react';
import { cn } from '@/lib/utils';

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-xl bg-stone-200 dark:bg-stone-700/70 skeleton-shimmer', className)} style={style} />;
}

export function LibrarySkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <Bone className="mx-auto h-9 w-48 rounded-lg" />
        <Bone className="mx-auto mt-3 h-5 w-64 rounded-lg" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <Bone className="h-11 flex-1 rounded-xl" />
        <Bone className="h-11 w-40 rounded-xl" />
        <Bone className="h-11 w-24 rounded-xl" />
      </div>
      <div className="mb-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bone key={i} className="h-11 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Bone className="mb-4 h-5 w-20" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-2 flex-1">
                <Bone className="h-6 w-32" />
                <Bone className="h-4 w-24" />
              </div>
              <Bone className="h-8 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
            <Bone className="h-10 w-full" />
            <Bone className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8">
        <Bone className="h-8 w-52" />
        <Bone className="mt-2 h-5 w-36" />
      </div>
      <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-6 w-24 rounded-full" />
          </div>
          <Bone className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-4 space-y-2">
            <Bone className="mx-auto h-5 w-5 rounded-full" />
            <Bone className="mx-auto h-7 w-12" />
            <Bone className="mx-auto h-4 w-20" />
          </div>
        ))}
      </div>
      <Bone className="mb-4 h-6 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Bone className="h-5 w-28" />
                <Bone className="h-4 w-20" />
              </div>
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <Bone className="mt-8 mb-4 h-6 w-36" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-4 space-y-2">
            <Bone className="mx-auto h-8 w-8 rounded-xl" />
            <Bone className="mx-auto h-4 w-16" />
            <Bone className="mx-auto h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrackerSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <Bone className="mx-auto h-14 w-14 rounded-2xl" />
        <Bone className="mx-auto mt-4 h-8 w-40" />
        <Bone className="mx-auto mt-2 h-5 w-56" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-4 space-y-2">
            <Bone className="mx-auto h-5 w-5 rounded-full" />
            <Bone className="mx-auto h-6 w-10" />
            <Bone className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-3">
        <Bone className="h-5 w-28" />
        <div className="flex items-end gap-2 h-20">
          {(() => {
            const widths = [75, 60, 85, 45, 70, 55, 80];
            return Array.from({ length: 7 }).map((_, i) => (
              <Bone key={i} className="flex-1 rounded-t-md" style={{ height: `${widths[i % widths.length]}%` }} />
            ));
          })()}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-2">
            <div className="flex justify-between">
              <Bone className="h-5 w-28" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <Bone className="h-4 w-40" />
            <Bone className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoachSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <Bone className="mx-auto h-14 w-14 rounded-2xl" />
        <Bone className="mx-auto mt-4 h-8 w-48" />
        <Bone className="mx-auto mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Bone className="h-16 w-3/4 rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-start">
          <Bone className="h-24 w-4/5 rounded-2xl rounded-br-md" />
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-stone-200 dark:border-stone-600 p-4">
        <Bone className="h-5 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PeptideDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <Bone className="mb-2 h-5 w-20" />
      <Bone className="h-9 w-48" />
      <Bone className="mt-1 h-5 w-32" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Bone className="h-7 w-16 rounded-full" />
        <Bone className="h-7 w-20 rounded-full" />
        <Bone className="h-7 w-24 rounded-full" />
      </div>
      <Bone className="mt-6 h-20 w-full rounded-2xl" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex border-b border-stone-100 dark:border-stone-800 py-3">
            <Bone className="h-5 w-28 shrink-0" />
            <Bone className="h-5 flex-1 ms-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="text-center mb-12">
        <Bone className="mx-auto h-9 w-40" />
        <Bone className="mx-auto mt-3 h-5 w-64" />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-600 p-8 space-y-4">
            <Bone className="h-7 w-28" />
            <Bone className="h-5 w-40" />
            <Bone className="h-12 w-32" />
            <div className="space-y-3 pt-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Bone className="h-4 w-4 rounded-full shrink-0" />
                  <Bone className="h-4 flex-1" />
                </div>
              ))}
            </div>
            <Bone className="h-12 w-full rounded-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalculatorSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <Bone className="mx-auto h-14 w-14 rounded-2xl" />
        <Bone className="mx-auto mt-4 h-8 w-44" />
        <Bone className="mx-auto mt-2 h-5 w-72" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Bone className="h-4 w-24" />
              <Bone className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center">
          <Bone className="h-64 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="mx-auto min-h-[80vh] max-w-4xl px-4 py-8 md:px-6 md:py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <Bone className="mx-auto h-8 w-48" />
        <Bone className="mx-auto mt-3 h-5 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
