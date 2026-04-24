import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
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
import Conversations from "./Conversations";

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

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({ refetchInterval: 5000 })
      );
    });
  });
});
