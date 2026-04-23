"use client";

import { useEffect, useRef } from "react";

/**
 * Focuses a container element when `active` becomes true.
 * Saves and restores the previously focused element when `active` becomes false,
 * so keyboard focus returns to the natural prior position (e.g. the submit button).
 *
 * Equivalent to React Navigation's useFocusEffect — adapted for web.
 */
export const useFocusEffect = <T extends HTMLElement = HTMLDivElement>(
  active: boolean,
) => {
  const ref = useRef<T>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Snapshot the currently focused element so we can restore it on deactivation
    savedFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    ref.current?.focus();

    return () => {
      // Restore focus when this view deactivates (state transitions away)
      savedFocusRef.current?.focus();
      savedFocusRef.current = null;
    };
  }, [active]);

  return ref;
};
