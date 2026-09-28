import * as React from "react";
import { SelfServiceClient } from "@/api/client";
import { API_BASE_URL } from "@/api/config";
import { tokenStore } from "@/api/token-store";
import { customerName, type Customer } from "@/api/types";

/**
 * Session state for the app.
 *
 * The client reads the token from secure storage on every request, so signing in
 * is a single call and there is no token held in React state that could leak into
 * a crash report or a component tree.
 */
type SessionValue = {
  customer: Customer | null;
  loading: boolean;
  client: SelfServiceClient;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  adopt: (customer: Customer) => void;
};

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(true);

  const client = React.useMemo(
    () =>
      new SelfServiceClient({
        baseUrl: API_BASE_URL,
        getToken: () => tokenStore.get(),
        onUnauthorized: async () => {
          await tokenStore.clear();
          setCustomer(null);
        },
      }),
    [],
  );

  // A stored token means the customer can skip the login screen.
  React.useEffect(() => {
    let active = true;

    (async () => {
      const token = await tokenStore.get();
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const me = await client.me();
        if (active) setCustomer(me);
      } catch {
        await tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [client]);

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const result = await client.login({ email, password });
      await tokenStore.set(result.token);
      setCustomer(result.customer);
    },
    [client],
  );

  const signOut = React.useCallback(async () => {
    try {
      await client.logout();
    } catch {
      // Sign out locally even if the network call fails.
    }
    await tokenStore.clear();
    setCustomer(null);
  }, [client]);

  const value = React.useMemo<SessionValue>(
    () => ({ customer, loading, client, signIn, signOut, adopt: setCustomer }),
    [customer, loading, client, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

export { customerName };
