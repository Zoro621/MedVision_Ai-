import type { DashboardStats } from "@/lib/api/progress";
import type { AuthUser } from "@/types/auth";
import type { DashboardUser } from "@/types/dashboard";

const DEFAULT_USER: DashboardUser = {
  id: "anonymous",
  fullName: "MedVision User",
  email: "",
  role: "student",
  avatarInitials: "MV",
  trainingLevel: "Radiology Learner",
  radiologyFocus: ["Chest"],
  xp: 0,
  level: 1,
  levelTitle: "Intern",
  streakDays: 0,
  xpToNextLevel: 500,
};

export function getDashboardUser(
  authUser: AuthUser | null,
  stats?: DashboardStats | null
): DashboardUser {
  if (!authUser) {
    return DEFAULT_USER;
  }

  return {
    ...DEFAULT_USER,
    id: authUser.id,
    fullName: authUser.fullName,
    email: authUser.email,
    role: authUser.role,
    avatarInitials: authUser.avatarInitials,
    trainingLevel: authUser.trainingLevel ?? DEFAULT_USER.trainingLevel,
    radiologyFocus:
      (authUser.radiologyFocus as DashboardUser["radiologyFocus"] | undefined) ??
      DEFAULT_USER.radiologyFocus,
    xp: stats?.xp ?? DEFAULT_USER.xp,
    level: stats?.level ?? DEFAULT_USER.level,
    levelTitle: stats?.levelTitle ?? DEFAULT_USER.levelTitle,
    streakDays: stats?.streakDays ?? DEFAULT_USER.streakDays,
    xpToNextLevel: stats?.xpToNextLevel ?? DEFAULT_USER.xpToNextLevel,
  };
}
