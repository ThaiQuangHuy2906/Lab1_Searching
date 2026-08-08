"use client";

import * as React from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
  "[role='switch']",
  "[role='tab']",
].join(",");

function getFocusableNodes(container: HTMLElement | null) {
  return [...(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    .filter((node) => !node.hasAttribute("disabled") && node.offsetParent !== null);
}

/** Keeps a small-screen sheet keyboard-contained and gives Escape a consistent exit. */
export function useMobileDialogFocus(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onKeyDownCapture = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!active) return;
    if (event.key === "Escape") {
      // Let Radix dismiss the currently open tooltip/select before closing its
      // owning sheet. This preserves the expected nested-Escape sequence.
      if (document.querySelector("[role='tooltip'], [role='listbox']")) return;
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = getFocusableNodes(containerRef.current);
    if (nodes.length === 0) return;
    const currentIndex = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && currentIndex <= 0) {
      event.preventDefault();
      nodes[nodes.length - 1].focus();
    } else if (!event.shiftKey && currentIndex === nodes.length - 1) {
      event.preventDefault();
      nodes[0].focus();
    } else if (currentIndex === -1) {
      event.preventDefault();
      nodes[event.shiftKey ? nodes.length - 1 : 0].focus();
    }
  }, [active, containerRef, onClose]);

  React.useEffect(() => {
    if (!active) return;

    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [active, initialFocusRef]);

  return onKeyDownCapture;
}
