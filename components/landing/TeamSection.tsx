"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Github, Linkedin } from "lucide-react";
import type { TeamMember } from "@/types";

// EDIT: Replace placeholder names, roles, initials, and links below
const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Emad Hasan", // EDIT: add team member name
    role: "Project Lead & AI Engineer", // EDIT: add role title
    avatarInitials: "EH", // EDIT: add initials (e.g., "JD" for Jane Doe)
    github: "#", // EDIT: add GitHub profile URL
    linkedin: "#", // EDIT: add LinkedIn profile URL
  },
  {
    name: "Syed Abdul Wasay", // EDIT: add team member name
    role: "Frontend Developer", // EDIT: add role title
    avatarInitials: "SW", // EDIT: add initials
    github: "#", // EDIT: add GitHub profile URL
    linkedin: "#", // EDIT: add LinkedIn profile URL
  },
  {
    name: "Abdur Rehman Khan Durrani", // EDIT: add team member name
    role: "ML Engineer", // EDIT: add role title
    avatarInitials: "AD", // EDIT: add initials
    github: "#", // EDIT: add GitHub profile URL
    linkedin: "#", // EDIT: add LinkedIn profile URL
  },
];

function TeamCard({
  member,
  index,
  isInView,
}: {
  member: TeamMember;
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      className="group glass-elevated rounded-xl p-6 text-center hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,194,255,0.15)]"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
    >
      {/* Avatar placeholder with gradient */}
      <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green p-[2px]">
        <div className="w-full h-full rounded-full bg-surface-elevated flex items-center justify-center">
          <span className="font-[family-name:var(--font-syne)] text-xl font-bold text-text-primary group-hover:text-accent-cyan transition-colors">
            {member.avatarInitials}
          </span>
        </div>
      </div>

      {/* Name */}
      <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-1">
        {member.name}
      </h3>

      {/* Role */}
      <p className="text-text-secondary text-sm mb-4">{member.role}</p>

      {/* Social links */}
      <div className="flex items-center justify-center gap-3">
        {member.github && (
          <a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-surface border border-border-custom hover:border-accent-cyan/50 hover:text-accent-cyan transition-all"
            aria-label={`${member.name}'s GitHub`}
          >
            <Github className="h-4 w-4" />
          </a>
        )}
        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-surface border border-border-custom hover:border-accent-cyan/50 hover:text-accent-cyan transition-all"
            aria-label={`${member.name}'s LinkedIn`}
          >
            <Linkedin className="h-4 w-4" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function TeamSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" ref={ref} className="relative py-24 md:py-32 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-accent-cyan mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {"// THE TEAM"}
          </motion.p>
          <motion.h2
            className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Built By
          </motion.h2>
        </div>

        {/* Team grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {TEAM_MEMBERS.map((member, i) => (
            <TeamCard
              key={member.name}
              member={member}
              index={i}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
