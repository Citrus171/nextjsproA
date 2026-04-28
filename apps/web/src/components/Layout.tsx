import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { cn } from "../lib/utils";
import { Home, LayoutList, Plus, MessageCircle, User } from "lucide-react";

interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  authRequired?: boolean;
  authOnly?: boolean;
}

const TABS: TabItem[] = [
  { to: "/", label: "マップ", icon: Home },
  { to: "/posts", label: "一覧", icon: LayoutList },
  { to: "/create", label: "投稿", icon: Plus, authRequired: true },
  {
    to: "/conversations",
    label: "会話",
    icon: MessageCircle,
    authRequired: true,
  },
  { to: "/login", label: "アカウント", icon: User, authOnly: true },
];

const HIDE_TAB_BAR_PATHS = ["/login", "/register"];

export default function Layout() {
  const { token } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;
  const hideTabBar = HIDE_TAB_BAR_PATHS.includes(currentPath);

  return (
    <div className="min-h-screen bg-slate-50 font-manrope">
      <main className={hideTabBar ? "" : "pb-20"}>
        <Outlet />
      </main>

      {!hideTabBar && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-[2000] bg-white border-t border-slate-200 px-2 pb-[env(safe-area-inset-bottom)]"
          role="navigation"
          aria-label="メインナビゲーション"
        >
          <div className="flex items-center justify-around h-14">
            {TABS.map((tab) => {
              if (tab.authOnly && !token) return null;
              if (tab.authRequired && !token) {
                return (
                  <Link
                    key={tab.to}
                    to="/login"
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-full px-2 rounded-lg transition-colors",
                      currentPath === tab.to
                        ? "text-blue-600"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                    aria-label={tab.label}
                  >
                    <tab.icon size={22} aria-hidden="true" />
                    <span className="text-[10px] font-bold">{tab.label}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-full px-2 rounded-lg transition-colors",
                    currentPath === tab.to
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                  aria-label={tab.label}
                >
                  <tab.icon size={22} aria-hidden="true" />
                  <span className="text-[10px] font-bold">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
