"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import {
  FileText,
  ScanEye,
  Brain,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Feature } from "@/types";

const FEATURES: Feature[] = [
  {
    title: "Ask Anything. Get Cited Answers.",
    description:
      "Upload your radiology textbooks and lecture notes. MedVision AI retrieves exact passages, answers your questions, and cites the page number — so you always know where the answer came from. No guessing. No hallucination.",
    tags: ["RAG", "Hybrid Retrieval", "Citations"],
    icon: FileText,
  },
  {
    title: "See What the AI Sees.",
    description:
      "Upload radiology images and get AI-generated captions with explainability overlays. GradCAM, LIME, and SHAP highlight exactly which regions influenced each finding — turning black-box AI into a transparent teaching tool.",
    tags: ["GradCAM", "LIME", "SHAP", "Qwen2.5-VL"],
    icon: ScanEye,
  },
  {
    title: "Study Smarter, Not Harder.",
    description:
      "AI-generated flashcards with spaced repetition scheduling. Adaptive quizzes that adjust difficulty to your level using Item Response Theory. Every session builds toward measurable mastery.",
    tags: ["Spaced Repetition", "IRT", "Adaptive"],
    icon: Brain,
  },
  {
    title: "Level Up Your Radiology Knowledge.",
    description:
      "Earn XP, unlock badges, maintain study streaks, and climb the leaderboard. Progress from Intern to Radiologist as your mastery grows — with daily challenges and weekly quests keeping you on track.",
    tags: ["XP System", "Badges", "Streaks", "Leaderboard"],
    icon: Trophy,
  },
];

function FeatureVisual({ icon: Icon, index }: { icon: LucideIcon; index: number }) {
  return (
    <div className="relative aspect-square max-w-sm mx-auto">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-radial from-accent-cyan/20 via-transparent to-transparent rounded-full blur-2xl" />
      
      {/* Main visual container */}
      <div className="relative glass-elevated rounded-2xl p-8 h-full flex items-center justify-center border border-border-custom group-hover:border-accent-cyan/30 transition-colors">
        {/* Grid overlay */}
        <div className="absolute inset-0 rounded-2xl opacity-20" 
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,194,255,0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0,194,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-accent-cyan/20 rounded-full blur-xl animate-float" />
          <div className="relative p-6 rounded-full bg-surface border border-accent-cyan/50 shadow-[0_0_30px_rgba(0,194,255,0.2)]">
            <Icon className="h-16 w-16 text-accent-cyan" strokeWidth={1.5} />
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 font-[family-name:var(--font-jetbrains-mono)] text-xs text-text-secondary/50">
          {String(index + 1).padStart(2, "0")}
        </div>
        
        {/* Scan crosshairs */}
        <div className="absolute top-1/2 left-4 w-4 h-[1px] bg-accent-cyan/30" />
        <div className="absolute top-1/2 right-4 w-4 h-[1px] bg-accent-cyan/30" />
        <div className="absolute left-1/2 top-4 h-4 w-[1px] bg-accent-cyan/30" />
        <div className="absolute left-1/2 bottom-4 h-4 w-[1px] bg-accent-cyan/30" />
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
  index,
  reversed,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
  reversed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={`group grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
        reversed ? "lg:flex-row-reverse" : ""
      }`}
      initial={{ opacity: 0, x: reversed ? 50 : -50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Text content */}
      <div className={`flex flex-col gap-4 ${reversed ? "lg:order-2" : ""}`}>
        <h3 className="font-[family-name:var(--font-syne)] text-2xl sm:text-3xl font-bold text-text-primary text-balance">
          {feature.title}
        </h3>
        <p className="text-text-secondary text-lg leading-relaxed">
          {feature.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {feature.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-accent-cyan/50 text-accent-cyan bg-accent-cyan/5 font-[family-name:var(--font-jetbrains-mono)] text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Visual */}
      <div className={reversed ? "lg:order-1" : ""}>
        <FeatureVisual icon={feature.icon} index={index} />
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-20">
          <motion.p
            className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-accent-cyan mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {"// WHAT MEDVISION AI OFFERS"}
          </motion.p>
          <motion.h2
            className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Everything a Radiology Student Needs
          </motion.h2>
        </div>

        {/* Feature rows */}
        <div className="flex flex-col gap-24 lg:gap-32">
          {FEATURES.map((feature, i) => (
            <FeatureRow
              key={feature.title}
              feature={feature}
              index={i}
              reversed={i % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
