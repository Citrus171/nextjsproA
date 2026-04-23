import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

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
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerDto | null>(
    null
  );
  const [selectedPost, setSelectedPost] = useState<PostResponseDto | null>(
    null
  );
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedMarker) {
      setSelectedPost(null);
      setIsLoadingPost(false);
      setIsSheetExpanded(false);
      return;
    }

    const postId = selectedMarker.postId ?? selectedMarker.id;
    let isActive = true;

    setIsLoadingPost(true);
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
                    setIsSheetExpanded(false);
                  },
                }}
              />
            ))}
          </MapContainer>
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
            className={`map-sheet__panel ${isSheetExpanded ? "map-sheet__panel--expanded" : ""}`}
          >
            <button
              type="button"
              className="map-sheet__handle-button"
              aria-label={isSheetExpanded ? "シートを縮小" : "シートを展開"}
              onClick={() => setIsSheetExpanded((current) => !current)}
            >
              <span className="map-sheet__handle" aria-hidden="true" />
            </button>
            <div className="map-sheet__header">
              <div>
                <p className="map-sheet__eyebrow">投稿詳細</p>
                <h2 className="map-sheet__title">
                  {selectedMarker.type === "post" ? "迷い猫投稿" : "目撃情報"}
                </h2>
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

            <div className="map-sheet__badges">
              <span className="map-badge map-badge--type">
                {selectedMarker.type === "post" ? "迷子投稿" : "目撃情報"}
              </span>
              <span
                className={`map-badge map-badge--status map-badge--${selectedMarker.status}`}
              >
                {STATUS_LABEL[selectedMarker.status] ?? selectedMarker.status}
              </span>
            </div>

            <div className="map-sheet__content">
              {isLoadingPost ? (
                <p className="map-sheet__loading">詳細を読み込んでいます…</p>
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
                      {new Date(selectedPost.createdAt).toLocaleString("ja-JP")}
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
