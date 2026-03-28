"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  adminLoginSchema,
  AdminLoginFormData,
} from "@/lib/validations/authSchemas";
import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormInput } from "@/components/auth/FormInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { SecurityBanner } from "@/components/auth/SecurityBanner";
import { LockoutMessage } from "@/components/auth/LockoutMessage";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isLoading, isLockedOut, lockoutEndTime } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setAuthError(null);

    const result = await login(data.email, data.password, "admin", data.totpCode);

    if (result.success) {
      setIsSuccess(true);
      toast.success("Access granted", {
        description: "Redirecting to admin dashboard...",
      });
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1500);
    } else {
      setAuthError(result.error || "Invalid credentials or authentication code.");
    }
  };

  return (
    <>
      <AuthLeftPanel
        variant="admin"
        quote={`"With great access\ncomes complete\naccountability."`}
        quoteAttribution="// ALL ACTIONS ARE AUDITED"
      />

      {/* Right Panel */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#0D1424]">
        <div className="w-full max-w-[440px]">
          <SecurityBanner />

          {isLockedOut && lockoutEndTime ? (
            <LockoutMessage lockoutEndTime={lockoutEndTime} />
          ) : (
            <AuthCard variant="admin">
              {/* Header */}
              <div className="mb-8">
                <span className="font-mono text-xs text-[#FF6B6B] tracking-wider">
                  {"// ADMINISTRATOR ACCESS"}
                </span>
                <h1 className="font-[family-name:var(--font-syne)] text-[28px] font-bold text-text-primary mt-2">
                  Admin Portal
                </h1>
                <p className="text-text-secondary mt-1">
                  Authorized personnel only. Session will be logged.
                </p>
              </div>

              {/* Error Banner */}
              {authError && (
                <Alert
                  variant="destructive"
                  className="mb-6 bg-[rgba(255,107,107,0.1)] border-[#FF6B6B]/30 text-[#FF6B6B]"
                >
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <FormInput
                  label="Admin Email"
                  type="email"
                  placeholder="admin@medvision.ai"
                  icon={ShieldCheck}
                  autoComplete="email"
                  error={errors.email?.message}
                  disabled={isLoading || isSuccess}
                  {...register("email")}
                />

                <PasswordInput
                  label="Password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  disabled={isLoading || isSuccess}
                  {...register("password")}
                />

                <FormInput
                  label="Two-Factor Authentication Code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  icon={KeyRound}
                  autoComplete="one-time-code"
                  error={errors.totpCode?.message}
                  helperText="Enter the 6-digit code from your authenticator app"
                  disabled={isLoading || isSuccess}
                  {...register("totpCode")}
                />

                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  isSuccess={isSuccess}
                  variant="red"
                >
                  Access Admin Panel
                </LoadingButton>

                <p className="text-center text-sm text-text-secondary">
                  Not an admin?{" "}
                  <Link href="/login" className="text-text-secondary hover:text-text-primary hover:underline">
                    Student Login
                  </Link>
                </p>
              </form>
            </AuthCard>
          )}
        </div>
      </main>
    </>
  );
}
