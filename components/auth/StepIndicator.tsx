"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted
                      ? "bg-accent-green border-accent-green"
                      : isCurrent
                      ? "bg-accent-cyan border-accent-cyan"
                      : "bg-transparent border-[#1A2F4A]"
                  )}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-background" />
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-background" : "text-text-secondary"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    "mt-2 text-xs font-mono",
                    isCurrent || isCompleted
                      ? "text-text-primary"
                      : "text-text-secondary"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-0.5 bg-[#1A2F4A] relative">
                  <motion.div
                    className="absolute inset-0 bg-accent-cyan"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
