import { cn } from "@/lib/utils";

interface TopicMasteryBadgeProps {
  mastery: number;
  className?: string;
}

export function TopicMasteryBadge({ mastery, className }: TopicMasteryBadgeProps) {
  const { label, color } = getMasteryLevel(mastery);

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono",
        color,
        className
      )}
    >
      {label}
    </span>
  );
}

function getMasteryLevel(mastery: number): { label: string; color: string } {
  if (mastery >= 80) {
    return { label: "Mastered", color: "bg-accent-green/20 text-accent-green" };
  }
  if (mastery >= 50) {
    return { label: "In Progress", color: "bg-accent-amber/20 text-accent-amber" };
  }
  return { label: "Needs Work", color: "bg-muted-blue/20 text-muted-blue" };
}
