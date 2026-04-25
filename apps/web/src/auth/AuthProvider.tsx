import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  setToken: (t: string | null) => void;
  clearToken: () => void;
};

function decodeUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const setToken = (t: string | null) => {
    setTokenState(t);
    setUserId(t ? decodeUserId(t) : null);
  };
  const clearToken = () => {
    setTokenState(null);
    setUserId(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, userId, setToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
