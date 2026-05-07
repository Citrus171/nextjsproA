import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthProvider";

function makeTestToken(payload: Record<string, unknown>) {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

vi.mock("../../../../packages/api-client/src/index", () => ({
  authControllerRefresh: vi.fn().mockResolvedValue({
    data: {
      accessToken: makeTestToken({
        sub: "user-1",
        email: "test@example.com",
        role: "user",
        nickname: "Alice",
      }),
    },
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});

function NicknameDisplay() {
  const { nickname } = useAuth();
  return <span data-testid="nickname">{nickname ?? "null"}</span>;
}

describe("AuthProvider", () => {
  it("JWTにnicknameが含まれる場合、AuthProviderがnicknameを公開すること", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <NicknameDisplay />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("nickname").textContent).toBe("Alice");
    });
  });

  it("nicknameを含まないJWTの場合、nicknameがnullを返すこと", async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");
    vi.mocked(authControllerRefresh).mockResolvedValueOnce({
      data: {
        accessToken: makeTestToken({
          sub: "user-2",
          email: "other@example.com",
          role: "user",
        }),
      },
    } as never);

    render(
      <MemoryRouter>
        <AuthProvider>
          <NicknameDisplay />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("nickname").textContent).toBe("null");
    });
  });
});
