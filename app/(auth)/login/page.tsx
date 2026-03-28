"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  studentLoginSchema,
  StudentLoginFormData,
} from "@/lib/validations/authSchemas";
import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormInput } from "@/components/auth/FormInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StudentLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: StudentLoginFormData) => {
    setAuthError(null);

    const result = await login(data.email, data.password, "student");

    if (result.success) {
      setIsSuccess(true);
      toast.success("Welcome back!", {
        description: "Redirecting to your dashboard...",
      });
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } else {
      setAuthError(result.error || "Invalid credentials. Please try again.");
    }
  };

  return (
    <>
      <AuthLeftPanel
        variant="student"
        quote={`"The difference between\na good radiologist and a\ngreat one is how deeply\nthey've trained their eye."`}
        quoteAttribution="— MedVision AI, built for residents"
      />

      {/* Right Panel */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#0D1424]">
        <div className="w-full max-w-[440px]">
          <AuthCard>
            {/* Header */}
            <div className="mb-8">
              <span className="font-mono text-xs text-text-secondary tracking-wider">
                {"// STUDENT ACCESS"}
              </span>
              <h1 className="font-[family-name:var(--font-syne)] text-[28px] font-bold text-text-primary mt-2">
                Welcome Back
              </h1>
              <p className="text-text-secondary mt-1">
                Sign in to continue your radiology journey.
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
                label="Email Address"
                type="email"
                placeholder="resident@hospital.edu"
                icon={Mail}
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

              {/* Remember me & Forgot password row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setValue("rememberMe", checked === true)
                    }
                    disabled={isLoading || isSuccess}
                    className="border-[#1A2F4A] data-[state=checked]:bg-accent-cyan data-[state=checked]:border-accent-cyan"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-text-secondary cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-accent-cyan hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <LoadingButton
                type="submit"
                isLoading={isLoading}
                isSuccess={isSuccess}
                variant="cyan"
              >
                Sign In
              </LoadingButton>

              <OAuthButtons disabled={isLoading || isSuccess} />

              <p className="text-center text-sm text-text-secondary">
                {"Don't have an account? "}
                <Link
                  href="/register"
                  className="text-accent-cyan hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </AuthCard>

          {/* Admin link below card */}
          <p className="text-center text-xs text-text-secondary font-mono mt-6">
            Are you an admin?{" "}
            <Link
              href="/admin/login"
              className="text-text-secondary hover:text-text-primary hover:underline"
            >
              Admin Login
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
