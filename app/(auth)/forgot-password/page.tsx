"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { KeyRound, Mail, ArrowLeft, MailCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from "@/lib/validations/authSchemas";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormInput } from "@/components/auth/FormInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { ResendCountdown } from "@/components/auth/ResendCountdown";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, isLoading } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    const result = await requestPasswordReset(data.email);

    if (result.success) {
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } else {
      setError(result.error || "Failed to send reset email. Please try again.");
    }
  };

  const handleResend = async () => {
    if (submittedEmail) {
      await requestPasswordReset(submittedEmail);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-6">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* DICOM-style grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #00C2FF 1px, transparent 1px),
              linear-gradient(to bottom, #00C2FF 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0, 194, 255, 0.08) 0%, transparent 60%)",
          }}
        />

        {/* Concentric rings (lower opacity for background) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[400, 600, 800].map((size, i) => (
            <div
              key={size}
              className="absolute rounded-full border border-accent-cyan"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.04 - i * 0.01,
                animation: `spin ${40 + i * 10}s linear infinite${
                  i % 2 === 1 ? " reverse" : ""
                }`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px]">
        <AuthCard>
          {isSuccess ? (
            // Success State
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent-cyan/20 mx-auto mb-6 flex items-center justify-center">
                <MailCheck className="h-8 w-8 text-accent-cyan" />
              </div>
              <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold text-text-primary mb-2">
                Check Your Inbox
              </h2>
              <p className="text-text-secondary mb-4">
                {"We've sent a password reset link to:"}
              </p>
              <p className="font-mono text-accent-cyan mb-4">{submittedEmail}</p>
              <p className="text-sm text-text-secondary mb-6">
                The link expires in 15 minutes.
              </p>

              <ResendCountdown onResend={handleResend} />

              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-6 text-sm text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </motion.div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-accent-cyan/20 mx-auto mb-6 flex items-center justify-center">
                  <KeyRound className="h-8 w-8 text-accent-cyan" />
                </div>
                <h1 className="font-[family-name:var(--font-syne)] text-[28px] font-bold text-text-primary">
                  Reset Your Password
                </h1>
                <p className="text-text-secondary mt-2">
                  {"Enter your registered email and we'll send you a reset link."}
                </p>
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 bg-[rgba(255,107,107,0.1)] border-[#FF6B6B]/30 text-[#FF6B6B]"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <FormInput
                  label="Email Address"
                  type="email"
                  placeholder="your@email.com"
                  icon={Mail}
                  autoComplete="email"
                  error={errors.email?.message}
                  disabled={isLoading}
                  {...register("email")}
                />

                <LoadingButton type="submit" isLoading={isLoading} variant="cyan">
                  Send Reset Link
                </LoadingButton>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </AuthCard>
      </div>

      {/* CSS Keyframes for background animation */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
