"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  isSuccess?: boolean;
  variant?: "cyan" | "red";
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      isLoading,
      isSuccess,
      variant = "cyan",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const gradients = {
      cyan: "bg-gradient-to-r from-[#00C2FF] to-[#0066FF]",
      red: "bg-gradient-to-r from-[#FF6B6B] to-[#FF4444]",
    };

    const glowColors = {
      cyan: "hover:shadow-[0_0_30px_rgba(0,194,255,0.5)]",
      red: "hover:shadow-[0_0_30px_rgba(255,107,107,0.5)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading || isSuccess}
        className={cn(
          "relative w-full h-12 rounded-lg font-[family-name:var(--font-syne)] font-medium text-background",
          "transition-all duration-300",
          gradients[variant],
          !disabled && !isLoading && glowColors[variant],
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isSuccess && "bg-accent-green",
          className
        )}
        {...props}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
            </motion.span>
          ) : isSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center"
            >
              <Check className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
