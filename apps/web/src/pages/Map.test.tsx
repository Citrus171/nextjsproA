import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGetMapMarkers = vi.fn();
const mockGetPost = vi.fn();
const mockCreateSighting = vi.fn();
const mockCreateConversation = vi.fn();
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
const mockMapInstance = {
  flyTo: mockFlyTo,
  dragging: { enable: vi.fn(), disable: vi.fn() },
};
const mockAuth = { userId: null as string | null };

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => mockMapInstance,
  useMapEvents: (handlers: {
    click?: (e: { latlng: { lat: number; lng: number } }) => void;
  }) => {
    if (handlers.click) {
      triggerMapClick = (lat: number, lng: number) =>
        handlers.click?.({ latlng: { lat, lng } });
    }
    return mockMapInstance;
  },
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
  }),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    token: null,
    userId: mockAuth.userId,
    setToken: vi.fn(),
    clearToken: vi.fn(),
  }),
}));

const sampleMarkers = [
  { id: "post-1", type: "post", status: "lost", lat: 35.9, lng: 139.6 },
  {
    id: "post-2",
    type: "post",
    status: "resolved",
    lat: 35.905,
    lng: 139.605,
  },
  {
    id: "sighting-1",
    type: "sighting",
    status: "lost",
    lat: 35.91,
    lng: 139.61,
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

import Map from "./Map";

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
    mockNavigate.mockReset();
    mockFlyTo.mockReset();
    mockGetCurrentPosition.mockReset();
    mockReverseGeocode.mockReset();
    mockReverseGeocode.mockResolvedValue({ address: "埼玉県さいたま市" });
    triggerMapClick = null;
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

  it("地図ページを開いた時、検索バーと種別フィルターが表示されること", async () => {
    renderMap();

    expect(await screen.findByPlaceholderText("検索...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "迷子" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "目撃" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "迷い猫投稿" })
    ).toBeInTheDocument();
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
      await screen.findByRole("heading", { name: "迷い猫投稿" })
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
      expect(screen.getByLabelText("緯度")).toHaveValue("35.91");
      expect(screen.getByLabelText("経度")).toHaveValue("139.61");
      expect(screen.getByLabelText("住所")).toHaveValue("埼玉県さいたま市");
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

      expect(
        await screen.findByRole("heading", { name: "目撃を報告する" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("緯度")).toHaveValue("35.91");
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "住所の自動取得に失敗しました。手動で入力してください"
      );
    });
  });
});
