import type { LucideIcon } from "lucide-react";

export interface TeamMember {
  name: string;
  role: string;
  github?: string;
  linkedin?: string;
  avatarInitials: string;
}

export interface Feature {
  title: string;
  description: string;
  tags: string[];
  icon: LucideIcon;
}

export interface NavLink {
  label: string;
  href: string;
}
