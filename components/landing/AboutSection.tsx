"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { FileCheck, Eye, Brain } from "lucide-react";

const stats = [
  {
    icon: FileCheck,
    title: "Grounded Answers",
    description: "Every answer cites your textbook",
  },
  {
    icon: Eye,
    title: "Explainable AI",
    description: "GradCAM, LIME & SHAP show why",
  },
  {
    icon: Brain,
    title: "Adaptive Learning",
    description: "IRT + BKT personalize your study",
  },
];

export function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="about"
      ref={ref}
      className="relative py-24 md:py-32 bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-accent-cyan mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {"// ABOUT MEDVISION AI"}
          </motion.p>
          <motion.h2
            className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-6 text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Built for the Future of Medical Education
          </motion.h2>
          <motion.p
            className="text-text-secondary text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            MedVision AI is an AI-powered study assistant designed specifically for
            radiology students and residents. Upload your own learning materials
            and interact with an intelligent assistant that answers from your
            content — never hallucinating, always citing.
          </motion.p>
          <motion.p
            className="text-text-secondary text-lg leading-relaxed mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Built on Agentic RAG architecture, multimodal AI, and adaptive
            learning science, MedVision AI turns passive reading into active,
            measurable mastery.
          </motion.p>
        </div>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              className="group relative glass-elevated rounded-xl p-6 border-t-2 border-t-accent-cyan hover:shadow-[0_0_30px_rgba(0,194,255,0.15)] transition-all duration-300 hover:-translate-y-1"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-lg bg-surface border border-border-custom group-hover:border-accent-cyan/50 transition-colors">
                  <stat.icon className="h-8 w-8 text-accent-cyan" />
                </div>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-semibold text-text-primary">
                  {stat.title}
                </h3>
                <p className="text-text-secondary">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
