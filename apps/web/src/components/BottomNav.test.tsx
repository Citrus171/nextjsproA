import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockClearToken = vi.fn();

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

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    token: "test-token",
    userId: "user-1",
    nickname: "TestUser",
    isRestoring: false,
    setToken: vi.fn(),
    clearToken: mockClearToken,
  }),
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    logout: mockLogout,
  }),
}));

import BottomNav from "./BottomNav";

function renderBottomNav(currentPath: "/posts" | "/conversations") {
  return render(
    <MemoryRouter>
      <BottomNav currentPath={currentPath} />
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  describe("タブ表示", () => {
    it("currentPath=/posts の時、「自分の投稿」タブがアクティブ状態で表示されること", () => {
      renderBottomNav("/posts");
      const postsButton = screen.getByRole("button", { name: "自分の投稿" });
      expect(postsButton).toBeInTheDocument();
      expect(postsButton.className).toContain("bg-primary/10");
    });

    it("currentPath=/conversations の時、「会話」タブがアクティブ状態で表示されること", () => {
      renderBottomNav("/conversations");
      const convButton = screen.getByRole("button", { name: "会話" });
      expect(convButton).toBeInTheDocument();
      expect(convButton.className).toContain("bg-primary/10");
    });

    it("ログアウトアイコンタブが表示されること", () => {
      renderBottomNav("/posts");
      expect(
        screen.getByRole("button", { name: "ログアウト" })
      ).toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("マップタブをクリックした時、/ に遷移すること", async () => {
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "マップ" }));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("自分の投稿タブをクリックした時、/posts に遷移すること", async () => {
      renderBottomNav("/conversations");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "自分の投稿" }));
      expect(mockNavigate).toHaveBeenCalledWith("/posts");
    });

    it("会話タブをクリックした時、/conversations に遷移すること", async () => {
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "会話" }));
      expect(mockNavigate).toHaveBeenCalledWith("/conversations");
    });
  });

  describe("ログアウト", () => {
    it("ログアウトアイコンをクリックした時、確認ダイアログが表示されること", async () => {
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("ログアウトしますか？")).toBeInTheDocument();
    });

    it("確認ダイアログでログアウトを実行した時、logout API と clearToken が呼ばれること", async () => {
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockClearToken).toHaveBeenCalled();
      });
    });

    it("確認ダイアログでキャンセルした時、ログアウトが実行されないこと", async () => {
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockClearToken).not.toHaveBeenCalled();
    });

    it("logout API が失敗した時でも clearToken が呼ばれること", async () => {
      mockLogout.mockRejectedValueOnce(new Error("Network Error"));
      renderBottomNav("/posts");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockClearToken).toHaveBeenCalled();
      });
    });
  });
});
