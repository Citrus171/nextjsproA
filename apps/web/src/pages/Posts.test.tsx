import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
const mockListPosts = vi.fn();
const mockDeletePost = vi.fn();
const mockInvalidateQueries = vi.fn();
const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));
let triggerIntersection: (() => void) | null = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    listPosts: mockListPosts,
    deletePost: mockDeletePost,
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { useInfiniteQuery } from "@tanstack/react-query";
import Posts from "./Posts";

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function mockInfiniteQuery(
  partial: Partial<ReturnType<typeof useInfiniteQuery>> = {}
) {
  const defaults = {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  };
  vi.mocked(useInfiniteQuery).mockReturnValue({
    ...defaults,
    ...partial,
  } as ReturnType<typeof useInfiniteQuery>);
}

function postFactory(overrides = {}) {
  return {
    id: "post-1",
    title: "タイトル",
    description: "説明文です",
    createdAt: "2024-01-15T00:00:00Z",
    lostDate: "2024-01-15T00:00:00Z",
    status: "lost",
    postType: "cat",
    userId: "user-1",
    updatedAt: "2024-01-15T00:00:00Z",
    images: [] as { url: string; id: string }[],
    petDetail: {
      name: "みけ",
      color: "三毛",
      age: "2歳",
      features: "しっぽが短い",
      id: "pet-1",
    },
    location: {
      city: "さいたま市",
      address: "大宮区",
      prefecture: "saitama",
      lat: 35.9,
      lng: 139.6,
      id: "loc-1",
    },
    ...overrides,
  };
}

describe("Posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerIntersection = null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        callback: IntersectionObserverCallback;
        root: Element | Document | null = null;
        rootMargin: string = "";
        thresholds: ReadonlyArray<number> = [];
        observe = vi.fn((el: Element) => {
          triggerIntersection = () => {
            this.callback(
              [
                {
                  isIntersecting: true,
                  target: el,
                } as IntersectionObserverEntry,
              ],
              this as unknown as IntersectionObserver
            );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("読み込み状態", () => {
    it("データ取得中はローディングスピナーが表示されること", () => {
      mockInfiniteQuery({ isLoading: true });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByTestId("posts-loading-spinner")).toBeInTheDocument();
    });
  });

  describe("カードグリッド", () => {
    it("投稿データがカード形式で表示されること", () => {
      const p = postFactory();
      mockInfiniteQuery({
        data: { pages: [{ items: [p], total: 1 }], pageParams: [1] },
        hasNextPage: false,
      });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByText("みけ")).toBeInTheDocument();
      expect(screen.getByText("さいたま市・大宮区")).toBeInTheDocument();
      expect(screen.getByText("説明文です")).toBeInTheDocument();
    });

    it("画像がない時は「画像がありません」と表示されること", () => {
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByText("画像がありません")).toBeInTheDocument();
    });

    it("ペット名がない時は「名前不明」と表示されること", () => {
      mockInfiniteQuery({
        data: {
          pages: [
            {
              items: [postFactory({ petDetail: null })],
              total: 1,
            },
          ],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByText("名前不明")).toBeInTheDocument();
    });
  });

  describe("Infinite Scroll", () => {
    it("センチネルが交差した時、次のページをフェッチすること", async () => {
      const fetchNextPage = vi.fn();
      mockInfiniteQuery({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      });
      render(<Posts />, { wrapper: createWrapper() });
      await waitFor(() => expect(triggerIntersection).not.toBeNull());
      triggerIntersection!();
      await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
    });

    it("追加フェッチ中はローディングスピナーが表示されること", () => {
      mockInfiniteQuery({ isFetchingNextPage: true, hasNextPage: true });
      render(<Posts />, { wrapper: createWrapper() });
      expect(
        screen.getByTestId("posts-loading-more-spinner")
      ).toBeInTheDocument();
    });

    it("全件表示後は「これ以上ありません」と表示されること", () => {
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
        hasNextPage: false,
      });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByTestId("posts-no-more")).toBeInTheDocument();
    });

    it("投稿が0件の時は「投稿がありません」と表示されること", () => {
      mockInfiniteQuery({
        data: { pages: [{ items: [], total: 0 }], pageParams: [1] },
        hasNextPage: false,
      });
      render(<Posts />, { wrapper: createWrapper() });
      expect(screen.getByText("投稿がありません")).toBeInTheDocument();
    });
  });

  describe("削除フロー", () => {
    it("Deleteボタンをクリックした時、AlertDialogが表示されること", async () => {
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("投稿を削除しますか？")).toBeInTheDocument();
    });

    it("AlertDialogでキャンセルをクリックした時、削除が実行されないこと", async () => {
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(mockDeletePost).not.toHaveBeenCalled();
    });

    it("AlertDialogで削除を確認した時、投稿が削除され削除完了トーストが表示されること", async () => {
      mockDeletePost.mockResolvedValueOnce({});
      mockInvalidateQueries.mockResolvedValueOnce(undefined);
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "削除する" }));
      await waitFor(() => {
        expect(mockDeletePost).toHaveBeenCalledWith("post-1");
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["posts"],
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("削除しました");
    });

    it("削除が失敗した時、エラートーストが表示されること", async () => {
      mockDeletePost.mockRejectedValueOnce(new Error("fail"));
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "削除する" }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("削除に失敗しました");
      });
    });
  });

  describe("Map導線", () => {
    it("地図アイコンボタンをクリックした時、/?postId=xxx に遷移すること", async () => {
      mockInfiniteQuery({
        data: {
          pages: [{ items: [postFactory()], total: 1 }],
          pageParams: [1],
        },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: "みけの位置を開く" })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/?postId=post-1");
    });
  });

  describe("ナビゲーション", () => {
    it("← Map ボタンをクリックした時、/ に遷移すること", async () => {
      mockInfiniteQuery({
        data: { pages: [{ items: [], total: 0 }], pageParams: [1] },
      });
      render(<Posts />, { wrapper: createWrapper() });
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "← Map" }));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
