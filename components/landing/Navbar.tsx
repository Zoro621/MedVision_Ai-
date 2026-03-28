"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Menu, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { NavLink } from "@/types";

const NAV_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Motivation", href: "#motivation" },
];

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
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      <path
        d="M16 6C12 6 9 9 9 12C9 14 10 15 10 17C10 19 8 20 8 22C8 24 10 26 14 26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 6C20 6 23 9 23 12C23 14 22 15 22 17C22 19 24 20 24 22C24 24 22 26 18 26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="13" cy="13" r="1.5" fill="currentColor" />
      <circle cx="19" cy="13" r="1.5" fill="currentColor" />
      <path
        d="M14 18C14 18 15 19.5 16 19.5C17 19.5 18 18 18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass py-3"
          : "bg-transparent py-5"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <BrainScanIcon className="h-8 w-8 text-accent-cyan transition-transform group-hover:scale-110" />
            <span className="font-[family-name:var(--font-syne)] text-xl font-bold text-accent-cyan">
              MedVision AI
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10 gap-1"
                  >
                    Login
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="glass-elevated border-l-2 border-l-accent-cyan w-52"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/login"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <GraduationCap className="h-4 w-4 text-accent-cyan" />
                      Student Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/login"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4 text-accent-cyan" />
                      Admin Login
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                className="border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10 gap-1"
              >
                Login
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}

            <Link href="/register">
              <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90 font-semibold shadow-[0_0_20px_rgba(0,194,255,0.3)] hover:shadow-[0_0_30px_rgba(0,194,255,0.5)] transition-all">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          {mounted ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6 text-text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-elevated border-l-border-custom w-72">
                <div className="flex flex-col gap-6 mt-8">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BrainScanIcon className="h-8 w-8 text-accent-cyan" />
                    <span className="font-[family-name:var(--font-syne)] text-xl font-bold text-accent-cyan">
                      MedVision AI
                    </span>
                  </Link>

                  <div className="flex flex-col gap-4">
                    {NAV_LINKS.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="text-text-secondary hover:text-text-primary transition-colors font-medium text-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>

                  <div className="border-t border-border-custom pt-6 flex flex-col gap-3">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Student Login
                      </Button>
                    </Link>
                    <Link
                      href="/admin/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="outline"
                        className="w-full border-border-custom text-text-secondary hover:bg-surface-elevated"
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Admin Login
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-accent-cyan text-background hover:bg-accent-cyan/90 font-semibold">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
              <Menu className="h-6 w-6 text-text-primary" />
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
