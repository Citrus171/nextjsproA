import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { authControllerRefresh } from "../../../../packages/api-client/src/index";

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  nickname: string | null;
  isRestoring: boolean;
  setToken: (t: string | null) => void;
  clearToken: () => void;
  refresh: () => Promise<string | null>;
};

function decodePayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const navigate = useNavigate();
  const refreshCalledRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshQueueRef = useRef<Array<(t: string | null) => void>>([]);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (isRefreshingRef.current) {
      return new Promise<string | null>((res) =>
        refreshQueueRef.current.push(res)
      );
    }
    isRefreshingRef.current = true;
    try {
      const res = await authControllerRefresh();
      const t =
        (res as { data?: { accessToken?: string } }).data?.accessToken ?? null;
      setTokenState(t);
      refreshQueueRef.current.forEach((cb) => cb(t));
      refreshQueueRef.current = [];
      return t;
    } catch {
      // setTokenState(null) しない: 登録直後のトークンを競合で上書きするのを防ぐ
      refreshQueueRef.current.forEach((cb) => cb(null));
      refreshQueueRef.current = [];
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (refreshCalledRef.current) return;
    refreshCalledRef.current = true;
    refresh().finally(() => setIsRestoring(false));
  }, [refresh]);

  const setToken = (t: string | null) => setTokenState(t);
  const clearToken = () => {
    setTokenState(null);
    navigate("/login");
  };

  const payload = decodePayload(token);
  const userId = (payload?.sub as string) ?? null;
  const nickname = (payload?.nickname as string) ?? null;

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        nickname,
        isRestoring,
        setToken,
        clearToken,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
