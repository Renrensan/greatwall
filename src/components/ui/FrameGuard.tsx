"use client";

import { useLayoutEffect } from "react";

/**
 * FrameGuard intercepts any attempt to render Paradapp inside an embedded iframe.
 *
 * If embedded inside an iframe:
 * 1. Immediately hides the framed document (display: none) so no UI is rendered.
 * 2. Dispatches a postMessage to notify the parent window to re-anchor the iframe to the payment URL.
 */
export default function FrameGuard() {
  useLayoutEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      // 1. Immediately suppress rendering inside the frame
      document.documentElement.style.display = "none";

      // 2. Instruct parent window to re-anchor the iframe to the payment URL
      try {
        if (window.parent) {
          window.parent.postMessage(
            { type: "PARADAPP_NAVIGATED_AWAY", url: window.location.href },
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
