import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import type {
  MapMarkerDto,
  PostResponseDto,
} from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import PostDetailSheet from "../components/PostDetailSheet";
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

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "lost", label: "迷子" },
  { value: "sighting", label: "目撃" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getMarkerLabel(marker: MapMarkerDto) {
  return marker.type === "post" ? "迷子投稿" : "目撃情報";
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
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    getViewportHeight()
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(getViewportHeight());
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
    if (filter === "lost") return markers.filter((m) => m.type === "post");
    return markers.filter((m) => m.type === "sighting");
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
        mapInstance.flyTo(
          [position.coords.latitude, position.coords.longitude],
          16,
          { animate: true }
        );
        setIsLocating(false);
      },
      () => {
        setLocationError("現在地の取得に失敗しました");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!selectedMarker) {
      setSelectedPost(null);
      setIsLoadingPost(false);
      return;
    }

    const postId = selectedMarker.postId ?? selectedMarker.id;
    let isActive = true;

    setIsLoadingPost(true);
    api
      .getPost(postId)
      .then((post) => {
        if (isActive) setSelectedPost(post);
      })
      .catch(() => {
        if (isActive) setSelectedPost(null);
      })
      .finally(() => {
        if (isActive) setIsLoadingPost(false);
      });

    return () => {
      isActive = false;
    };
  }, [api, selectedMarker]);

  // viewportHeight は将来のレスポンシブ対応のために保持
  void clamp(viewportHeight, 0, Infinity);

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
                  click: () => setSelectedMarker(marker),
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
        <Link
          to="/create"
          className="map-bottom-bar__button map-bottom-bar__button--lost"
        >
          <PlusIcon />
          <span>迷い猫投稿</span>
        </Link>
        <button
          type="button"
          className="map-bottom-bar__button map-bottom-bar__button--sighting"
        >
          <PlusIcon />
          <span>目撃投稿</span>
        </button>
      </nav>

      <PostDetailSheet
        isOpen={selectedMarker !== null}
        onClose={() => setSelectedMarker(null)}
        post={selectedPost}
        markerType={selectedMarker?.type ?? "post"}
        isLoading={isLoadingPost}
      />
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
