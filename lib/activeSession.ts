export const getActiveSession = () => localStorage.getItem("active_chat_session_id") ?? "";
export const setActiveSession = (id: string) => localStorage.setItem("active_chat_session_id", id);
