import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import Layout from "./Layout";
import React, { useEffect } from "react";

vi.mock("../../../packages/api-client/src/index", () => ({
  authControllerRefresh: vi.fn().mockRejectedValue(new Error("no cookie")),
}));

function SetToken({ token }: { token: string }) {
  const { setToken } = useAuth();
  useEffect(() => {
    setToken(token);
  }, [token, setToken]);
  return null;
}

function createWrapper(
  token: string | null = null,
  initialEntry: string = "/"
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          {token && <SetToken token={token} />}
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Layout", () => {
  it("アウトレットの子ルートがレンダリングされること", () => {
    render(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p data-testid="content">コンテンツ</p>} />
        </Route>
      </Routes>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("ボトムタブが表示されること", () => {
    render(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>コンテンツ</p>} />
        </Route>
      </Routes>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("/login パスではタブバーが表示されないこと", () => {
    render(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<p>ログイン</p>} />
        </Route>
      </Routes>,
      { wrapper: createWrapper(null, "/login") }
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("/register パスではタブバーが表示されないこと", () => {
    render(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/register" element={<p>登録</p>} />
        </Route>
      </Routes>,
      { wrapper: createWrapper(null, "/register") }
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  describe("authRequired タブ", () => {
    it("未認証時は /login への誘導リンクが表示されること", () => {
      render(
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>コンテンツ</p>} />
          </Route>
        </Routes>,
        { wrapper: createWrapper(null, "/") }
      );
      const link = screen.getByRole("link", { name: "投稿" });
      expect(link).toHaveAttribute("href", "/login");
    });

    it("認証時はタブ本来のリンク先が表示され、現在パスならハイライトされること", () => {
      render(
        <Routes>
          <Route element={<Layout />}>
            <Route path="/create" element={<p>投稿作成</p>} />
          </Route>
        </Routes>,
        { wrapper: createWrapper("mock-token", "/create") }
      );
      const link = screen.getByRole("link", { name: "投稿" });
      expect(link).toHaveAttribute("href", "/create");
      expect(link.className).toContain("text-primary");
    });
  });

  describe("authOnly タブ", () => {
    it("未認証時は表示されないこと", () => {
      render(
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>コンテンツ</p>} />
          </Route>
        </Routes>,
        { wrapper: createWrapper(null, "/") }
      );
      expect(
        screen.queryByRole("link", { name: "アカウント" })
      ).not.toBeInTheDocument();
    });

    it("認証時は表示されること", () => {
      render(
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>コンテンツ</p>} />
          </Route>
        </Routes>,
        { wrapper: createWrapper("mock-token", "/") }
      );
      expect(
        screen.getByRole("link", { name: "アカウント" })
      ).toBeInTheDocument();
    });
  });
});
