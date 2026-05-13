import { useMemo, useState } from "react";

import { AuthContext, type AuthContextValue, type AuthState } from "./authState";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null });

  const value = useMemo<AuthContextValue>(
    () => ({
      ...auth,
      signIn: (token, user) => setAuth({ token, user }),
      updateUser: (user) => setAuth((current) => ({ ...current, user })),
      signOut: () => setAuth({ token: null, user: null }),
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
