import { z } from "zod";

// Student login schema
export const studentLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

// Admin login schema
export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  totpCode: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d+$/, "Digits only"),
});

export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

// Registration Step 1 schema
export const registrationStep1Schema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number")
      .regex(/[^a-zA-Z0-9]/, "Must include a special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegistrationStep1FormData = z.infer<typeof registrationStep1Schema>;

// Registration Step 2 schema
export const registrationStep2Schema = z.object({
  institutionType: z.string().min(1, "Please select your institution type"),
  trainingLevel: z.string().min(1, "Please select your training level"),
  radiologyFocus: z.array(z.string()).min(1, "Select at least one focus area"),
  referralSource: z.string().optional(),
});

export type RegistrationStep2FormData = z.infer<typeof registrationStep2Schema>;

// Registration Step 3 schema
export const registrationStep3Schema = z.object({
  agreedToTerms: z.boolean().refine((value) => value, {
    message: "You must accept the terms to continue",
  }),
  agreedToEducationalUse: z.boolean().refine((value) => value, {
    message: "Please acknowledge the educational use policy",
  }),
  newsletterOptIn: z.boolean().optional(),
});

export type RegistrationStep3FormData = z.infer<typeof registrationStep3Schema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Password strength calculation
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "#FF6B6B" };
  if (score <= 2) return { score: 2, label: "Fair", color: "#FFA500" };
  if (score <= 3) return { score: 3, label: "Good", color: "#FFD700" };
  return { score: 4, label: "Strong", color: "#4EFFA0" };
}
