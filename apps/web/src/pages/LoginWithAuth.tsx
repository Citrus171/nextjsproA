import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { createClient } from "../../../../packages/api-client/src/client";

export default function LoginWithAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = createClient({
      getToken: async () => null,
    });
    try {
      const res = await client.login(email, password);
      if (res?.accessToken) {
        setToken(res.accessToken);
        navigate("/");
      } else {
        setError("ログインに失敗しました");
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(
        msg === "Unauthorized"
          ? "認証に失敗しました（メール／パスワードを確認してください）"
          : `エラー: ${msg}`,
      );
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Login</h2>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
}
