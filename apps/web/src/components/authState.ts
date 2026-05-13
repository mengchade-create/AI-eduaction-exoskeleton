import { createContext, useContext } from "react";

import type { User } from "../api/types";

export type AuthState = {
  token: string | null;
  user: User | null;
};

export type AuthContextValue = AuthState & {
  signIn: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
