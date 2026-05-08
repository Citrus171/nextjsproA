import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockSetToken = vi.fn();
const mockLogin = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
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

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ setToken: mockSetToken }),
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({ login: mockLogin }),
}));

import LoginWithAuth from "./LoginWithAuth";

describe("LoginWithAuth", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetToken.mockClear();
    mockLogin.mockClear();
  });

  it("フォームが正しくレンダリングされること", () => {
    render(<LoginWithAuth />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ログイン/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/新規登録/i)).toBeInTheDocument();
  });

  it("パスワード表示トグルで入力欄のtype属性が切り替わること", async () => {
    const user = userEvent.setup();
    render(<LoginWithAuth />);

    const passwordInput = screen.getByLabelText("パスワード");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: /パスワードを表示/i });
    await user.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("正常ログイン時、マップ画面（/）にリダイレクトすること", async () => {
    mockLogin.mockResolvedValue({ accessToken: "test-token" });
    const user = userEvent.setup();
    render(<LoginWithAuth />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: /ログイン/i }));

    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith("test-token");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("認証エラー時、フォーム上部にエラーバナーが表示されること", async () => {
    mockLogin.mockRejectedValue({ message: "Unauthorized" });
    const user = userEvent.setup();
    render(<LoginWithAuth />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /ログイン/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/メールアドレスまたはパスワードが正しくありません/i)
      ).toBeInTheDocument();
    });
  });
});
