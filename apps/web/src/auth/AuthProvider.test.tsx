import { render, screen, waitFor, act } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
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

function RefreshButton() {
  const { refresh } = useAuth();
  return (
    <button data-testid="refresh-btn" onClick={() => void refresh()}>
      refresh
    </button>
  );
}

describe("AuthProvider", () => {
  beforeEach(async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");
    vi.mocked(authControllerRefresh).mockResolvedValue({
      data: {
        accessToken: makeTestToken({
          sub: "user-1",
          email: "test@example.com",
          role: "user",
          nickname: "Alice",
        }),
      },
    } as never);
  });

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

  it("refresh() が context 経由で呼び出せること", async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");

    render(
      <MemoryRouter>
        <AuthProvider>
          <RefreshButton />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(vi.mocked(authControllerRefresh)).toHaveBeenCalled()
    );

    const prevCallCount = vi.mocked(authControllerRefresh).mock.calls.length;

    await act(async () => {
      screen.getByTestId("refresh-btn").click();
    });

    expect(vi.mocked(authControllerRefresh)).toHaveBeenCalledTimes(
      prevCallCount + 1
    );
  });

  it("refresh() が同時に複数回呼ばれた時、authControllerRefresh は1回だけ呼ばれること", async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");

    let capturedRefresh: (() => Promise<string | null>) | null = null;
    function CaptureRefresh() {
      const { refresh } = useAuth();
      capturedRefresh = refresh;
      return null;
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <CaptureRefresh />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(capturedRefresh).not.toBeNull());
    await waitFor(() =>
      expect(vi.mocked(authControllerRefresh)).toHaveBeenCalled()
    );

    let resolveRefresh!: () => void;
    const slowPromise = new Promise<void>((res) => {
      resolveRefresh = res;
    });
    vi.mocked(authControllerRefresh).mockImplementationOnce(async () => {
      await slowPromise;
      return {
        data: { accessToken: makeTestToken({ sub: "u1" }) },
      } as never;
    });

    vi.mocked(authControllerRefresh).mockClear();

    const p1 = capturedRefresh!();
    const p2 = capturedRefresh!();

    resolveRefresh();
    await Promise.all([p1, p2]);

    expect(vi.mocked(authControllerRefresh)).toHaveBeenCalledTimes(1);
  });
});
