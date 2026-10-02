"use client";

import { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from "react";

interface ChatbotContextType {
  isOpen: boolean;
  // The real useState setter type (not just `(open: boolean) => void`) — ChatbotInner calls
  // this with the functional-updater form in a couple of places, which a narrower type would
  // silently reject at the call site where Chatbot passes this down as its setIsExpanded prop.
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  // Lets a page with its own trigger (e.g. App.tsx's bottom-nav "Ask AI" tab) suppress
  // Chatbot's own floating pill button, so there's only ever one visible way to open it.
  hideFloatingTrigger: boolean;
  setHideFloatingTrigger: (hide: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

// Optional on purpose — Chatbot is mounted in several layouts, most of which have no bottom
// nav to share this with and should keep behaving exactly as before (their own private
// open/closed state). Only the layout that also renders App.tsx's nav wraps this provider.
export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hideFloatingTrigger, setHideFloatingTrigger] = useState(false);

  return (
    <ChatbotContext.Provider value={{ isOpen, setIsOpen, hideFloatingTrigger, setHideFloatingTrigger }}>
      {children}
    </ChatbotContext.Provider>
  );
}

/** Returns `undefined` outside a ChatbotProvider — callers fall back to local state rather
 * than throwing, since most of Chatbot's mount points don't (and shouldn't need to) provide one. */
export function useChatbotContext(): ChatbotContextType | undefined {
  return useContext(ChatbotContext);
}
