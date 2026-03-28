"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  variant?: "student" | "admin";
}

export function AuthCard({
  children,
  className,
  variant = "student",
}: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "w-full max-w-[440px] rounded-2xl p-12",
        "bg-[#111D35] border border-[#1A2F4A]",
        "shadow-[0_0_40px_rgba(0,194,255,0.06)]",
        variant === "admin" &&
          "border-t-[3px] border-t-gradient-to-r from-[#FF6B6B] to-[#00C2FF]",
        className
      )}
      style={
        variant === "admin"
          ? {
              borderTopWidth: "3px",
              borderImage: "linear-gradient(to right, #FF6B6B, #00C2FF) 1",
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
