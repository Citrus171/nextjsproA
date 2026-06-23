import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

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

vi.mock("../../../../packages/api-client/src/index", () => ({
  usersControllerRegister: (...args: unknown[]) => mockRegister(...args),
}));

import Register from "./Register";

describe("Register", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  it("フォームが正しくレンダリングされること（ログインへのリンクあり）", () => {
    render(<Register />);
    expect(screen.getByLabelText(/お名前/i)).toBeInTheDocument();
    expect(screen.queryByText(/任意/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード（確認）")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /アカウントを作成/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/ログイン/i)).toBeInTheDocument();
  });

  it("名前が空の時、フィールド下にエラーが表示されること", async () => {
    const user = userEvent.setup();
    render(<Register />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "Password123!");
    await user.type(
      screen.getByLabelText("パスワード（確認）"),
      "Password123!"
    );
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/ニックネームを入力してください/i)
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("メール形式が不正な時、フィールド下にエラーが表示されること", async () => {
    const user = userEvent.setup();
    render(<Register />);

    await user.type(screen.getByLabelText("メールアドレス"), "invalid-email");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "password123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/正しいメールアドレスを入力してください/i)
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("パスワードが8文字未満の時、フィールド下にエラーが表示されること", async () => {
    const user = userEvent.setup();
    render(<Register />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.type(screen.getByLabelText("パスワード（確認）"), "short");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/パスワードは8文字以上で入力してください/i)
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("パスワードと確認用が一致しない時、フィールド下にエラーが表示されること", async () => {
    const user = userEvent.setup();
    render(<Register />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.type(
      screen.getByLabelText("パスワード（確認）"),
      "different456"
    );
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/パスワードが一致しません/i)).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("正常登録後、ログイン画面（/login）にリダイレクトすること", async () => {
    mockRegister.mockResolvedValue({});
    const user = userEvent.setup();
    render(<Register />);

    await user.type(screen.getByLabelText(/お名前/i), "テストユーザー");
    await user.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "password123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
