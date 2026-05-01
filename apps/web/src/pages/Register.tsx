import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cat, Eye, EyeOff, AlertCircle } from "lucide-react";
import { usersControllerRegister } from "../../../../packages/api-client/src/index";
import type { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!EMAIL_RE.test(email)) {
      errs.email = "正しいメールアドレスを入力してください";
    }
    if (password.length < 8) {
      errs.password = "パスワードは8文字以上で入力してください";
    }
    if (password !== confirm) {
      errs.confirm = "パスワードが一致しません";
    }
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await usersControllerRegister({
        name: name || undefined,
        email,
        password,
      });
      navigate("/login");
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
      const msg =
        axiosErr.response?.data?.error ||
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        "登録に失敗しました";
      setAuthError(String(msg));
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

          <form onSubmit={submit} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-bold text-foreground"
                >
                  お名前
                </Label>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  任意
                </span>
              </div>
              <Input
                id="name"
                type="text"
                placeholder="ニックネーム"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-muted border-none rounded-xl text-foreground placeholder:text-muted-foreground"
                autoComplete="nickname"
              />
            </div>

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
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
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
                  placeholder="8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-muted border-none rounded-xl text-foreground placeholder:text-muted-foreground pr-12"
                  autoComplete="new-password"
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirm"
                className="text-sm font-bold text-foreground"
              >
                パスワード（確認）
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="もう一度入力"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 bg-muted border-none rounded-xl text-foreground placeholder:text-muted-foreground pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label="確認パスワードを表示"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded"
                >
                  {showConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive">{errors.confirm}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-md active:scale-[0.98] transition-transform"
            >
              {submitting ? "作成中..." : "アカウントを作成"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            すでにアカウントをお持ちの方は{" "}
            <Link
              to="/login"
              className="text-primary font-bold hover:underline"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
