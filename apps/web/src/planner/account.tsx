"use client";

import { createContext, useContext } from "react";

export interface Account {
  name: string | null;
  email: string | null;
  initial: string;
  /** The profile photo, when the person has uploaded one. Otherwise the initial shows. */
  imageUrl: string | null;
  /** Opens the sign-in provider's own profile screen, for name, photo, email and password. */
  manage: (() => void) | null;
  signOut: (() => void) | null;
}

export const AccountContext = createContext<Account>({ name: null, email: null, initial: "B", imageUrl: null, manage: null, signOut: null });

export function useAccount(): Account {
  return useContext(AccountContext);
}

/** The round account picture: the profile photo, or the first letter of the name. */
export function AccountAvatar({ account }: { account: Account }) {
  // eslint-disable-next-line @next/next/no-img-element -- a remote Clerk avatar, already sized by Clerk's image service
  return account.imageUrl ? <img src={account.imageUrl} alt="" width={64} height={64} /> : <>{account.initial}</>;
}
