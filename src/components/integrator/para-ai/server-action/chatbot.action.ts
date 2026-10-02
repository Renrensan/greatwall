"use server";

export async function ChatWithChatbot(
  message: string,
  walletState: any = null,
  sessionId?: string,
  sender: "user" | "operator" = "user",
  executionResult?: any,
) {
  const apiKey = process.env.PARA_AI_API_KEY;
  const aiUrl = process.env.PARA_AI_URL;
  const finalSessionId = sessionId || "default_user";

  const enrichedMessage = `[SYSTEM_DIRECTIVE: The STATE is the absolute ground truth. Ignore any conflicting addresses or connection statuses from previous messages in the history. User Message: ${message}`;

  try {
    const res = await fetch(`${aiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ParaAI-Key": apiKey || "",
      },
      body: JSON.stringify({
        message: enrichedMessage,
        wallet_state: walletState,
        session_id: finalSessionId,
        sender: sender,
        execution_result: executionResult,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Chatbot request failed: ${res.statusText}`,
      );
    }

    return await res.json();
  } catch (error) {
    console.error("Para AI Error:", error);
    throw error;
  }
}

export async function SyncChatGreeting(sessionId: string, isNewUser: boolean) {
  const apiKey = process.env.PARA_AI_API_KEY;
  const aiUrl = process.env.PARA_AI_URL;

  try {
    const res = await fetch(`${aiUrl}/chat/sync-greeting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ParaAI-Key": apiKey || "",
      },
      body: JSON.stringify({
        session_id: sessionId,
        is_new_user: isNewUser,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Sync Greeting failed:", errorData);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error("Sync Greeting Error:", error);
    return { ok: false };
  }
}

export async function AppendChatMessage(
  sessionId: string,
  message: string,
  sender: "bot" | "user" = "bot",
) {
  const apiKey = process.env.PARA_AI_API_KEY;
  const aiUrl = process.env.PARA_AI_URL;

  try {
    const res = await fetch(`${aiUrl}/chat/append-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ParaAI-Key": apiKey || "",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
        sender: sender,
      }),
    });

    return { ok: res.ok };
  } catch (error) {
    console.error("Append Chat Message Error:", error);
    return { ok: false };
  }
}

export async function GetChatHistory(sessionId: string) {
  const apiKey = process.env.PARA_AI_API_KEY;
  const aiUrl = process.env.PARA_AI_URL;

  try {
    const res = await fetch(`${aiUrl}/history/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-ParaAI-Key": apiKey || "",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawMessages = data.history || [];

    // 1. FILTER & MAP: Cleanse system scaffolding and classify operator execution messages
    const processedHistory: any[] = [];

    rawMessages.forEach((msg: any, index: number) => {
      let rawContent = msg.data?.content || msg.text || "";
      let parsedIntention = msg.intention || null;
      let parsedBlueprint = msg.execution_blueprint || null;

      const rawType = msg.type || msg.data?.type || msg.sender;
      let sender =
        rawType === "ai" ? "bot" : rawType === "human" ? "user" : rawType;

      // If content contains execution result directive or OPERATOR tag, classify as operator
      if (
        rawContent.includes("[EXECUTION_RESULT_") ||
        rawContent.includes("OPERATOR:") ||
        (rawContent.startsWith("[SYSTEM_DIRECTIVE:") && !rawContent.includes("User Message:"))
      ) {
        sender = "operator";
      }

      // Skip operator messages completely so they do not leak into history UI
      if (sender === "operator") return;

      let cleanText = rawContent;
      if (sender === "user") {
        if (cleanText.includes("User Message:")) {
          cleanText =
            cleanText.split("User Message:").pop()?.trim() || cleanText;
        }
        cleanText = cleanText.replace(/\]$/, "").trim();
      }

      if (sender === "bot" && cleanText.includes("###INTENTION###")) {
        const parts = cleanText.split("###INTENTION###");
        cleanText = parts[0].trim();
        if (!parsedIntention) {
          try {
            parsedIntention = JSON.parse(parts[1].trim());
          } catch (e) {
            parsedIntention = null;
          }
        }
      }

      const isFetchQuote = parsedIntention?.type === "FETCH_QUOTE";
      const isLastMessage = index === rawMessages.length - 1;

      processedHistory.push({
        sender: sender,
        text: cleanText,
        intention: parsedIntention,
        execution_blueprint: parsedBlueprint,
        isResolved: isFetchQuote ? true : !(isLastMessage && parsedIntention),
        isConfirmation: isFetchQuote ? false : !!parsedIntention,
      });
    });

    return processedHistory;
  } catch (error) {
    console.error("Fetch History Error:", error);
    return [];
  }
}

export async function reloadChatbot() {
  const res = await fetch(`${process.env.BACKEND_URL}/admin/reload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ParaAI-Key": process.env.PARA_AI_API_KEY ?? "",
    },
  });

  if (!res.ok) {
    return { ok: false };
  }

  return { ok: true };
}
