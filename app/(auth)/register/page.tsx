"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Lock, LockKeyhole, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  registrationStep1Schema,
  registrationStep2Schema,
  registrationStep3Schema,
  RegistrationStep1FormData,
  RegistrationStep2FormData,
  RegistrationStep3FormData,
} from "@/lib/validations/authSchemas";
import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormInput } from "@/components/auth/FormInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Account" },
  { label: "Profile" },
  { label: "Complete" },
];

const INSTITUTION_TYPES = [
  "University / Medical School",
  "Teaching Hospital",
  "Residency Program",
  "Self-Study",
  "Other",
];

const TRAINING_LEVELS = [
  "1st Year Medical Student",
  "2nd Year Medical Student",
  "3rd Year Medical Student",
  "4th Year Medical Student",
  "Intern",
  "PGY-1 Resident",
  "PGY-2 Resident",
  "PGY-3 Resident",
  "Fellow",
  "Attending",
  "Other",
];

const RADIOLOGY_FOCUS_OPTIONS = [
  "Chest",
  "Neuro",
  "MSK",
  "Abdominal",
  "Cardiac",
  "Paediatric",
  "Interventional",
];

const REFERRAL_SOURCES = [
  "University recommendation",
  "Social media",
  "Colleague",
  "Search engine",
  "Conference",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Store data from all steps
  const [step1Data, setStep1Data] = useState<RegistrationStep1FormData | null>(null);
  const [step2Data, setStep2Data] = useState<RegistrationStep2FormData | null>(null);

  // Step 1 form
  const step1Form = useForm<RegistrationStep1FormData>({
    resolver: zodResolver(registrationStep1Schema),
    mode: "onChange",
  });

  // Step 2 form
  const step2Form = useForm<RegistrationStep2FormData>({
    resolver: zodResolver(registrationStep2Schema),
    defaultValues: {
      radiologyFocus: [],
    },
  });

  // Step 3 form
  const step3Form = useForm<RegistrationStep3FormData>({
    resolver: zodResolver(registrationStep3Schema),
    defaultValues: {
      newsletterOptIn: true,
    },
  });

  const password = step1Form.watch("password") || "";
  const confirmPassword = step1Form.watch("confirmPassword") || "";
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const radiologyFocus = step2Form.watch("radiologyFocus") || [];

  // Countdown for redirect after success
  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      router.push("/login");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isSuccess, router]);

  const handleStep1Submit = (data: RegistrationStep1FormData) => {
    setStep1Data(data);
    setCurrentStep(1);
  };

  const handleStep2Submit = (data: RegistrationStep2FormData) => {
    setStep2Data(data);
    setCurrentStep(2);
  };

  const handleStep3Submit = async (data: RegistrationStep3FormData) => {
    if (!step1Data || !step2Data) return;

    const result = await registerUser({
      fullName: step1Data.fullName,
      email: step1Data.email,
      password: step1Data.password,
      institutionType: step2Data.institutionType,
      trainingLevel: step2Data.trainingLevel,
      radiologyFocus: step2Data.radiologyFocus,
      referralSource: step2Data.referralSource,
    });

    if (result.success) {
      setIsSuccess(true);
      toast.success("Account created!", {
        description: "Check your email to verify your account.",
      });
    } else {
      toast.error("Registration failed", {
        description: result.error || "Please try again.",
      });
    }
  };

  const toggleFocus = (focus: string) => {
    const current = step2Form.getValues("radiologyFocus") || [];
    if (current.includes(focus)) {
      step2Form.setValue(
        "radiologyFocus",
        current.filter((f) => f !== focus),
        { shouldValidate: true }
      );
    } else {
      step2Form.setValue("radiologyFocus", [...current, focus], {
        shouldValidate: true,
      });
    }
  };

  return (
    <>
      <AuthLeftPanel
        variant="student"
        quote={`"Every expert was once\na student who refused\nto stop learning."`}
        quoteAttribution="Join thousands of radiology students"
      />

      {/* Right Panel */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#0D1424]">
        <div className="w-full max-w-[480px]">
          <AuthCard className="max-w-none">
            {isSuccess ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-accent-green mx-auto mb-6 flex items-center justify-center"
                >
                  <Check className="h-10 w-10 text-background" />
                </motion.div>
                <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-text-primary mb-2">
                  Account Created!
                </h2>
                <p className="text-text-secondary mb-4">
                  Check your email to verify your account.
                </p>
                <p className="text-sm text-text-secondary font-mono">
                  Redirecting to login in {countdown}s...
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <span className="font-mono text-xs text-text-secondary tracking-wider">
                    {"// CREATE YOUR ACCOUNT"}
                  </span>
                  <h1 className="font-[family-name:var(--font-syne)] text-[28px] font-bold text-text-primary mt-2">
                    Start Your Journey
                  </h1>
                  <p className="text-text-secondary mt-1">
                    Set up your MedVision AI account and start studying smarter.
                  </p>
                </div>

                <StepIndicator steps={STEPS} currentStep={currentStep} />

                <AnimatePresence mode="wait">
                  {/* Step 1: Account Details */}
                  {currentStep === 0 && (
                    <motion.form
                      key="step1"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                      className="space-y-5"
                    >
                      <FormInput
                        label="Full Name"
                        type="text"
                        placeholder="Dr. Jane Smith"
                        icon={User}
                        autoComplete="name"
                        error={step1Form.formState.errors.fullName?.message}
                        {...step1Form.register("fullName")}
                      />

                      <div className="relative">
                        <FormInput
                          label="Email Address"
                          type="email"
                          placeholder="jane@hospital.edu"
                          icon={Mail}
                          autoComplete="email"
                          error={step1Form.formState.errors.email?.message}
                          rightElement={
                            step1Form.formState.dirtyFields.email &&
                            !step1Form.formState.errors.email ? (
                              <Check className="h-5 w-5 text-accent-green" />
                            ) : null
                          }
                          {...step1Form.register("email")}
                        />
                      </div>

                      <div className="space-y-2">
                        <PasswordInput
                          label="Password"
                          placeholder="••••••••"
                          icon={Lock}
                          autoComplete="new-password"
                          error={step1Form.formState.errors.password?.message}
                          {...step1Form.register("password")}
                        />
                        <PasswordStrengthMeter password={password} />
                      </div>

                      <div className="relative">
                        <PasswordInput
                          label="Confirm Password"
                          placeholder="••••••••"
                          icon={LockKeyhole}
                          autoComplete="new-password"
                          error={step1Form.formState.errors.confirmPassword?.message}
                          {...step1Form.register("confirmPassword")}
                        />
                        {confirmPassword && (
                          <div className="absolute right-12 top-[38px]">
                            {passwordsMatch ? (
                              <Check className="h-5 w-5 text-accent-green" />
                            ) : (
                              <X className="h-5 w-5 text-[#FF6B6B]" />
                            )}
                          </div>
                        )}
                      </div>

                      <LoadingButton type="submit" variant="cyan">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </LoadingButton>
                    </motion.form>
                  )}

                  {/* Step 2: Academic Profile */}
                  {currentStep === 1 && (
                    <motion.form
                      key="step2"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans">
                          Institution / University
                        </label>
                        <Select
                          onValueChange={(value) =>
                            step2Form.setValue("institutionType", value, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger className="h-12 bg-[#080C14] border-[#1A2F4A] text-text-primary">
                            <SelectValue placeholder="Select your institution type" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111D35] border-[#1A2F4A]">
                            {INSTITUTION_TYPES.map((type) => (
                              <SelectItem
                                key={type}
                                value={type}
                                className="text-text-primary focus:bg-surface-elevated focus:text-text-primary"
                              >
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {step2Form.formState.errors.institutionType && (
                          <p className="text-[#FF6B6B] text-sm">
                            {step2Form.formState.errors.institutionType.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans">
                          Year of Study / Training Level
                        </label>
                        <Select
                          onValueChange={(value) =>
                            step2Form.setValue("trainingLevel", value, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger className="h-12 bg-[#080C14] border-[#1A2F4A] text-text-primary">
                            <SelectValue placeholder="Select your training level" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111D35] border-[#1A2F4A]">
                            {TRAINING_LEVELS.map((level) => (
                              <SelectItem
                                key={level}
                                value={level}
                                className="text-text-primary focus:bg-surface-elevated focus:text-text-primary"
                              >
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {step2Form.formState.errors.trainingLevel && (
                          <p className="text-[#FF6B6B] text-sm">
                            {step2Form.formState.errors.trainingLevel.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans">
                          Primary Radiology Focus
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {RADIOLOGY_FOCUS_OPTIONS.map((focus) => (
                            <button
                              key={focus}
                              type="button"
                              onClick={() => toggleFocus(focus)}
                              className={cn(
                                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                                radiologyFocus.includes(focus)
                                  ? "bg-accent-cyan text-background border-accent-cyan scale-105"
                                  : "bg-transparent text-text-secondary border-[#1A2F4A] hover:border-accent-cyan/50"
                              )}
                            >
                              {focus}
                            </button>
                          ))}
                        </div>
                        {step2Form.formState.errors.radiologyFocus && (
                          <p className="text-[#FF6B6B] text-sm">
                            {step2Form.formState.errors.radiologyFocus.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans">
                          How did you hear about us?
                        </label>
                        <Select
                          onValueChange={(value) =>
                            step2Form.setValue("referralSource", value)
                          }
                        >
                          <SelectTrigger className="h-12 bg-[#080C14] border-[#1A2F4A] text-text-primary">
                            <SelectValue placeholder="Select an option (optional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111D35] border-[#1A2F4A]">
                            {REFERRAL_SOURCES.map((source) => (
                              <SelectItem
                                key={source}
                                value={source}
                                className="text-text-primary focus:bg-surface-elevated focus:text-text-primary"
                              >
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-12 border-[#1A2F4A] bg-transparent text-text-primary hover:bg-surface-elevated"
                          onClick={() => setCurrentStep(0)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                        <LoadingButton type="submit" variant="cyan" className="flex-1">
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </LoadingButton>
                      </div>
                    </motion.form>
                  )}

                  {/* Step 3: Terms & Complete */}
                  {currentStep === 2 && (
                    <motion.form
                      key="step3"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                      className="space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="agreedToTerms"
                            checked={step3Form.watch("agreedToTerms")}
                            onCheckedChange={(checked) =>
                              step3Form.setValue("agreedToTerms", checked === true, {
                                shouldValidate: true,
                              })
                            }
                            className="mt-1 border-[#1A2F4A] data-[state=checked]:bg-accent-cyan data-[state=checked]:border-accent-cyan"
                          />
                          <label htmlFor="agreedToTerms" className="text-sm text-text-secondary">
                            I agree to the{" "}
                            <Link href="#" className="text-accent-cyan hover:underline">
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="#" className="text-accent-cyan hover:underline">
                              Privacy Policy
                            </Link>
                          </label>
                        </div>
                        {step3Form.formState.errors.agreedToTerms && (
                          <p className="text-[#FF6B6B] text-sm ml-7">
                            {step3Form.formState.errors.agreedToTerms.message}
                          </p>
                        )}

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="agreedToEducationalUse"
                            checked={step3Form.watch("agreedToEducationalUse")}
                            onCheckedChange={(checked) =>
                              step3Form.setValue("agreedToEducationalUse", checked === true, {
                                shouldValidate: true,
                              })
                            }
                            className="mt-1 border-[#1A2F4A] data-[state=checked]:bg-accent-cyan data-[state=checked]:border-accent-cyan"
                          />
                          <label htmlFor="agreedToEducationalUse" className="text-sm text-text-secondary">
                            I understand MedVision AI is an educational tool and not a substitute
                            for clinical judgment or professional medical advice.
                          </label>
                        </div>
                        {step3Form.formState.errors.agreedToEducationalUse && (
                          <p className="text-[#FF6B6B] text-sm ml-7">
                            {step3Form.formState.errors.agreedToEducationalUse.message}
                          </p>
                        )}

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="newsletterOptIn"
                            checked={step3Form.watch("newsletterOptIn")}
                            onCheckedChange={(checked) =>
                              step3Form.setValue("newsletterOptIn", checked === true)
                            }
                            className="mt-1 border-[#1A2F4A] data-[state=checked]:bg-accent-cyan data-[state=checked]:border-accent-cyan"
                          />
                          <label htmlFor="newsletterOptIn" className="text-sm text-text-secondary">
                            Send me study tips and MedVision AI feature updates
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-12 border-[#1A2F4A] bg-transparent text-text-primary hover:bg-surface-elevated"
                          onClick={() => setCurrentStep(1)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                        <LoadingButton
                          type="submit"
                          variant="cyan"
                          className="flex-1"
                          isLoading={isLoading}
                        >
                          Create Account
                        </LoadingButton>
                      </div>

                      <p className="text-center text-sm text-text-secondary">
                        Already have an account?{" "}
                        <Link href="/login" className="text-accent-cyan hover:underline">
                          Sign in
                        </Link>
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </>
            )}
          </AuthCard>
        </div>
      </main>
    </>
  );
}
