import { createClient } from "../../../../packages/api-client/src/client";
import { useAuth } from "../auth/AuthProvider";

export function useApiClient() {
  const { token, clearToken, setToken } = useAuth();

  // Create a client bound to current token
  const client = createClient({
    baseURL: "/api",
    getToken: async () => token,
    setToken: (t) => setToken(t),
    onUnauthorized: () => {
      clearToken();
    },
  });

  return client;
}
