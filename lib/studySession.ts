const ACTIVE_STUDY_SESSION_KEY = "medvision.activeStudySessionId";

export function getStoredActiveStudySessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(ACTIVE_STUDY_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveStudySessionId(chatSessionId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (chatSessionId) {
      window.localStorage.setItem(ACTIVE_STUDY_SESSION_KEY, chatSessionId);
      return;
    }
    window.localStorage.removeItem(ACTIVE_STUDY_SESSION_KEY);
  } catch {
    // Ignore storage errors and keep the current in-memory state.
  }
}
