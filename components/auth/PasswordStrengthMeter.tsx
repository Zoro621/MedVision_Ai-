"use client";

import { motion } from "motion/react";
import { calculatePasswordStrength } from "@/lib/validations/authSchemas";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  const { score, label, color } = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <motion.div
              key={segment}
              className="h-1.5 flex-1 rounded-full bg-[#1A2F4A]"
              initial={false}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: score >= segment ? "100%" : "0%",
                  backgroundColor: color,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </motion.div>
          ))}
        </div>
        <span className="text-xs font-mono" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
