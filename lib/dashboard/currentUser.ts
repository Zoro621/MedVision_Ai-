import type { AuthUser } from "@/types/auth";
import type { DashboardUser } from "@/types/dashboard";
import { MOCK_USER } from "@/lib/mockData/dashboard";

export function getDashboardUser(authUser: AuthUser | null): DashboardUser {
  if (!authUser) {
    return MOCK_USER;
  }

  return {
    ...MOCK_USER,
    id: authUser.id,
    fullName: authUser.fullName,
    email: authUser.email,
    role: authUser.role,
    avatarInitials: authUser.avatarInitials,
    trainingLevel: authUser.trainingLevel ?? MOCK_USER.trainingLevel,
    radiologyFocus:
      (authUser.radiologyFocus as DashboardUser["radiologyFocus"] | undefined) ??
      MOCK_USER.radiologyFocus,
  };
}
