import { render, screen, act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import type {
  ConversationListItemDto,
  MessageResponseDto,
} from "../../../../packages/api-client/src/index";

const mockGetConversation = vi.fn();
const mockGetMessages = vi.fn();
const mockSendMessage = vi.fn();
const mockMarkAsRead = vi.fn();

const {
  mockSocketEmit,
  mockSocketDisconnect,
  mockSocketOff,
  listeners,
  mockSocket,
} = vi.hoisted(() => {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const mockSocketEmit = vi.fn();
  const mockSocketDisconnect = vi.fn();
  const mockSocketOff = vi.fn();
  const mockSocket = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }),
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect,
    off: mockSocketOff,
  };
  return {
    mockSocketEmit,
    mockSocketDisconnect,
    mockSocketOff,
    listeners,
    mockSocket,
  };
});

vi.mock("../lib/conversationSocket", () => ({
  createConversationSocket: vi.fn(() => mockSocket),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return {
    ...actual,
    useParams: () => ({ id: "conv-1" }),
  };
});

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ token: "mock-token", userId: "user-1" }),
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    getConversation: mockGetConversation,
    getMessages: mockGetMessages,
    sendMessage: mockSendMessage,
    markAsRead: mockMarkAsRead,
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

import { useQuery, useMutation } from "@tanstack/react-query";
import ConversationChat from "./ConversationChat";

const mockConversation = (
  overrides: Partial<ConversationListItemDto> = {}
): ConversationListItemDto => ({
  id: "conv-1",
  postId: "post-1",
  sightingId: "sighting-1",
  ownerId: "user-1",
  sighterId: "user-2",
  createdAt: "2024-01-01T00:00:00.000Z",
  postTitle: "迷子のネコ",
  partnerNickname: "相手ニック",
  lastMessage: null,
  unreadCount: 0,
  ...overrides,
});

const mockMessage = (
  overrides: Partial<MessageResponseDto> = {}
): MessageResponseDto => ({
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "user-1",
  body: "こんにちは",
  createdAt: "2024-01-01T00:00:00.000Z",
  readAt: null,
  ...overrides,
});

function setupQueryMocks({
  conversation = mockConversation(),
  messages = [mockMessage()],
  conversationLoading = false,
  messagesLoading = false,
  conversationError = null,
  messagesError = null,
}: {
  conversation?: ConversationListItemDto | null;
  messages?: MessageResponseDto[];
  conversationLoading?: boolean;
  messagesLoading?: boolean;
  conversationError?: Error | null;
  messagesError?: Error | null;
} = {}) {
  vi.mocked(useQuery).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (options: any) => {
      const key = options.queryKey[0];
      if (key === "conversation") {
        return {
          data: conversation,
          isLoading: conversationLoading,
          error: conversationError,
        } as ReturnType<typeof useQuery>;
      }
      return {
        data: messages,
        isLoading: messagesLoading,
        error: messagesError,
      } as ReturnType<typeof useQuery>;
    }
  );
  vi.mocked(useMutation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useMutation>);
}

describe("ConversationChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    mockSocket.on.mockImplementation(
      (event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = cb;
      }
    );
  });

  describe("ヘッダー表示", () => {
    it("ページ開時、相手ニックネームと投稿タイトルが表示されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      expect(screen.getByText("相手ニック")).toBeInTheDocument();
      expect(screen.getByText("迷子のネコ")).toBeInTheDocument();
    });
  });

  describe("メッセージ一覧", () => {
    it("メッセージ一覧が表示される時、各bodyが表示されること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({ id: "msg-1", body: "こんにちは" }),
          mockMessage({
            id: "msg-2",
            body: "見つかりましたか？",
            senderId: "user-2",
          }),
        ],
      });

      render(<ConversationChat />);

      expect(screen.getByText("こんにちは")).toBeInTheDocument();
      expect(screen.getByText("見つかりましたか？")).toBeInTheDocument();
    });

    it("自分のメッセージには自分用クラスが付くこと", () => {
      setupQueryMocks({
        messages: [
          mockMessage({ senderId: "user-1", body: "自分のメッセージ" }),
        ],
      });

      render(<ConversationChat />);

      const bubble = screen
        .getByText("自分のメッセージ")
        .closest("[data-sender]");
      expect(bubble).toHaveAttribute("data-sender", "self");
    });

    it("相手のメッセージには相手用クラスが付くこと", () => {
      setupQueryMocks({
        messages: [
          mockMessage({ senderId: "user-2", body: "相手のメッセージ" }),
        ],
      });

      render(<ConversationChat />);

      const bubble = screen
        .getByText("相手のメッセージ")
        .closest("[data-sender]");
      expect(bubble).toHaveAttribute("data-sender", "other");
    });
  });

  describe("Socket.io", () => {
    it("ページ開時に joinConversation イベントが送信されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      expect(mockSocketEmit).toHaveBeenCalledWith("joinConversation", "conv-1");
    });

    it("newMessage イベント受信時、メッセージリストに追加されること", async () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const newMsg = mockMessage({
        id: "msg-new",
        body: "新着メッセージ",
        senderId: "user-2",
      });
      act(() => {
        listeners["newMessage"](newMsg);
      });

      expect(await screen.findByText("新着メッセージ")).toBeInTheDocument();
    });
  });

  describe("メッセージ送信", () => {
    it("送信ボタンクリック時、mutate が呼ばれること", () => {
      const mockMutate = vi.fn();
      setupQueryMocks({ messages: [] });
      vi.mocked(useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useMutation>);

      render(<ConversationChat />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "test message" },
      });
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));

      expect(mockMutate).toHaveBeenCalledWith("test message");
    });

    it("1000文字超の入力は送信ボタンが無効になること", () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const longText = "a".repeat(1001);
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: longText },
      });

      expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled();
    });
  });

  describe("既読処理", () => {
    it("ページを開いた時に markAsRead が呼ばれること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      expect(mockMarkAsRead).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("ローディング・エラー", () => {
    it("メッセージローディング中は「読み込み中...」が表示されること", () => {
      setupQueryMocks({ messagesLoading: true, messages: [] });

      render(<ConversationChat />);

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("メッセージ取得エラー時は「メッセージの取得に失敗しました」が表示されること", () => {
      setupQueryMocks({
        messagesError: new Error("Network Error"),
        messages: [],
      });

      render(<ConversationChat />);

      expect(
        screen.getByText("メッセージの取得に失敗しました")
      ).toBeInTheDocument();
    });
  });
});
