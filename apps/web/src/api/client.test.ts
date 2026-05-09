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
