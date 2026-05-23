"use client";

import { createContext, useContext } from "react";

type ClerkRuntimeState = {
  enabled: boolean;
};

const ClerkRuntimeContext = createContext<ClerkRuntimeState>({ enabled: false });

export function ClerkRuntimeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return <ClerkRuntimeContext.Provider value={{ enabled }}>{children}</ClerkRuntimeContext.Provider>;
}

export function useClerkRuntime() {
  return useContext(ClerkRuntimeContext);
}