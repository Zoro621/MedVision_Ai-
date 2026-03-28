"use client";

import { useState, useEffect, useCallback } from "react";

interface ResendCountdownProps {
  onResend: () => Promise<void>;
  cooldownSeconds?: number;
}

export function ResendCountdown({
  onResend,
  cooldownSeconds = 60,
}: ResendCountdownProps) {
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    try {
      await onResend();
      setCountdown(cooldownSeconds);
    } finally {
      setIsResending(false);
    }
  }, [countdown, isResending, onResend, cooldownSeconds]);

  return (
    <div className="text-center text-sm text-text-secondary">
      {"Didn't receive it? "}
      {countdown > 0 ? (
        <span className="text-text-secondary font-mono">
          Resend in {countdown}s
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-accent-cyan hover:underline disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Resend"}
        </button>
      )}
    </div>
  );
}
