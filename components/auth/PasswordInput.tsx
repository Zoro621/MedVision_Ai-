"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Lock, Eye, EyeOff, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      name,
      icon: Icon = Lock,
      error,
      helperText,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="space-y-2">
        <label
          htmlFor={name}
          className="block text-[13px] uppercase tracking-wider text-text-secondary font-sans"
        >
          {label}
        </label>
        <div className="relative">
          <Icon
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
              error ? "text-[#FF6B6B]" : "text-text-secondary",
              "peer-focus:text-accent-cyan"
            )}
          />
          <input
            ref={ref}
            id={name}
            name={name}
            type={showPassword ? "text" : "password"}
            disabled={disabled}
            className={cn(
              "peer w-full h-12 rounded-lg border bg-[#080C14] pl-12 pr-12 text-text-primary placeholder:text-[#7A9BB5]",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-accent-cyan/25 focus:border-accent-cyan",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-[#FF6B6B] focus:ring-[#FF6B6B]/25 focus:border-[#FF6B6B]"
                : "border-[#1A2F4A]",
              className
            )}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-text-secondary hover:text-text-primary hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </Button>
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

PasswordInput.displayName = "PasswordInput";
