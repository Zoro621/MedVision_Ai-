"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-text-secondary" />
      </div>
      <h3 className="text-text-primary font-semibold text-lg mb-2">{title}</h3>
      <p className="text-text-secondary text-sm max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          onClick={onAction}
          className="border-border-custom hover:border-accent-red/50"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
