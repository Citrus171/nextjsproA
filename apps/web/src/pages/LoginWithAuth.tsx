import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cat, Eye, EyeOff } from "lucide-react";
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
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      setAuthError(
        msg === "Unauthorized"
          ? "メールアドレスまたはパスワードが正しくありません"
          : `エラー: ${msg}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダービジュアル */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="flex items-center gap-3 mb-3">
          <Cat className="w-10 h-10 text-[#1a73e8]" strokeWidth={1.5} />
          <span className="text-3xl font-black text-slate-900">ねこさがし</span>
        </div>
        <p className="text-slate-500 text-sm text-center">
          埼玉の迷い猫・目撃情報を共有しよう
        </p>
      </div>

      {/* フォームカード */}
      <div className="flex-1 px-4">
        <div className="bg-white rounded-[2rem] p-6 shadow-sm max-w-sm mx-auto">
          {authError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-bold text-slate-700"
              >
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-slate-50 border-none rounded-xl text-slate-900 placeholder:text-slate-400"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-bold text-slate-700"
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
                  className="h-12 bg-slate-50 border-none rounded-xl text-slate-900 placeholder:text-slate-400 pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label="パスワードを表示"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className="w-full h-12 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform"
            >
              {submitting ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            アカウントをお持ちでない方は{" "}
            <Link
              to="/register"
              className="text-[#1a73e8] font-bold hover:underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
