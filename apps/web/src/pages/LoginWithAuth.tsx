import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cat, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useApiClient } from "../api/orvalClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginWithAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const api = useApiClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      if (res?.accessToken) {
        setToken(res.accessToken);
        navigate("/posts");
      } else {
        setAuthError("ログインに失敗しました");
      }
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      if (status === 429) {
        setAuthError(
          "リクエスト回数が多すぎます。しばらく待ってから再試行してください。"
        );
      } else if (status === 500 || status === 502 || status === 503) {
        setAuthError(
          "サーバーに接続できません。APIサーバーが起動しているか確認してください。"
        );
      } else {
        setAuthError(
          msg === "Unauthorized"
            ? "メールアドレスまたはパスワードが正しくありません"
            : `エラー: ${msg}`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background font-manrope flex flex-col">
      {/* ヘッダービジュアル */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="flex items-center gap-3 mb-3">
          <Cat className="w-10 h-10 text-primary" strokeWidth={1.5} />
          <span className="text-3xl font-extrabold text-foreground">
            ねこさがし
          </span>
        </div>
        <p className="text-muted-foreground text-sm text-center">
          埼玉の迷い猫・目撃情報を共有しよう
        </p>
      </div>

      {/* フォームカード */}
      <div className="flex-1 px-4">
        <div className="bg-card rounded-3xl p-6 shadow-sm max-w-sm mx-auto">
          {authError && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-bold text-foreground"
              >
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-muted border-none rounded-xl text-foreground placeholder:text-muted-foreground"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-bold text-foreground"
              >
                パスワード
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-muted border-none rounded-xl text-foreground placeholder:text-muted-foreground pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label="パスワードを表示"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-md active:scale-[0.98] transition-transform"
            >
              {submitting ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link
              to="/register"
              className="text-primary font-bold hover:underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
