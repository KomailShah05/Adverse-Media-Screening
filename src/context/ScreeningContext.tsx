"use client";

import { createContext, memo, use, type ReactNode } from "react";
import { useScreening } from "~/hooks/useScreening";

type ScreeningContextValue = ReturnType<typeof useScreening>;

// React 19 — createContext without a default; throw on missing provider
const ScreeningContext = createContext<ScreeningContextValue | null>(null);

const ScreeningProviderInner = ({ children }: { children: ReactNode }) => {
  const screening = useScreening();

  // React 19 — <Context value={...}> replaces <Context.Provider value={...}>
  // useScreening already returns a stable memoized object; no extra useMemo needed.
  return <ScreeningContext value={screening}>{children}</ScreeningContext>;
};

export const ScreeningProvider = memo(ScreeningProviderInner);

// React 19 — use(Context) instead of useContext(Context)
export const useScreeningContext = (): ScreeningContextValue => {
  const ctx = use(ScreeningContext);
  if (!ctx) throw new Error("useScreeningContext must be used inside <ScreeningProvider>");
  return ctx;
};
