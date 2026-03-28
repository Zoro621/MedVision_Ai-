"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLeftPanelProps {
  variant?: "student" | "admin";
  quote: string;
  quoteAttribution?: string;
}

// Brain scan icon (consistent with landing page)
function BrainScanIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <path
        d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 12c0-1.5 1.5-2 3-2s3 1 3 2.5-1.5 2.5-3 2.5m0 0v2m0 3h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="22" r="1" fill="currentColor" />
    </svg>
  );
}

export function AuthLeftPanel({
  variant = "student",
  quote,
  quoteAttribution,
}: AuthLeftPanelProps) {
  const accentColor = variant === "admin" ? "#FF6B6B" : "#00C2FF";
  const pulseColor = variant === "admin" ? "#FF6B6B" : "#4EFFA0";

  return (
    <div className="hidden lg:flex relative w-[45%] bg-background overflow-hidden">
      {/* DICOM-style grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, ${accentColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radial glow from center */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Concentric rotating rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[300, 500, 700].map((size, i) => (
          <div
            key={size}
            className="absolute rounded-full border"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderColor: accentColor,
              opacity: 0.08 - i * 0.025,
              animation: `spin ${30 + i * 10}s linear infinite${
                i % 2 === 1 ? " reverse" : ""
              }`,
            }}
          />
        ))}
      </div>

      {/* ECG/Pulse line animation on left edge */}
      <div className="absolute left-4 top-0 bottom-0 w-[2px] overflow-hidden">
        <div
          className="absolute w-full h-4 rounded-full"
          style={{
            backgroundColor: pulseColor,
            boxShadow: `0 0 10px ${pulseColor}`,
            animation: "pulse-down 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Horizontal scan line sweep */}
      <div
        className="absolute left-0 right-0 h-[1px] opacity-30"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
          animation: "scan-sweep 6s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <BrainScanIcon
            className={cn(
              "h-10 w-10",
              variant === "admin" ? "text-[#FF6B6B]" : "text-accent-cyan"
            )}
          />
          <span
            className={cn(
              "font-[family-name:var(--font-syne)] text-2xl font-bold",
              variant === "admin" ? "text-[#FF6B6B]" : "text-accent-cyan"
            )}
          >
            MedVision AI
          </span>
        </Link>

        {/* Quote */}
        <div className="max-w-md">
          <blockquote className="font-[family-name:var(--font-syne)] text-2xl italic text-text-primary leading-relaxed whitespace-pre-line">
            {quote}
          </blockquote>
          {quoteAttribution && (
            <p
              className={cn(
                "mt-4 font-mono text-sm",
                variant === "admin" ? "text-[#FF6B6B]" : "text-text-secondary"
              )}
            >
              {quoteAttribution}
            </p>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex gap-4">
          {[
            { icon: "lock", label: "256-bit Encrypted" },
            { icon: "hospital", label: "Medical Grade" },
            { icon: "sparkle", label: "AI-Powered" },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1A2F4A] bg-[#080C14]/50"
            >
              <span className="text-xs opacity-60">
                {badge.icon === "lock" && "🔒"}
                {badge.icon === "hospital" && "🏥"}
                {badge.icon === "sparkle" && "✦"}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-down {
          0%,
          100% {
            top: -16px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes scan-sweep {
          0%,
          100% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
