import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockGetMapMarkers = vi.fn();
const mockGetPost = vi.fn();
const mockFlyTo = vi.fn();
const mockGetCurrentPosition = vi.fn();
const mockMapInstance = {
  flyTo: mockFlyTo,
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

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    getMapMarkers: mockGetMapMarkers,
    getPost: mockGetPost,
  }),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    token: null,
    userId: null,
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
    return render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );
  }

  beforeEach(() => {
    mockFlyTo.mockReset();
    mockGetCurrentPosition.mockReset();
    mockGetMapMarkers.mockResolvedValue([]);
    mockGetPost.mockResolvedValue(samplePost);
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
    expect(screen.getByRole("link", { name: "迷い猫投稿" })).toHaveAttribute(
      "href",
      "/create"
    );
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
});
