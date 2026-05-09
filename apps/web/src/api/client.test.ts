import axios from "axios";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { createClient } from "../../../../packages/api-client/src/client";

vi.mock("../../../../packages/api-client/src/index", () => ({
  authControllerLogin: vi.fn(),
  authControllerRefresh: vi.fn(),
  authControllerLogout: vi.fn(),
  postsControllerList: vi.fn(),
  postsControllerCreate: vi.fn(),
  postsControllerUpdate: vi.fn(),
  postsControllerGet: vi.fn(),
  postsControllerRemove: vi.fn(),
  postsControllerAddImages: vi.fn(),
  postsControllerRemoveImage: vi.fn(),
  usersControllerRegister: vi.fn(),
  mapControllerGetMarkers: vi.fn(),
  conversationsControllerFindAll: vi.fn(),
  conversationsControllerCreate: vi.fn(),
  conversationsControllerFindOne: vi.fn(),
  conversationsControllerFindMessages: vi.fn(),
  conversationsControllerCreateMessage: vi.fn(),
  conversationsControllerMarkAsRead: vi.fn(),
  sightingsControllerCreate: vi.fn(),
  sightingsControllerFindByPost: vi.fn(),
  sightingsControllerFindOne: vi.fn(),
  sightingsControllerRemove: vi.fn(),
  conversationsControllerGetUnreadCount: vi.fn(),
}));

describe("createClient", () => {
  let savedWithCredentials: boolean | undefined;

  beforeEach(() => {
    savedWithCredentials = axios.defaults.withCredentials;
    axios.defaults.withCredentials = undefined as unknown as boolean;
  });

  afterEach(() => {
    axios.defaults.withCredentials = savedWithCredentials as boolean;
  });

  it("createClient を呼び出した後、axios.defaults.withCredentials が true になること", () => {
    const client = createClient({});
    expect(axios.defaults.withCredentials).toBe(true);
    client.dispose();
  });

  it("baseURL オプション指定時も withCredentials が true になること", () => {
    const client = createClient({ baseURL: "http://localhost:3000" });
    expect(axios.defaults.withCredentials).toBe(true);
    client.dispose();
  });
});

describe("createClient - refreshToken 注入", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshToken が注入されている時、client.refresh() が refreshToken を呼ぶこと（authControllerRefresh は呼ばない）", async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");
    const mockRefreshToken = vi.fn().mockResolvedValue("new-access-token");
    const client = createClient({ refreshToken: mockRefreshToken });

    await client.refresh();

    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(vi.mocked(authControllerRefresh)).not.toHaveBeenCalled();
    client.dispose();
  });

  it("refreshToken が未設定の時、client.refresh() が authControllerRefresh を呼ぶこと", async () => {
    const { authControllerRefresh } =
      await import("../../../../packages/api-client/src/index");
    vi.mocked(authControllerRefresh).mockResolvedValueOnce({
      data: { accessToken: "token-from-server" },
    } as never);
    const client = createClient({});

    await client.refresh();

    expect(vi.mocked(authControllerRefresh)).toHaveBeenCalledTimes(1);
    client.dispose();
  });
});
