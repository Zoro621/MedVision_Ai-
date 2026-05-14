export const getActiveSession = () =>
  typeof window !== "undefined" ? localStorage.getItem("active_chat_session_id") ?? "" : "";
export const setActiveSession = (id: string) => {
  if (typeof window !== "undefined") localStorage.setItem("active_chat_session_id", id);
};
