import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import type {
  MapMarkerDto,
  PostResponseDto,
} from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import "../styles/map.css";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [35.9062, 139.6236];
const DEFAULT_ZOOM = 13;

const STATUS_LABEL: Record<string, string> = {
  lost: "迷子",
  resolved: "解決済み",
};

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "lost", label: "迷子" },
  { value: "sighting", label: "目撃" },
] as const;

const SHEET_PEEK_HEIGHT_RATIO = 0.3;
const SHEET_PEEK_HEIGHT_MIN = 200;
const SHEET_PEEK_HEIGHT_MAX = 300;
const SHEET_EXPANDED_HEIGHT_RATIO = 0.82;
const SHEET_EXPANDED_HEIGHT_MIN = 400;
const SHEET_EXPANDED_HEIGHT_MAX = 700;

const SHEET_TABS = [
  { value: "spots", label: "スポット", icon: "📍" },
  { value: "saved", label: "保存済み", icon: "🔖" },
  { value: "post", label: "投稿", icon: "⊕" },
] as const;
type SheetTab = (typeof SHEET_TABS)[number]["value"];
const SHEET_PANEL_ID = "map-sheet-panel";

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];
type SheetSnap = "peek" | "expanded";
type SheetDragState = {
  pointerId: number;
  startY: number;
  startTranslate: number;
} | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getSheetMetrics(viewportHeight: number) {
  const expandedHeight = clamp(
    viewportHeight * SHEET_EXPANDED_HEIGHT_RATIO,
    SHEET_EXPANDED_HEIGHT_MIN,
    SHEET_EXPANDED_HEIGHT_MAX
  );
  const peekHeight = clamp(
    viewportHeight * SHEET_PEEK_HEIGHT_RATIO,
    SHEET_PEEK_HEIGHT_MIN,
    SHEET_PEEK_HEIGHT_MAX
  );
  // translateY の値。0 = 全表示 (expanded), peekTranslate = peek 状態
  const peekTranslate = expandedHeight - peekHeight;

  return {
    height: expandedHeight,
    peekTranslate,
  };
}

function getMarkerLabel(marker: MapMarkerDto) {
  return marker.type === "post" ? "迷子" : "目撃";
}

function getMarkerTone(marker: MapMarkerDto) {
  if (marker.type === "post" && marker.status === "lost") {
    return { fill: "#d93025", edge: "#b3261e" };
  }

  if (marker.type === "post" && marker.status === "resolved") {
    return { fill: "#9aa0a6", edge: "#5f6368" };
  }

  if (marker.type === "sighting") {
    return marker.status === "resolved"
      ? { fill: "#9aa0a6", edge: "#5f6368" }
      : { fill: "#1a73e8", edge: "#185abc" };
  }

  return { fill: "#1a73e8", edge: "#185abc" };
}

function createMarkerIcon(marker: MapMarkerDto) {
  const tone = getMarkerTone(marker);
  const shapeClass =
    marker.type === "post" ? "map-marker--pin" : "map-marker--circle";

  return L.divIcon({
    className: "map-marker-icon",
    html: `
      <span class="map-marker ${shapeClass}" style="--marker-fill:${tone.fill};--marker-edge:${tone.edge};">
        <span class="map-marker__core"></span>
      </span>
      <span class="map-marker-label">${getMarkerLabel(marker)}</span>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 50],
    popupAnchor: [0, -36],
  });
}

export default function Map() {
  const api = useApiClient();
  const [markers, setMarkers] = useState<MapMarkerDto[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerDto | null>(
    null
  );
  const [selectedPost, setSelectedPost] = useState<PostResponseDto | null>(
    null
  );
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek");
  const [sheetDragState, setSheetDragState] = useState<SheetDragState>(null);
  const [sheetDragTranslate, setSheetDragTranslate] = useState(0);
  const [activeTab, setActiveTab] = useState<SheetTab>("spots");
  const [viewportHeight, setViewportHeight] = useState(() =>
    getViewportHeight()
  );
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const handleDraggedRef = useRef(false);

  const sheetMetrics = useMemo(
    () => getSheetMetrics(viewportHeight),
    [viewportHeight]
  );
  // translateY: 0 = expanded (全表示), peekTranslate = peek (一部表示)
  const baseTranslate =
    sheetSnap === "expanded" ? 0 : sheetMetrics.peekTranslate;
  const currentTranslate = clamp(
    baseTranslate + sheetDragTranslate,
    0,
    sheetMetrics.peekTranslate
  );
  const isSheetDragging = sheetDragState !== null;

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(getViewportHeight());
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    api
      .getMapMarkers()
      .then((data) => {
        setMarkers(data);
        setError(null);
      })
      .catch(() => setError("マーカーデータの取得に失敗しました"));
  }, [api]);

  const visibleMarkers = useMemo(() => {
    if (filter === "all") return markers;
    if (filter === "lost") {
      return markers.filter((marker) => marker.type === "post");
    }

    return markers.filter((marker) => marker.type === "sighting");
  }, [filter, markers]);

  const handleCurrentLocationClick = () => {
    if (!mapInstance) {
      setLocationError("地図の準備ができていません");
      return;
    }

    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setLocationError("このブラウザでは現在地を取得できません");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    geolocation.getCurrentPosition(
      (position) => {
        const currentCenter: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        mapInstance.flyTo(currentCenter, 16, { animate: true });
        setIsLocating(false);
      },
      () => {
        setLocationError("現在地の取得に失敗しました");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!selectedMarker) {
      setSelectedPost(null);
      setIsLoadingPost(false);
      setSheetSnap("peek");
      setSheetDragState(null);
      setSheetDragTranslate(0);
      return;
    }

    const postId = selectedMarker.postId ?? selectedMarker.id;
    let isActive = true;

    setIsLoadingPost(true);
    setSheetSnap("peek");
    setSheetDragState(null);
    setSheetDragTranslate(0);
    setActiveTab("spots");
    api
      .getPost(postId)
      .then((post) => {
        if (isActive) {
          setSelectedPost(post);
        }
      })
      .catch(() => {
        if (isActive) {
          setSelectedPost(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPost(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [api, selectedMarker]);

  const finishSheetDrag = (_pointerId: number, currentY: number) => {
    if (!sheetDragState) {
      return;
    }

    const nextTranslate = clamp(
      sheetDragState.startTranslate + (currentY - sheetDragState.startY),
      0,
      sheetMetrics.peekTranslate
    );

    setSheetSnap(
      nextTranslate > sheetMetrics.peekTranslate / 2 ? "peek" : "expanded"
    );
    setSheetDragState(null);
    setSheetDragTranslate(0);
    handleDraggedRef.current = false;
  };

  const handleSheetPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    handleDraggedRef.current = false;
    setSheetDragState({
      pointerId: event.pointerId,
      startY: event.clientY,
      startTranslate: currentTranslate,
    });
    setSheetDragTranslate(0);
  };

  const handleSheetPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!sheetDragState || event.pointerId !== sheetDragState.pointerId) {
      return;
    }

    const deltaY = event.clientY - sheetDragState.startY;

    if (Math.abs(deltaY) > 6) {
      handleDraggedRef.current = true;
    }

    const nextTranslate = clamp(
      sheetDragState.startTranslate + deltaY,
      0,
      sheetMetrics.peekTranslate
    );

    setSheetDragTranslate(nextTranslate - baseTranslate);
  };

  const handleSheetPointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!sheetDragState || event.pointerId !== sheetDragState.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishSheetDrag(event.pointerId, event.clientY);
  };

  const handleSheetPointerCancel = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!sheetDragState || event.pointerId !== sheetDragState.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishSheetDrag(event.pointerId, event.clientY);
  };

  const handleSheetHandleClick = (
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    if (handleDraggedRef.current) {
      event.preventDefault();
      handleDraggedRef.current = false;
      return;
    }

    setSheetDragTranslate(0);
    setSheetSnap((current) => (current === "expanded" ? "peek" : "expanded"));
  };

  return (
    <div className="map-page">
      <header className="map-header">
        <div className="map-header__panel">
          <button
            className="map-icon-button"
            type="button"
            aria-label="メニュー"
          >
            <MenuIcon />
          </button>
          <label className="map-search" htmlFor="map-search-input">
            <span className="map-search__icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              id="map-search-input"
              type="search"
              placeholder="検索..."
              className="map-search__input"
            />
          </label>
          <div className="map-header__actions">
            <button
              className="map-icon-button map-icon-button--primary"
              type="button"
              aria-label="検索"
            >
              <SearchIcon />
            </button>
            <button
              className="map-account-button"
              type="button"
              aria-label="アカウント"
            >
              <UserIcon />
            </button>
          </div>
        </div>

        <div
          className="map-filter-row"
          role="group"
          aria-label="地図フィルター"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`map-chip ${isActive ? `map-chip--active map-chip--${option.value}` : ""}`}
                aria-pressed={isActive}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {error && (
        <p className="map-floating-error" role="status">
          {error}
        </p>
      )}

      {locationError && (
        <p
          className="map-floating-error map-floating-error--location"
          role="status"
        >
          {locationError}
        </p>
      )}

      <main className="map-stage">
        <div className="map-stage__frame">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            minZoom={11}
            maxZoom={19}
            maxBounds={[
              [35.7, 139.4],
              [36.1, 139.9],
            ]}
            className="map-stage__map"
          >
            <MapInstanceBridge onReady={setMapInstance} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visibleMarkers.map((marker) => (
              <Marker
                key={`${marker.type}-${marker.id}`}
                position={[marker.lat, marker.lng]}
                icon={createMarkerIcon(marker)}
                title={marker.type === "post" ? "迷子投稿" : "目撃情報"}
                eventHandlers={{
                  click: () => {
                    setSelectedMarker(marker);
                  },
                }}
              />
            ))}
          </MapContainer>

          {mapInstance && (
            <div className="map-stage__controls">
              <button
                type="button"
                className="map-current-location-button"
                aria-label="現在地へ移動"
                onClick={handleCurrentLocationClick}
                disabled={isLocating}
              >
                <LocationIcon loading={isLocating} />
              </button>
            </div>
          )}
        </div>
      </main>

      <nav className="map-bottom-bar" aria-label="投稿アクション">
        <button
          type="button"
          className="map-bottom-bar__button map-bottom-bar__button--lost"
        >
          <PlusIcon />
          <span>迷い猫投稿</span>
        </button>
        <button
          type="button"
          className="map-bottom-bar__button map-bottom-bar__button--sighting"
        >
          <PlusIcon />
          <span>目撃投稿</span>
        </button>
      </nav>

      {selectedMarker && (
        <div
          className="map-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="投稿詳細"
        >
          <button
            type="button"
            className="map-sheet__backdrop"
            aria-label="詳細を閉じる"
            onClick={() => setSelectedMarker(null)}
          />
          <section
            className={`map-sheet__panel ${isSheetDragging ? "map-sheet__panel--dragging" : ""}`}
            style={{
              height: `${sheetMetrics.height}px`,
              transform: `translateY(${currentTranslate}px)`,
            }}
          >
            {/* ドラッグハンドル */}
            <button
              type="button"
              className="map-sheet__handle-button"
              aria-label={
                sheetSnap === "expanded" ? "シートを縮小" : "シートを展開"
              }
              aria-expanded={sheetSnap === "expanded"}
              onClick={handleSheetHandleClick}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={handleSheetPointerCancel}
            >
              <span className="map-sheet__handle" aria-hidden="true" />
            </button>

            <div className="map-sheet__header">
              <div>
                <h2 className="map-sheet__title">
                  {selectedMarker.type === "post" ? "迷い猫投稿" : "目撃情報"}
                </h2>
                <p className="map-sheet__eyebrow">
                  {STATUS_LABEL[selectedMarker.status] ?? selectedMarker.status}
                </p>
              </div>
              <button
                type="button"
                className="map-icon-button"
                aria-label="詳細を閉じる"
                onClick={() => setSelectedMarker(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <nav
              className="map-sheet__tabs"
              aria-label="詳細タブ"
              role="tablist"
            >
              {SHEET_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  id={`map-sheet-tab-${tab.value}`}
                  className={`map-sheet__tab ${activeTab === tab.value ? "map-sheet__tab--active" : ""}`}
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  aria-controls={SHEET_PANEL_ID}
                  onClick={() => setActiveTab(tab.value)}
                >
                  <span className="map-sheet__tab-icon" aria-hidden="true">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div
              id={SHEET_PANEL_ID}
              className="map-sheet__scroll-body"
              role="tabpanel"
              aria-labelledby={`map-sheet-tab-${activeTab}`}
            >
              {activeTab === "spots" && (
                <>
                  <div className="map-sheet__badges">
                    <span className="map-badge map-badge--type">
                      {selectedMarker.type === "post" ? "迷子投稿" : "目撃情報"}
                    </span>
                    <span
                      className={`map-badge map-badge--status map-badge--${selectedMarker.status}`}
                    >
                      {STATUS_LABEL[selectedMarker.status] ??
                        selectedMarker.status}
                    </span>
                  </div>

                  <div className="map-sheet__content">
                    {isLoadingPost ? (
                      <p className="map-sheet__loading">
                        詳細を読み込んでいます…
                      </p>
                    ) : selectedPost ? (
                      <>
                        <div className="map-sheet__row">
                          <span className="map-sheet__label">投稿者</span>
                          <span className="map-sheet__value">
                            {selectedPost.authorNickname ?? "（不明）"}
                          </span>
                        </div>
                        <div className="map-sheet__row">
                          <span className="map-sheet__label">投稿日</span>
                          <span className="map-sheet__value">
                            {new Date(selectedPost.createdAt).toLocaleString(
                              "ja-JP"
                            )}
                          </span>
                        </div>
                        <div className="map-sheet__row map-sheet__row--stacked">
                          <span className="map-sheet__label">内容</span>
                          <span className="map-sheet__value">
                            {selectedPost.description}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="map-sheet__loading">
                        詳細情報が取得できませんでした。
                      </p>
                    )}
                  </div>

                  <a
                    className="map-sheet__link map-sheet__link--disabled"
                    href={`/posts/${selectedPost?.id ?? selectedMarker.postId ?? selectedMarker.id}`}
                    aria-disabled="true"
                    onClick={(event) => event.preventDefault()}
                  >
                    詳細ページは未実装です
                  </a>
                </>
              )}

              {activeTab === "saved" && (
                <p className="map-sheet__loading">
                  保存済みの情報はありません。
                </p>
              )}

              {activeTab === "post" && (
                <p className="map-sheet__loading">投稿機能は準備中です。</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return <span aria-hidden="true">≡</span>;
}

function SearchIcon() {
  return <span aria-hidden="true">⌕</span>;
}

function UserIcon() {
  return <span aria-hidden="true">◯</span>;
}

function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}

function CloseIcon() {
  return <span aria-hidden="true">×</span>;
}

function LocationIcon({ loading }: { loading: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`map-current-location-button__icon ${loading ? "map-current-location-button__icon--loading" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
      <path
        d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MapInstanceBridge({
  onReady,
}: {
  onReady: (map: LeafletMap) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}
