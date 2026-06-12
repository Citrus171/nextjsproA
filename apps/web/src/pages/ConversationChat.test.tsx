import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return {
    ...actual,
    useParams: () => ({ id: "conv-1" }),
    useNavigate: () => mockNavigate,
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
  postStatus: null,
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
  imageUrl: null,
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
  messagesRefetch = vi.fn(),
}: {
  conversation?: ConversationListItemDto | null;
  messages?: MessageResponseDto[];
  conversationLoading?: boolean;
  messagesLoading?: boolean;
  conversationError?: Error | null;
  messagesError?: Error | null;
  messagesRefetch?: ReturnType<typeof vi.fn>;
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
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      return {
        data: messages,
        isLoading: messagesLoading,
        error: messagesError,
        refetch: messagesRefetch,
      } as unknown as ReturnType<typeof useQuery>;
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
    it("ページ開時、相手ニックネームがヘッダーに表示されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      const header = screen
        .getByText("相手ニック")
        .closest("[data-testid='chat-header']");
      expect(header).toHaveClass("flex");
      expect(header).toHaveClass("items-center");
      expect(header).toHaveClass("gap-3");
    });

    it("← 会話一覧ボタンをクリックした時、/conversations に遷移すること", async () => {
      const user = userEvent.setup();
      setupQueryMocks();

      render(<ConversationChat />);

      await user.click(screen.getByRole("button", { name: "会話一覧に戻る" }));

      expect(mockNavigate).toHaveBeenCalledWith("/conversations");
    });

    it("メッセージリストがスクロール可能な領域であること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      const list = document.querySelector("[data-testid='message-list']");
      expect(list).toHaveClass("flex-1");
      expect(list).toHaveClass("overflow-y-auto");
    });

    it("入力欄が画面下部に固定されていること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      const inputArea = document.querySelector("[data-testid='chat-input']");
      expect(inputArea).toHaveClass("sticky");
      expect(inputArea).toHaveClass("bottom-0");
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

    it("自分のメッセージが右寄せで青色のバブルスタイルであること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({ senderId: "user-1", body: "自分のメッセージ" }),
        ],
      });

      render(<ConversationChat />);

      const bubble = screen
        .getByText("自分のメッセージ")
        .closest("[data-sender]");
      expect(bubble).toHaveClass("bg-primary");
      expect(bubble).toHaveClass("text-primary-foreground");
      expect(bubble).toHaveClass("rounded-[1.25rem]");
      expect(bubble).toHaveClass("rounded-br-sm");
      expect(bubble).toHaveClass("ml-auto");
    });

    it("相手のメッセージが左寄せでグレーのバブルスタイルであること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({ senderId: "user-2", body: "相手のメッセージ" }),
        ],
      });

      render(<ConversationChat />);

      const bubble = screen
        .getByText("相手のメッセージ")
        .closest("[data-sender]");
      expect(bubble).toHaveClass("bg-muted");
      expect(bubble).toHaveClass("text-foreground");
      expect(bubble).toHaveClass("rounded-[1.25rem]");
      expect(bubble).toHaveClass("rounded-bl-sm");
      expect(bubble).toHaveClass("mr-auto");
    });
  });

  describe("Socket.io", () => {
    it("ページ開時に joinConversation イベントが送信されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      act(() => {
        listeners["connect"]?.();
      });

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

    it("disconnect イベント受信時、切断バナーが表示されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      act(() => {
        listeners["connect"]?.();
      });
      act(() => {
        listeners["disconnect"]?.();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "接続が切れました。再接続中…"
      );
    });

    it("切断バナーはインラインstyleではなくTailwindクラスでスタイルされていること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      act(() => {
        listeners["connect"]?.();
      });
      act(() => {
        listeners["disconnect"]?.();
      });

      const banner = screen.getByRole("alert");
      expect(banner).toHaveClass("bg-destructive/10");
      expect(banner).toHaveClass("text-destructive");
      expect(banner).toHaveClass("text-xs");
      expect(banner).toHaveClass("px-3");
      expect(banner).toHaveClass("py-2");
      expect(banner).not.toHaveAttribute("style");
    });

    it("connect イベント受信時、切断バナーが非表示になること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      act(() => {
        listeners["connect"]?.();
      });
      act(() => {
        listeners["disconnect"]?.();
      });
      act(() => {
        listeners["connect"]?.();
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("connect_error イベント受信時、切断バナーが表示されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);

      act(() => {
        listeners["connect"]?.();
      });
      act(() => {
        listeners["connect_error"]?.();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "接続が切れました。再接続中…"
      );
    });

    it("再接続時に joinConversation が再送されること", () => {
      setupQueryMocks();

      render(<ConversationChat />);
      mockSocketEmit.mockClear();

      act(() => {
        listeners["connect"]?.();
      });

      expect(mockSocketEmit).toHaveBeenCalledWith("joinConversation", "conv-1");
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

      expect(mockMutate).toHaveBeenCalledWith({
        body: "test message",
        image: undefined,
      });
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

  describe("画像送信", () => {
    it("入力エリアに画像選択ボタンが表示されること", () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      expect(
        screen.getByRole("button", { name: /画像を選択/ })
      ).toBeInTheDocument();
    });

    it("画像選択後、プレビュー画像が表示されること", () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
      const input = document.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByAltText("送信画像プレビュー")).toBeInTheDocument();
    });

    it("画像のみ選択して送信する時、image を含む mutate が呼ばれること", () => {
      const mockMutate = vi.fn();
      setupQueryMocks({ messages: [] });
      vi.mocked(useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useMutation>);

      render(<ConversationChat />);

      const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
      const input = document.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /送信/ }));

      expect(mockMutate).toHaveBeenCalledWith({
        body: undefined,
        image: file,
      });
    });

    it("画像選択後、テキストなし・画像のみでも送信ボタンが有効であること", () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
      const input = document.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByRole("button", { name: /送信/ })).not.toBeDisabled();
    });

    it("プレビューのキャンセルボタンをクリックした時、プレビューが消えること", () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
      const input = document.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByAltText("送信画像プレビュー")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /画像をキャンセル/ }));

      expect(
        screen.queryByAltText("送信画像プレビュー")
      ).not.toBeInTheDocument();
    });
  });

  describe("画像メッセージ表示", () => {
    it("imageUrl を持つメッセージにサムネイルが表示されること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({
            id: "msg-img",
            body: null,
            imageUrl: "/uploads/conversations/conv-1/abc.jpg",
          }),
        ],
      });

      render(<ConversationChat />);

      const thumbnail = screen.getByAltText("送信画像");
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute(
        "src",
        "/uploads/conversations/conv-1/abc.jpg"
      );
    });

    it("サムネイルをクリックした時、フルサイズモーダルが表示されること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({
            id: "msg-img",
            body: null,
            imageUrl: "/uploads/conversations/conv-1/abc.jpg",
          }),
        ],
      });

      render(<ConversationChat />);

      fireEvent.click(screen.getByAltText("送信画像"));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByAltText("フルサイズ画像")).toHaveAttribute(
        "src",
        "/uploads/conversations/conv-1/abc.jpg"
      );
    });

    it("モーダルの外側をクリックした時、モーダルが閉じること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({
            id: "msg-img",
            body: null,
            imageUrl: "/uploads/conversations/conv-1/abc.jpg",
          }),
        ],
      });

      render(<ConversationChat />);

      fireEvent.click(screen.getByAltText("送信画像"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("dialog"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("bodyがあり imageUrl もあるメッセージ、両方表示されること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({
            id: "msg-both",
            body: "テキストと画像",
            imageUrl: "/uploads/conversations/conv-1/abc.jpg",
          }),
        ],
      });

      render(<ConversationChat />);

      expect(screen.getByText("テキストと画像")).toBeInTheDocument();
      expect(screen.getByAltText("送信画像")).toBeInTheDocument();
    });

    it("WebSocket で imageUrl を含むメッセージが届いた時、サムネイルが表示されること", async () => {
      setupQueryMocks({ messages: [] });

      render(<ConversationChat />);

      const newMsg = mockMessage({
        id: "msg-ws",
        body: null,
        imageUrl: "/uploads/conversations/conv-1/ws.jpg",
      });
      act(() => {
        listeners["newMessage"](newMsg);
      });

      expect(await screen.findByAltText("送信画像")).toHaveAttribute(
        "src",
        "/uploads/conversations/conv-1/ws.jpg"
      );
    });

    it("imageUrl がない通常メッセージが正常に表示されること", () => {
      setupQueryMocks({
        messages: [
          mockMessage({
            id: "msg-text",
            body: "普通のテキスト",
            imageUrl: null,
          }),
        ],
      });

      render(<ConversationChat />);

      expect(screen.getByText("普通のテキスト")).toBeInTheDocument();
      expect(screen.queryByAltText("送信画像")).not.toBeInTheDocument();
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
    it("メッセージローディング中はチャットバブル形のスケルトンが表示されること", () => {
      setupQueryMocks({ messagesLoading: true, messages: [] });

      render(<ConversationChat />);

      expect(screen.getByTestId("chat-loading-skeleton")).toBeInTheDocument();
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    it("スケルトンは role=status と読み込み中ラベルでスクリーンリーダーに通知されること", () => {
      setupQueryMocks({ messagesLoading: true, messages: [] });

      render(<ConversationChat />);

      expect(
        screen.getByRole("status", { name: "読み込み中" })
      ).toBeInTheDocument();
    });

    it("メッセージ取得エラー時は「メッセージの取得に失敗しました」が統一されたスタイルで表示されること", () => {
      setupQueryMocks({
        messagesError: new Error("Network Error"),
        messages: [],
      });

      render(<ConversationChat />);

      expect(
        screen.getByText("メッセージの取得に失敗しました")
      ).toBeInTheDocument();
    });

    it("エラー表示が統一されたスタイルであること", () => {
      setupQueryMocks({
        messagesError: new Error("Network Error"),
        messages: [],
      });

      render(<ConversationChat />);

      const errorText = screen.getByText("メッセージの取得に失敗しました");
      expect(errorText.closest("div")).toHaveClass("text-center");
      expect(errorText).toHaveClass("text-destructive");
      expect(errorText).toHaveClass("text-sm");
    });

    it("エラー時に再試行ボタンをクリックするとメッセージのrefetchが呼ばれること", async () => {
      const messagesRefetch = vi.fn();
      setupQueryMocks({
        messagesError: new Error("Network Error"),
        messages: [],
        messagesRefetch,
      });

      render(<ConversationChat />);

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "再試行" }));

      expect(messagesRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
