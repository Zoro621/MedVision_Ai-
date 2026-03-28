import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  className?: string;
}

const difficultyStyles = {
  Beginner: "bg-accent-green/20 text-accent-green",
  Intermediate: "bg-accent-amber/20 text-accent-amber",
  Advanced: "bg-accent-red/20 text-accent-red",
};

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono",
        difficultyStyles[difficulty],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {difficulty}
    </span>
  );
}
