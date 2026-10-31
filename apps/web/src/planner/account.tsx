"use client";

import { createContext, useContext } from "react";

export interface Account {
  name: string | null;
  initial: string;
  signOut: (() => void) | null;
}

export const AccountContext = createContext<Account>({ name: null, initial: "B", signOut: null });

export function useAccount(): Account {
  return useContext(AccountContext);
}
