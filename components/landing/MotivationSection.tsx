"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const motivationPoints = [
  {
    title: "The Problem",
    description:
      "Radiology education relies on passive reading and rote memorization. Students lack tools that connect textbook theory to interactive practice — and hallucinating AI tools make it worse, not better.",
  },
  {
    title: "Our Approach",
    description:
      "By grounding every answer in the student's own uploaded materials, we eliminate hallucination. By adding visual explainability, we make AI transparent. By gamifying progress, we make studying sustainable.",
  },
  {
    title: "The Vision",
    description:
      "A future where every radiology student — regardless of institution — has access to an intelligent, personalized, explainable study partner trained on their own curriculum.",
  },
];

export function MotivationSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="motivation"
      ref={ref}
      className="relative py-24 md:py-32 bg-gradient-to-b from-surface via-surface-elevated to-surface overflow-hidden"
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-accent-cyan/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-accent-cyan mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {"// WHY WE BUILT THIS"}
          </motion.p>
          <motion.h2
            className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Radiology is Hard. Learning it Shouldn&apos;t Be.
          </motion.h2>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column - Pull quote */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative pl-8 lg:pl-12">
              {/* Large quotation mark */}
              <span className="absolute top-0 left-0 font-[family-name:var(--font-syne)] text-8xl lg:text-9xl text-accent-cyan/30 leading-none select-none">
                &ldquo;
              </span>
              <blockquote className="relative font-[family-name:var(--font-syne)] text-2xl sm:text-3xl lg:text-4xl font-medium text-text-primary leading-snug italic">
                Radiology residents spend years memorizing patterns from static
                textbooks. We built MedVision AI to make that knowledge interactive,
                traceable, and truly understood.
              </blockquote>
              <span className="absolute bottom-0 right-0 font-[family-name:var(--font-syne)] text-8xl lg:text-9xl text-accent-cyan/30 leading-none select-none rotate-180">
                &ldquo;
              </span>
            </div>
          </motion.div>

          {/* Right column - Motivation points */}
          <div className="flex flex-col gap-8">
            {motivationPoints.map((point, i) => (
              <MotivationPoint
                key={point.title}
                point={point}
                index={i}
                isInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MotivationPoint({
  point,
  index,
  isInView,
}: {
  point: (typeof motivationPoints)[0];
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      className="relative pl-6 group"
      initial={{ opacity: 0, x: 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
    >
      {/* Animated border */}
      <motion.div
        className="absolute left-0 top-0 w-[2px] bg-gradient-to-b from-accent-cyan to-accent-green"
        initial={{ height: 0 }}
        animate={isInView ? { height: "100%" } : {}}
        transition={{ duration: 0.6, delay: 0.4 + index * 0.15 }}
      />

      <h3 className="font-[family-name:var(--font-syne)] text-xl font-semibold text-text-primary mb-2">
        {point.title}
      </h3>
      <p className="text-text-secondary leading-relaxed">{point.description}</p>
    </motion.div>
  );
}
