import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authControllerRefresh } from "../../../../packages/api-client/src/index";

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  isRestoring: boolean;
  setToken: (t: string | null) => void;
  clearToken: () => void;
};

function decodeUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return (payload.sub as string) ?? null;
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

  useEffect(() => {
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

  const userId = decodeUserId(token);

  return (
    <AuthContext.Provider
      value={{ token, userId, isRestoring, setToken, clearToken }}
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
