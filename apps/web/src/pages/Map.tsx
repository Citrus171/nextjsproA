import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
import type {
  MapMarkerDto,
  PostResponseDto,
} from "../../../../packages/api-client/src/index";
import { useAuth } from "../auth/AuthProvider";
import { useApiClient } from "../api/orvalClient";
import PostDetailSheet from "../components/PostDetailSheet";
import SightingModal from "../components/SightingModal";
import { reverseGeocode } from "../lib/reverseGeocode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
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

  const label = getMarkerLabel(marker);
  return L.divIcon({
    className: "map-marker-icon",
    html: `
      <span class="map-marker ${shapeClass}" role="button" tabindex="0" aria-label="${label}" data-marker-id="${marker.id}" style="--marker-fill:${tone.fill};--marker-edge:${tone.edge};">
        <span class="map-marker__core"></span>
      </span>
      <span class="map-marker-label" aria-hidden="true">${label}</span>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 50],
    popupAnchor: [0, -36],
  });
}

export default function Map() {
  const api = useApiClient();
  const { userId: currentUserId, clearToken } = useAuth();
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<MapMarkerDto[]>([]);
  const [markersRefreshKey, setMarkersRefreshKey] = useState(0);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerDto | null>(
    null
  );
  const [selectedPost, setSelectedPost] = useState<PostResponseDto | null>(
    null
  );
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [sightingPostId, setSightingPostId] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    geocodeError?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const geocodingInProgress = useRef(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    getViewportHeight()
  );
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
  }, [api, markersRefreshKey]);

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

  const handleZoomIn = () => {
    mapInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstance?.zoomOut();
  };

  useEffect(() => {
    if (!selectedMarker) {
      setSelectedPost(null);
      setIsLoadingPost(false);
      return;
    }

    const postId =
      selectedMarker.type === "post"
        ? (selectedMarker.postId ?? selectedMarker.id)
        : selectedMarker.postId;

    if (!postId) {
      setSelectedPost(null);
      setIsLoadingPost(false);
      return;
    }

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

  useEffect(() => {
    if (!mapInstance) return;
    if (selectedMarker !== null || sightingModalOpen) {
      mapInstance.dragging.disable();
    } else {
      mapInstance.dragging.enable();
    }
  }, [mapInstance, selectedMarker, sightingModalOpen]);

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
            onClick={() => {
              if (!currentUserId) return;
              setShowLogoutDialog(true);
            }}
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
              onClick={() => {
                if (!currentUserId) return;
                setShowLogoutDialog(true);
              }}
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
            zoomControl={false}
            minZoom={11}
            maxZoom={19}
            maxBounds={[
              [35.7, 139.4],
              [36.1, 139.9],
            ]}
            className="map-stage__map"
          >
            <MapInstanceBridge onReady={setMapInstance} />
            <MapClickHandler
              enabled={pickingLocation}
              onClick={async (lat, lng) => {
                if (geocodingInProgress.current) return;
                geocodingInProgress.current = true;
                const result = await reverseGeocode(lat, lng);
                geocodingInProgress.current = false;
                setPickingLocation(false);
                setPickedLocation({ lat, lng, ...result });
                setSightingModalOpen(true);
              }}
            />
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
              <div className="map-zoom-controls">
                <button
                  type="button"
                  className="map-zoom-button"
                  aria-label="ズームイン"
                  onClick={handleZoomIn}
                >
                  <ZoomInIcon />
                </button>
                <div className="map-zoom-divider" />
                <button
                  type="button"
                  className="map-zoom-button"
                  aria-label="ズームアウト"
                  onClick={handleZoomOut}
                >
                  <ZoomOutIcon />
                </button>
              </div>
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
          onClick={() => {
            if (!currentUserId) {
              navigate("/login");
              return;
            }
            navigate("/create");
          }}
        >
          <PlusIcon />
          <span>迷い猫投稿</span>
        </button>
      </nav>

      {pickingLocation && (
        <div className="map-picking-banner" aria-live="polite">
          タップして場所を選択
        </div>
      )}

      <PostDetailSheet
        isOpen={selectedMarker !== null}
        onClose={() => setSelectedMarker(null)}
        post={selectedPost}
        markerType={selectedMarker?.type ?? "post"}
        isLoading={isLoadingPost}
        currentUserId={currentUserId}
        sightingId={
          selectedMarker?.type === "sighting" ? selectedMarker.id : undefined
        }
        sightingUserId={
          selectedMarker?.type === "sighting"
            ? selectedMarker.userId
            : undefined
        }
        onReportSighting={(postId) => {
          if (!currentUserId) {
            navigate("/login");
            return;
          }
          setSightingPostId(postId);
          setSightingModalOpen(true);
        }}
        onSendMessage={async (postId, sightingId) => {
          try {
            const conv = await api.createConversation(postId, sightingId);
            navigate(`/conversations/${conv.id}`);
          } catch {
            setError("メッセージの送信に失敗しました");
          }
        }}
        onSightingDeleted={() => setMarkersRefreshKey((k) => k + 1)}
        onEdit={(postId) => navigate(`/edit/${postId}`)}
      />

      <SightingModal
        isOpen={sightingModalOpen}
        onClose={() => {
          setSightingModalOpen(false);
          setSightingPostId(null);
        }}
        postId={sightingPostId ?? undefined}
        pickedLocation={pickedLocation}
        onSelectFromMap={() => {
          setSightingModalOpen(false);
          setSelectedMarker(null);
          setPickingLocation(true);
          setPickedLocation(null);
        }}
        onSuccess={() => {
          setSightingModalOpen(false);
          setSightingPostId(null);
          api
            .getMapMarkers()
            .then((data) => setMarkers(data))
            .catch(() => {});
        }}
      />

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ログイン状態を解除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await api.logout();
                } catch {
                  // エラー時もローカル状態はクリアする
                }
                setShowLogoutDialog(false);
                clearToken();
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function ZoomInIcon() {
  return (
    <svg
      className="map-zoom-button__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      className="map-zoom-button__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
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

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [enabled, onClick, map]);

  return null;
}
