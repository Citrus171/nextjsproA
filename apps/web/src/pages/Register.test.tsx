import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockRegister = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../../../packages/api-client/src/index", () => ({
  usersControllerRegister: (...args: unknown[]) => mockRegister(...args),
}));

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

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import Register from "./Register";

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("入力して登録した時、ユーザー登録後に /login へ遷移すること", async () => {
    mockRegister.mockResolvedValueOnce({});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("name"), "mike");
    await user.type(screen.getByPlaceholderText("email"), "mike@example.com");
    await user.type(screen.getByPlaceholderText("password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: "mike",
        email: "mike@example.com",
        password: "Password123",
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("登録に失敗した時、エラートーストが表示されること", async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { message: "登録に失敗しました" } },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("email"), "mike@example.com");
    await user.type(screen.getByPlaceholderText("password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("登録に失敗しました");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
