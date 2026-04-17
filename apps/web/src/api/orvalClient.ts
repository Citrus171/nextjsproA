import { useEffect, useMemo, useRef } from "react";
import { createClient } from "../../../../packages/api-client/src/client";
import { useAuth } from "../auth/AuthProvider";

export function useApiClient() {
  const { token, clearToken, setToken } = useAuth();

  const tokenRef = useRef(token);
  tokenRef.current = token;
  const clearTokenRef = useRef(clearToken);
  clearTokenRef.current = clearToken;
  const setTokenRef = useRef(setToken);
  setTokenRef.current = setToken;

  const client = useMemo(
    () =>
      createClient({
        getToken: async () => tokenRef.current,
        setToken: (t) => setTokenRef.current(t),
        onUnauthorized: () => clearTokenRef.current(),
      }),
    [],
  );

  useEffect(() => () => client.dispose(), [client]);

  return client;
}
