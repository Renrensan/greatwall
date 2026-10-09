"use client";

import { useLayoutEffect } from "react";

/**
 * FrameGuard intercepts any attempt to render Greatwall inside an embedded iframe.
 *
 * If embedded inside an iframe:
 * 1. Immediately hides the framed document (display: none) so no UI is rendered.
 * 2. Posts a message telling the parent window the app refused to render, with its URL.
 */
export default function FrameGuard() {
  useLayoutEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      // 1. Immediately suppress rendering inside the frame
      document.documentElement.style.display = "none";

      // 2. Tell the parent window, with the URL it tried to frame
      try {
        if (window.parent) {
          window.parent.postMessage(
            { type: "GREATWALL_NAVIGATED_AWAY", url: window.location.href },
            "*"
          );
        }
      } catch (e) {
        console.warn("[FrameGuard] Message dispatch error:", e);
      }
    }
  }, []);

  return null;
}
