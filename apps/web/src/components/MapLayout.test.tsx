import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MapLayout from "./MapLayout";
import React from "react";

vi.mock("../pages/Map", () => ({
  default: () => <div data-testid="mock-map">Map</div>,
}));

function createWrapper(initialEntry: string = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MapLayout", () => {
  it("/以外のルートでマップが背景として表示されること", () => {
    render(
      <Routes>
        <Route element={<MapLayout />}>
          <Route
            path="/posts"
            element={<p data-testid="overlay">投稿一覧</p>}
          />
        </Route>
      </Routes>,
      { wrapper: createWrapper("/posts") }
    );
    expect(screen.getByTestId("mock-map")).toBeInTheDocument();
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("/conversations ルートでもマップが背景として表示されること", () => {
    render(
      <Routes>
        <Route element={<MapLayout />}>
          <Route
            path="/conversations"
            element={<p data-testid="overlay">会話一覧</p>}
          />
        </Route>
      </Routes>,
      { wrapper: createWrapper("/conversations") }
    );
    expect(screen.getByTestId("mock-map")).toBeInTheDocument();
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("/create ルートでもマップが背景として表示されること", () => {
    render(
      <Routes>
        <Route element={<MapLayout />}>
          <Route
            path="/create"
            element={<p data-testid="overlay">投稿作成</p>}
          />
        </Route>
      </Routes>,
      { wrapper: createWrapper("/create") }
    );
    expect(screen.getByTestId("mock-map")).toBeInTheDocument();
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("/ではアウトレットの子要素のみが表示されること", () => {
    render(
      <Routes>
        <Route element={<MapLayout />}>
          <Route path="/" element={<p data-testid="home">ホーム</p>} />
        </Route>
      </Routes>,
      { wrapper: createWrapper("/") }
    );
    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-map")).not.toBeInTheDocument();
  });
});
