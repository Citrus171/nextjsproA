import React, {
  createContext,
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
};

function decodePayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;
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

  useEffect(() => {
    if (refreshCalledRef.current) return;
    refreshCalledRef.current = true;
    authControllerRefresh()
      .then((res) => {
        const t =
          (res as { data?: { accessToken?: string } }).data?.accessToken ??
          null;
        setTokenState(t);
      })
      .catch(() => {
        // setTokenState(null) しない: 登録直後のトークンを競合で上書きするのを防ぐ
      })
      .finally(() => {
        setIsRestoring(false);
      });
  }, []);

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
      value={{ token, userId, nickname, isRestoring, setToken, clearToken }}
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
