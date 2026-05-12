"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreeScene } from "./ThreeScene";

const headlineWords = ["Learn", "Radiology", "The", "Way", "Your", "Brain", "Scans", "It."];

const trustIndicators = [
  "Grounded Answers",
  "No Hallucinations",
  "Cites Your Textbook",
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* 3D Background */}
      <ThreeScene />

      {/* Scan line animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-40 animate-scan-line" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 items-center">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Pill label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-custom bg-surface/50 backdrop-blur-sm font-[family-name:var(--font-jetbrains-mono)] text-xs text-accent-cyan shadow-[0_0_15px_rgba(0,194,255,0.15)]">
                <Sparkles className="h-3 w-3" />
                AI-POWERED RADIOLOGY EDUCATION
              </span>
            </motion.div>

            {/* Headline with staggered reveal */}
            <h1 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-balance">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={i}
                  className={`inline-block mr-[0.25em] ${
                    word === "Brain" || word === "Scans"
                      ? "text-gradient-cyan"
                      : "text-text-primary"
                  }`}
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + i * 0.08,
                    ease: "easeOut",
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-text-secondary text-lg md:text-xl max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Upload your textbooks. Ask anything. Get answers grounded in your
              own materials — with citations, visual explainability, and
              adaptive learning built in.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <Button
                size="lg"
                className="bg-accent-cyan text-background hover:bg-accent-cyan/90 font-semibold text-base px-8 animate-pulse-glow"
                asChild
              >
                <a href="/register">Start Learning Free</a>
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-wrap items-center gap-6 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              {trustIndicators.map((indicator, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-xs text-text-secondary"
                >
                  <span className="text-accent-green">✦</span>
                  {indicator}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right column - reserved for 3D scene focus area */}
          <div className="hidden lg:block" aria-hidden="true">
            {/* The 3D scene fills this space visually */}
          </div>
        </div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
