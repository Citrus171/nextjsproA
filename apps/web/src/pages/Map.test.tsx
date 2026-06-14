import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGetMapMarkers = vi.fn();
const mockGetPost = vi.fn();
const mockCreateSighting = vi.fn();
const mockCreateConversation = vi.fn();
const mockLogout = vi.fn();
const mockClearToken = vi.fn();
const mockFlyTo = vi.fn();
const mockGetCurrentPosition = vi.fn();
const mockNavigate = vi.fn();
const { mockReverseGeocode } = vi.hoisted(() => ({
  mockReverseGeocode:
    vi.fn<
      (
        lat: number,
        lng: number
      ) => Promise<{ address?: string; geocodeError?: string }>
    >(),
}));
let triggerMapClick: ((lat: number, lng: number) => void) | null = null;
let triggerMapMoveend: (() => void) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventHandlers: Record<string, ((...args: any[]) => void) | null> = {};
const mockMapInstance = {
  flyTo: mockFlyTo,
  getBounds: vi.fn(() => ({
    getSouth: () => 35.8,
    getNorth: () => 36.0,
    getWest: () => 139.3,
    getEast: () => 139.7,
  })),
  getZoom: vi.fn(() => 13),
  dragging: { enable: vi.fn(), disable: vi.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    eventHandlers[event] = handler;
    if (event === "click") {
      triggerMapClick = (lat: number, lng: number) =>
        handler({ latlng: { lat, lng } });
    }
    if (event === "moveend") {
      triggerMapMoveend = () => handler();
    }
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (eventHandlers[event] === handler) {
      eventHandlers[event] = null;
    }
    if (event === "click" && triggerMapClick) {
      triggerMapClick = null;
    }
    if (event === "moveend" && triggerMapMoveend) {
      triggerMapMoveend = null;
    }
  }),
  getContainer: vi.fn(() => {
    const listeners: Record<string, EventListener[]> = {};
    return {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((h) => h !== handler);
        }
      }),
    };
  }),
};
const mockAuth = {
  userId: null as string | null,
  nickname: null as string | null,
};

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => mockMapInstance,
  Marker: ({
    children,
    title,
    eventHandlers,
  }: {
    children: ReactNode;
    title?: string;
    eventHandlers?: { click?: () => void };
  }) => (
    <button
      type="button"
      data-testid="marker"
      aria-label={title}
      onClick={() => eventHandlers?.click?.()}
    >
      <span aria-hidden="true">{title}</span>
      <span aria-hidden="true">{children}</span>
    </button>
  ),
  Popup: ({ children }: { children: ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

vi.mock("../lib/reverseGeocode", () => ({
  reverseGeocode: mockReverseGeocode,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => mockNavigate };
});

const mockFindSightingsByPost = vi.fn();

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    getMapMarkers: mockGetMapMarkers,
    getPost: mockGetPost,
    createSighting: mockCreateSighting,
    createConversation: mockCreateConversation,
    findSightingsByPost: mockFindSightingsByPost,
    logout: mockLogout,
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    getSighting: vi.fn(),
  }),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    token: null,
    userId: mockAuth.userId,
    nickname: mockAuth.nickname,
    setToken: vi.fn(),
    clearToken: mockClearToken,
  }),
}));

const sampleMarkers = [
  {
    id: "post-1",
    type: "post",
    status: "lost",
    lat: 35.85,
    lng: 139.35,
    userId: "user-1",
  },
  {
    id: "post-2",
    type: "post",
    status: "resolved",
    lat: 35.9,
    lng: 139.5,
    userId: "user-2",
  },
  {
    id: "sighting-1",
    type: "sighting",
    status: "lost",
    lat: 35.95,
    lng: 139.65,
    userId: "user-1",
  },
] as const;

const samplePost = {
  authorNickname: "テスト投稿者",
  id: "post-1",
  createdAt: "2026-04-23T00:00:00.000Z",
  updatedAt: "2026-04-23T00:00:00.000Z",
  description: "テスト用の詳細",
  images: [],
  lostDate: "2026-04-22T00:00:00.000Z",
  postType: "cat",
  status: "lost",
  title: "迷子の投稿",
  userId: "user-1",
  petDetail: null,
  location: null,
};

import Map, { createMarkerIcon, createClusterIcon } from "./Map";
import type { MapMarkerDto } from "../../../../packages/api-client/src/index";

describe("Map", () => {
  function renderMap() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Map />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    mockAuth.userId = null;
    mockAuth.nickname = null;
    mockNavigate.mockReset();
    mockClearToken.mockReset();
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);
    mockFlyTo.mockReset();
    mockGetCurrentPosition.mockReset();
    mockReverseGeocode.mockReset();
    mockReverseGeocode.mockResolvedValue({ address: "埼玉県さいたま市" });
    triggerMapClick = null;
    triggerMapMoveend = null;
    mockGetMapMarkers.mockResolvedValue([]);
    mockGetPost.mockResolvedValue(samplePost);
    mockCreateSighting.mockResolvedValue(undefined);
    mockCreateConversation.mockResolvedValue({ id: "conv-1" });
    mockFindSightingsByPost.mockResolvedValue([]);
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    });
  });

  it("地図ページを開いた時、種別フィルターと下部ナビボタンが表示されること", async () => {
    renderMap();

    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "迷子" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "目撃" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "迷い猫投稿" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "目撃を報告" })
    ).toBeInTheDocument();
  });

  describe("ヘッダーUI", () => {
    it("ヘッダーに「ねこ探しマップ」テキストが表示されること", () => {
      renderMap();
      expect(screen.getByText("ねこ探しマップ")).toBeInTheDocument();
    });

    it("旧「メニュー」ボタン（≡）が表示されないこと", () => {
      renderMap();
      expect(
        screen.queryByRole("button", { name: "メニュー" })
      ).not.toBeInTheDocument();
    });

    it("旧「アカウント」ボタン（◯）が表示されないこと", () => {
      renderMap();
      expect(
        screen.queryByRole("button", { name: "アカウント" })
      ).not.toBeInTheDocument();
    });
  });

  describe("ログアウトボタン", () => {
    it("未認証時、ログアウトボタンが表示されないこと", () => {
      mockAuth.userId = null;
      renderMap();
      expect(
        screen.queryByRole("button", { name: "ログアウト" })
      ).not.toBeInTheDocument();
    });

    it("認証済み時、ボトムナビにログアウトアイコンボタンが表示されること", () => {
      mockAuth.userId = "user-1";
      renderMap();
      expect(
        screen.getByRole("button", { name: "ログアウト" })
      ).toBeInTheDocument();
    });

    it("認証済みでクリックした時、ログアウト確認ダイアログが表示されること", async () => {
      const user = userEvent.setup();
      mockAuth.userId = "user-1";

      renderMap();

      await user.click(screen.getByRole("button", { name: "ログアウト" }));

      expect(
        await screen.findByText("ログアウトしますか？")
      ).toBeInTheDocument();
      expect(
        screen.getByText("ログイン状態を解除します。")
      ).toBeInTheDocument();
    });

    it("ダイアログでキャンセル押下時、ログアウト処理が実行されないこと", async () => {
      const user = userEvent.setup();
      mockAuth.userId = "user-1";

      renderMap();

      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      await screen.findByText("ログアウトしますか？");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockClearToken).not.toHaveBeenCalled();
    });

    it("ダイアログの実行ボタンが押下時にログアウト処理が実行されること", async () => {
      const user = userEvent.setup();
      mockAuth.userId = "user-1";

      renderMap();

      await user.click(screen.getByRole("button", { name: "ログアウト" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(
        within(dialog).getByRole("button", { name: "ログアウト" })
      );

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockClearToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("自分の投稿ボタン", () => {
    it("認証済み時、ボトムナビに「自分の投稿」ボタンが表示されること", () => {
      mockAuth.userId = "user-1";
      renderMap();
      expect(
        screen.getByRole("button", { name: "自分の投稿" })
      ).toBeInTheDocument();
    });

    it("未認証時、「自分の投稿」ボタンが表示されないこと", () => {
      mockAuth.userId = null;
      renderMap();
      expect(
        screen.queryByRole("button", { name: "自分の投稿" })
      ).not.toBeInTheDocument();
    });

    it("認証済みで「自分の投稿」ボタンをクリックした時、/posts に遷移すること", async () => {
      const user = userEvent.setup();
      mockAuth.userId = "user-1";
      renderMap();

      await user.click(screen.getByRole("button", { name: "自分の投稿" }));

      expect(mockNavigate).toHaveBeenCalledWith("/posts");
    });
  });

  it("迷子マーカーを押した時、詳細シートが開くこと", async () => {
    const user = userEvent.setup();
    mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);

    renderMap();

    const postMarkers = await screen.findAllByRole("button", {
      name: "迷子投稿",
    });
    await user.click(postMarkers[0]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "迷子の投稿" })
    ).toBeInTheDocument();
    expect(await screen.findByText("画像なし")).toBeInTheDocument();
  });

  it("目撃マーカーを押した時、目撃情報シートが開くこと", async () => {
    const user = userEvent.setup();
    mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);

    renderMap();

    const sightingMarkers = await screen.findAllByRole("button", {
      name: "目撃情報",
    });
    await user.click(sightingMarkers[0]);

    expect(
      await screen.findByRole("heading", { name: "目撃情報" })
    ).toBeInTheDocument();
  });

  it("迷子フィルターを押した時、postマーカー（lost/resolved）が表示されること", async () => {
    const user = userEvent.setup();
    mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);

    renderMap();

    await user.click(await screen.findByRole("button", { name: "迷子" }));

    expect(screen.getAllByRole("button", { name: "迷子投稿" })).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "目撃情報" })
    ).not.toBeInTheDocument();
  });

  it("現在地ボタンを押した時、取得した現在地へ移動すること", async () => {
    const user = userEvent.setup();

    mockGetCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: {
          latitude: 35.92,
          longitude: 139.62,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({
            latitude: 35.92,
            longitude: 139.62,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          }),
        },
        timestamp: Date.now(),
        toJSON: () => ({
          coords: {
            latitude: 35.92,
            longitude: 139.62,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        }),
      });
    });

    renderMap();

    await user.click(
      await screen.findByRole("button", { name: "現在地へ移動" })
    );

    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mockFlyTo).toHaveBeenCalledWith([35.92, 139.62], 16, {
      animate: true,
    });
  });

  describe("目撃を報告するボタン", () => {
    it("未認証でボタンをクリックした時、/loginにリダイレクトされること", async () => {
      const user = userEvent.setup();
      mockAuth.userId = null;
      mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);

      renderMap();

      const postMarkers = await screen.findAllByRole("button", {
        name: "迷子投稿",
      });
      await user.click(postMarkers[0]);

      const reportBtn = await screen.findByRole("button", {
        name: "目撃を報告する",
      });
      await user.click(reportBtn);

      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("認証済みかつ他者のPostでボタンをクリックした時、SightingModalが開くこと", async () => {
      const user = userEvent.setup();
      mockAuth.userId = "user-2";
      mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);

      renderMap();

      const postMarkers = await screen.findAllByRole("button", {
        name: "迷子投稿",
      });
      await user.click(postMarkers[0]);

      const reportBtn = await screen.findByRole("button", {
        name: "目撃を報告する",
      });
      await user.click(reportBtn);

      expect(
        await screen.findByRole("heading", { name: "目撃を報告する" })
      ).toBeInTheDocument();
    });
  });

  describe("ニックネーム表示", () => {
    it("認証済みでnicknameがある時、ヘッダーに「nickname 様」が表示されること", async () => {
      mockAuth.userId = "user-1";
      mockAuth.nickname = "Alice";

      renderMap();

      expect(await screen.findByText("Alice 様")).toBeInTheDocument();
    });

    it("nicknameがnullの時、「様」が表示されないこと", async () => {
      mockAuth.userId = "user-1";
      mockAuth.nickname = null;

      renderMap();

      await screen.findByRole("button", { name: "ログアウト" });
      expect(screen.queryByText(/様/)).not.toBeInTheDocument();
    });
  });

  describe("地図から選択モード", () => {
    // 底バーの独立した目撃投稿ボタンは削除済み。
    // SightingModalは投稿マーカー→SheetのReportSightingボタン経由で開く。
    beforeEach(() => {
      mockAuth.userId = "user-2"; // 投稿者(user-1)と異なるユーザーで「目撃を報告する」を表示
      mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);
    });

    async function openSightingModal(user: ReturnType<typeof userEvent.setup>) {
      const postMarkers = await screen.findAllByRole("button", {
        name: "迷子投稿",
      });
      await user.click(postMarkers[0]);
      await user.click(
        await screen.findByRole("button", { name: "目撃を報告する" })
      );
      await screen.findByRole("heading", { name: "目撃を報告する" });
    }

    it("「地図から選択」クリック後、モーダルが非表示になり「タップして場所を選択」バナーが表示されること", async () => {
      const user = userEvent.setup();
      renderMap();

      await openSightingModal(user);
      await user.click(screen.getByRole("button", { name: "地図から選択" }));

      expect(screen.getByText("タップして場所を選択")).toBeInTheDocument();
    });

    it("選択モード中に地図クリックで lat/lng・住所が SightingModal にセットされ再表示されること", async () => {
      const user = userEvent.setup();
      renderMap();

      await openSightingModal(user);
      await user.click(screen.getByRole("button", { name: "地図から選択" }));

      triggerMapClick?.(35.91, 139.61);

      await waitFor(() => {
        expect(mockReverseGeocode).toHaveBeenCalledWith(35.91, 139.61);
      });

      expect(
        await screen.findByRole("heading", { name: "目撃を報告する" })
      ).toBeInTheDocument();
      expect(await screen.findByText("埼玉県さいたま市")).toBeInTheDocument();
    });

    it("Nominatim 失敗時、lat/lng セット済みでモーダルが再表示され、エラーメッセージが表示されること", async () => {
      const user = userEvent.setup();
      mockReverseGeocode.mockResolvedValue({
        geocodeError: "住所の自動取得に失敗しました。手動で入力してください",
      });
      renderMap();

      await openSightingModal(user);
      await user.click(screen.getByRole("button", { name: "地図から選択" }));

      triggerMapClick?.(35.91, 139.61);

      await waitFor(() => {
        expect(mockReverseGeocode).toHaveBeenCalledWith(35.91, 139.61);
      });

      expect(
        await screen.findByRole("heading", { name: "目撃を報告する" })
      ).toBeInTheDocument();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "住所の自動取得に失敗しました。手動で入力してください"
      );
    });
  });
});

describe("createMarkerIcon", () => {
  it("isOwn=trueの時、map-marker--ownクラスが付与されること", () => {
    const marker: MapMarkerDto = {
      id: "post-1",
      type: "post",
      status: "lost",
      lat: 35.9,
      lng: 139.6,
      userId: "user-1",
    };
    const icon = createMarkerIcon(marker, true);
    expect(icon.options.html).toContain("map-marker--own");
  });

  it("isOwn=falseの時、map-marker--ownクラスが付与されないこと", () => {
    const marker: MapMarkerDto = {
      id: "post-2",
      type: "post",
      status: "lost",
      lat: 35.9,
      lng: 139.6,
      userId: "user-2",
    };
    const icon = createMarkerIcon(marker, false);
    expect(icon.options.html).not.toContain("map-marker--own");
  });

  it("解決済みの自分のマーカーにもmap-marker--ownクラスが付与されること", () => {
    const marker: MapMarkerDto = {
      id: "post-3",
      type: "post",
      status: "resolved",
      lat: 35.9,
      lng: 139.6,
      userId: "user-1",
    };
    const icon = createMarkerIcon(marker, true);
    expect(icon.options.html).toContain("map-marker--own");
  });

  it("自分の目撃投稿マーカーにもmap-marker--ownクラスが付与されること", () => {
    const marker: MapMarkerDto = {
      id: "sighting-1",
      type: "sighting",
      status: "lost",
      lat: 35.9,
      lng: 139.6,
      userId: "user-1",
    };
    const icon = createMarkerIcon(marker, true);
    expect(icon.options.html).toContain("map-marker--own");
  });
});

describe("createClusterIcon", () => {
  it("指定した件数がaria-labelに含まれること", () => {
    const icon = createClusterIcon(5);
    expect(icon.options.html).toContain("5件のマーカー");
  });

  it("指定した件数がspan内に表示されること", () => {
    const icon = createClusterIcon(12);
    expect(icon.options.html).toContain(">12<");
  });
});

describe("マーカークラスタリング", () => {
  function renderMap() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Map />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    mockGetMapMarkers.mockResolvedValue([]);
    mockGetPost.mockResolvedValue({
      authorNickname: "テスト",
      id: "post-1",
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      description: "テスト",
      images: [],
      lostDate: "2026-04-22T00:00:00.000Z",
      postType: "cat",
      status: "lost",
      title: "テスト投稿",
      userId: "user-1",
      petDetail: null,
      location: null,
    });
  });

  it("離れたマーカーはクラスタリングされず個別に表示されること", async () => {
    mockGetMapMarkers.mockResolvedValue(sampleMarkers as unknown as never[]);
    renderMap();

    expect(
      await screen.findAllByRole("button", { name: "迷子投稿" })
    ).toHaveLength(2);
    expect(
      await screen.findAllByRole("button", { name: "目撃情報" })
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /件のマーカー/ })
    ).not.toBeInTheDocument();
  });

  it("クラスターマーカーをクリックすると flyTo が呼ばれること", async () => {
    const user = userEvent.setup();
    const clusteredMarkers = [
      {
        id: "post-a",
        type: "post",
        status: "lost",
        lat: 35.9,
        lng: 139.6,
        userId: "user-1",
      },
      {
        id: "post-b",
        type: "post",
        status: "lost",
        lat: 35.901,
        lng: 139.601,
        userId: "user-2",
      },
      {
        id: "post-c",
        type: "post",
        status: "lost",
        lat: 35.902,
        lng: 139.602,
        userId: "user-3",
      },
      {
        id: "post-d",
        type: "post",
        status: "lost",
        lat: 35.903,
        lng: 139.603,
        userId: "user-4",
      },
    ];
    mockGetMapMarkers.mockResolvedValue(clusteredMarkers as unknown as never[]);
    mockFlyTo.mockReset();

    renderMap();

    const clusterBtn = await screen.findByRole("button", {
      name: /件のマーカー/,
    });
    await user.click(clusterBtn);

    expect(mockFlyTo).toHaveBeenCalledTimes(1);
    const [, zoom] = mockFlyTo.mock.calls[0] as [unknown, number, unknown];
    expect(zoom).toBeGreaterThan(13);
  });
});
