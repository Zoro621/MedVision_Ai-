"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      name,
      icon: Icon,
      error,
      helperText,
      rightElement,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="space-y-2">
        <label
          htmlFor={name}
          className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans"
        >
          {label}
        </label>
        <div className="relative">
          {Icon && (
            <Icon
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
                error ? "text-[#FF6B6B]" : "text-text-secondary",
                "peer-focus:text-accent-cyan"
              )}
            />
          )}
          <input
            ref={ref}
            id={name}
            name={name}
            disabled={disabled}
            suppressHydrationWarning
            className={cn(
              "peer w-full h-12 rounded-lg border bg-surface px-4 text-text-primary placeholder:text-text-secondary/60",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-accent-cyan/25 focus:border-accent-cyan",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              Icon && "pl-12",
              rightElement && "pr-12",
              error
                ? "border-accent-red focus:ring-accent-red/25 focus:border-accent-red"
                : "border-border-custom",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[#FF6B6B] text-sm animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-text-secondary text-xs font-mono">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
