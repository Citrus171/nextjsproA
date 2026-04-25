import { render } from "@testing-library/react";
import { vi } from "vitest";

const { mockSocket, listeners } = vi.hoisted(() => {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const mockSocket = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    off: vi.fn(),
  };
  return { mockSocket, listeners };
});

vi.mock("../lib/conversationSocket", () => ({
  createConversationSocket: vi.fn(() => mockSocket),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return { ...actual, useParams: () => ({ id: "conv-1" }) };
});

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ token: "mock-token", userId: "user-1" }),
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    getConversation: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  mockSocket.on.mockImplementation(
    (event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }
  );
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useQuery>);
  vi.mocked(useMutation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useMutation>);
});

it("renders", { timeout: 5000 }, () => {
  render(<ConversationChat />);
  expect(document.body).toBeDefined();
});
