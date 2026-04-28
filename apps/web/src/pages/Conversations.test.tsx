import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ConversationListItemDto } from "../../../../packages/api-client/src/index";

const mockNavigate = vi.fn();
const mockListConversations = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    listConversations: mockListConversations,
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

import { useQuery } from "@tanstack/react-query";
import Conversations, { formatDate } from "./Conversations";

const mockConversation = (
  overrides: Partial<ConversationListItemDto> = {}
): ConversationListItemDto => ({
  id: "conv-1",
  postId: "post-1",
  sightingId: "sighting-1",
  ownerId: "owner-1",
  sighterId: "sighter-1",
  createdAt: "2024-01-01T00:00:00.000Z",
  postTitle: "迷子のネコ",
  partnerNickname: "相手ニック",
  lastMessage: {
    body: "最新メッセージ",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
  unreadCount: 0,
  ...overrides,
});

describe("Conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("会話一覧の表示", () => {
    it("会話一覧が表示される時、相手ニックネームと投稿タイトルが表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation()],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("相手ニック")).toBeInTheDocument();
      expect(screen.getByText("迷子のネコ")).toBeInTheDocument();
    });

    it("lastMessageがある時、最新メッセージ本文が表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation()],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("最新メッセージ")).toBeInTheDocument();
    });

    it("lastMessageがない時、メッセージなし文言が表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation({ lastMessage: null })],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(
        screen.getByText("メッセージはまだありません")
      ).toBeInTheDocument();
    });

    it("ローディング中はスピナー表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("会話がない時は空メッセージが表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("会話はまだありません")).toBeInTheDocument();
    });

    it("取得エラーの時、エラーメッセージが表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network Error"),
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("会話の取得に失敗しました")).toBeInTheDocument();
    });
  });

  describe("未読バッジ", () => {
    it("unreadCountが1以上の時、未読バッジが表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation({ unreadCount: 3 })],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("unreadCountが1以上の時、未読バッジが青色の丸スタイルで表示されること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation({ unreadCount: 3 })],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      const badge = screen.getByText("3");
      expect(badge).toHaveClass("bg-[#1a73e8]");
      expect(badge).toHaveClass("text-white");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("w-5");
      expect(badge).toHaveClass("h-5");
    });

    it("unreadCountが0の時、未読バッジが表示されないこと", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation({ unreadCount: 0 })],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("← Map ボタンをクリックした時、/ に遷移すること", async () => {
      const user = userEvent.setup();
      vi.mocked(useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      await user.click(screen.getByRole("button", { name: "Mapに戻る" }));

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("会話セルをクリックした時、/conversations/:idへ遷移すること", async () => {
      const user = userEvent.setup();
      vi.mocked(useQuery).mockReturnValue({
        data: [mockConversation({ id: "conv-abc" })],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      await user.click(screen.getByRole("button", { name: /相手ニック/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/conversations/conv-abc");
    });
  });

  describe("ポーリング設定", () => {
    it("5秒間隔でポーリングするようにuseQueryが呼ばれること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      const options = vi.mocked(useQuery).mock.calls[0][0] as unknown as {
        refetchInterval: (query: {
          state: { error: unknown };
        }) => number | false;
      };
      expect(typeof options.refetchInterval).toBe("function");
      expect(options.refetchInterval({ state: { error: null } })).toBe(5000);
    });

    it("エラー時はポーリングが停止すること", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as ReturnType<typeof useQuery>);

      render(<Conversations />);

      const options = vi.mocked(useQuery).mock.calls[0][0] as unknown as {
        refetchInterval: (query: {
          state: { error: unknown };
        }) => number | false;
      };
      expect(
        options.refetchInterval({ state: { error: new Error("test") } })
      ).toBe(false);
    });
  });
});

describe("formatDate", () => {
  const NOW = "2024-06-15T12:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1分未満の時、「今」を返すこと", () => {
    expect(formatDate("2024-06-15T11:59:30.000Z")).toBe("今");
  });

  it("1分の時、「1分前」を返すこと", () => {
    expect(formatDate("2024-06-15T11:59:00.000Z")).toBe("1分前");
  });

  it("59分の時、「59分前」を返すこと", () => {
    expect(formatDate("2024-06-15T11:01:00.000Z")).toBe("59分前");
  });

  it("60分（1時間）の時、「1時間前」を返すこと", () => {
    expect(formatDate("2024-06-15T11:00:00.000Z")).toBe("1時間前");
  });

  it("23時間の時、「23時間前」を返すこと", () => {
    expect(formatDate("2024-06-14T13:00:00.000Z")).toBe("23時間前");
  });

  it("24時間（1日）の時、「1日前」を返すこと", () => {
    expect(formatDate("2024-06-14T12:00:00.000Z")).toBe("1日前");
  });

  it("6日の時、「6日前」を返すこと", () => {
    expect(formatDate("2024-06-09T12:00:00.000Z")).toBe("6日前");
  });

  it("7日以上の時、年/月/日形式で返すこと", () => {
    expect(formatDate("2024-06-08T12:00:00.000Z")).toBe("2024/6/8");
  });

  it("年またぎの時、年情報が含まれること", () => {
    vi.setSystemTime(new Date("2025-01-05T12:00:00.000Z"));
    expect(formatDate("2024-12-25T12:00:00.000Z")).toBe("2024/12/25");
  });
});
