// utils/session.ts
export const getChatSessionId = () => {
  if (typeof window === "undefined") return "server_temp";

  let sessionId = sessionStorage.getItem("para_ai_session_id");
  if (!sessionId) {
    // Generate a simple random ID
    sessionId = `session_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem("para_ai_session_id", sessionId);
  }
  return sessionId;
};
