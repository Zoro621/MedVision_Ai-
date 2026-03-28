import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-surface-elevated border border-border-custom rounded-xl p-4 animate-pulse", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 bg-surface rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-surface rounded w-1/2" />
        <div className="h-3 bg-surface rounded w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonDeckCard() {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-xl overflow-hidden animate-pulse">
      <div className="h-2 bg-surface" />
      <div className="p-4 space-y-4">
        <div className="h-5 bg-surface rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-surface rounded w-1/2" />
          <div className="h-3 bg-surface rounded w-1/3" />
        </div>
        <div className="h-2 bg-surface rounded-full" />
        <div className="h-9 bg-surface rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonQuizCard() {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 animate-pulse">
      <div className="space-y-3">
        <div className="h-5 bg-surface rounded w-3/4" />
        <div className="h-4 bg-surface rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-surface rounded-full w-20" />
          <div className="h-6 bg-surface rounded-full w-24" />
        </div>
        <div className="h-9 bg-surface rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonChatMessage() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 bg-surface rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface rounded w-1/4" />
        <div className="h-20 bg-surface rounded-lg" />
      </div>
    </div>
  );
}
