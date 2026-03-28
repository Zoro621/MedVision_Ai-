export type UserRole = 'student' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarInitials: string;
  trainingLevel?: string;
  radiologyFocus?: string[];
  institutionType?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  totpCode?: string; // admin only
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  institutionType: string;
  trainingLevel: string;
  radiologyFocus: string[];
  referralSource?: string;
  agreedToTerms: true;
  agreedToEducationalUse: true;
  newsletterOptIn?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

// Registration step data types
export interface RegistrationStep1Data {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationStep2Data {
  institutionType: string;
  trainingLevel: string;
  radiologyFocus: string[];
  referralSource?: string;
}

export interface RegistrationStep3Data {
  agreedToTerms: boolean;
  agreedToEducationalUse: boolean;
  newsletterOptIn: boolean;
}

export type RegistrationData = RegistrationStep1Data & RegistrationStep2Data & RegistrationStep3Data;
