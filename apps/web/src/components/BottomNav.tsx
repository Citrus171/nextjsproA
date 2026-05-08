import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, List, MessageCircle, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useApiClient } from "../api/orvalClient";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";

interface BottomNavProps {
  currentPath: "/posts" | "/conversations";
}

const TABS = [
  { path: "/", label: "マップ", Icon: MapPin },
  { path: "/posts", label: "自分の投稿", Icon: List },
  { path: "/conversations", label: "会話", Icon: MessageCircle },
] as const;

export default function BottomNav({ currentPath }: BottomNavProps) {
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const api = useApiClient();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // エラー時もローカル状態はクリアする
    }
    setShowLogoutDialog(false);
    clearToken();
  };

  return (
    <>
      <nav
        className="fixed left-0 right-0 bottom-0 z-[1300] grid grid-cols-4 gap-2 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5 bg-gradient-to-t from-white via-white/[0.94] to-white/[0.02]"
        aria-label="ページナビゲーション"
      >
        {TABS.map(({ path, label, Icon }) => {
          const isActive = currentPath === path;
          return (
            <button
              key={path}
              type="button"
              className={`inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border text-xs font-bold shadow-[0_4px_16px_rgba(15,23,42,0.08)] cursor-pointer outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--ring)),0_4px_16px_rgba(15,23,42,0.08)] transition-colors ${
                isActive
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-[#e4e7eb] bg-white text-[#202124]"
              }`}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-[#e4e7eb] bg-white text-[#5f6368] text-xs font-bold shadow-[0_4px_16px_rgba(15,23,42,0.08)] cursor-pointer outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--ring)),0_4px_16px_rgba(15,23,42,0.08)]"
          aria-label="ログアウト"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </nav>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ログイン状態を解除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
