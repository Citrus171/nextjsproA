import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import App from "@/App";
import React, { useEffect } from "react";

vi.mock("../../../packages/api-client/src/index", () => ({
  authControllerRefresh: vi.fn().mockRejectedValue(new Error("no cookie")),
}));

vi.mock("@/api/orvalClient", () => ({
  useApiClient: () => ({
    listConversations: vi.fn().mockResolvedValue([]),
    listPosts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getMapMarkers: vi.fn().mockResolvedValue([]),
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/pages/UsersModal", () => ({ default: () => null }));

function SetToken({ token }: { token: string }) {
  const { setToken } = useAuth();
  useEffect(() => {
    setToken(token);
  }, [token, setToken]);
  return null;
}

const createWrapper = (
  token: string | null = null,
  initialEntry: string = "/posts"
) => {
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
};

describe("App", () => {
  it("未認証で /posts にアクセスしたとき、/login にリダイレクトされること", async () => {
    const Wrapper = createWrapper(null, "/posts");
    render(
      <Wrapper>
        <App />
      </Wrapper>
    );

    expect(
      await screen.findByRole("button", { name: "ログイン" })
    ).toBeInTheDocument();
  });

  it("認証済みで /posts にアクセスしたとき、Posts ページが表示されること", async () => {
    const Wrapper = createWrapper("mock-token", "/posts");
    render(
      <Wrapper>
        <App />
      </Wrapper>
    );

    expect(
      await screen.findByRole("link", { name: "新規投稿" })
    ).toBeInTheDocument();
  });

  it("未認証で /create にアクセスしたとき、/login にリダイレクトされること", async () => {
    const Wrapper = createWrapper(null, "/create");
    render(
      <Wrapper>
        <App />
      </Wrapper>
    );

    expect(
      await screen.findByRole("button", { name: "ログイン" })
    ).toBeInTheDocument();
  });
});
