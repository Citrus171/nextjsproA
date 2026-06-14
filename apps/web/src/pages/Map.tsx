import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
import Supercluster from "supercluster";
import type {
  MapMarkerDto,
  PostResponseDto,
} from "../../../../packages/api-client/src/index";
import { useAuth } from "../auth/AuthProvider";
import { useApiClient } from "../api/orvalClient";
import PostDetailSheet from "../components/PostDetailSheet";
import SightingModal from "../components/SightingModal";
import { reverseGeocode } from "../lib/reverseGeocode";
import { QUERY_KEYS } from "../lib/queryKeys";
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
import { Sheet, SheetContent } from "../components/ui/sheet";
import "../styles/map.css";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type ClusterBBox = [number, number, number, number]; // [west, south, east, north]
type MarkerPoint = { marker: MapMarkerDto };

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

export function createMarkerIcon(marker: MapMarkerDto, isOwn: boolean) {
  const tone = getMarkerTone(marker);
  const shapeClass =
    marker.type === "post" ? "map-marker--pin" : "map-marker--circle";
  const ownClass = isOwn ? " map-marker--own" : "";

  const label = getMarkerLabel(marker);
  return L.divIcon({
    className: "map-marker-icon",
    html: `
      <span class="map-marker ${shapeClass}${ownClass}" role="button" tabindex="0" aria-label="${label}" data-marker-id="${marker.id}" style="--marker-fill:${tone.fill};--marker-edge:${tone.edge};">
        <span class="map-marker__core"></span>
      </span>
      <span class="map-marker-label" aria-hidden="true">${label}</span>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 50],
    popupAnchor: [0, -36],
  });
}

export function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="map-cluster" role="button" aria-label="${count}件のマーカー"><span class="map-cluster__count">${count}</span></div>`,
    className: "map-cluster-icon",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function Map() {
  const api = useApiClient();
  const { userId: currentUserId, nickname, clearToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() =>
    getViewportHeight()
  );
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<ClusterBBox | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  const { data: unreadData } = useQuery({
    queryKey: QUERY_KEYS.unreadCount(),
    queryFn: () => api.getUnreadCount(),
    enabled: !!currentUserId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!mapInstance) return;
    const b = mapInstance.getBounds();
    setMapBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setMapZoom(mapInstance.getZoom());
  }, [mapInstance]);

  // flyTo on initial load from query params
  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    if (latParam && lngParam && mapInstance) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.flyTo([lat, lng], 16, { animate: true });
        searchParams.delete("lat");
        searchParams.delete("lng");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [mapInstance, searchParams, setSearchParams]);

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

  const fetchMarkersWithBounds = useCallback(
    (bounds: { south: number; north: number; west: number; east: number }) => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        api
          .getMapMarkers({
            minLat: bounds.south,
            maxLat: bounds.north,
            minLng: bounds.west,
            maxLng: bounds.east,
          })
          .then((data) => {
            setMarkers(data);
            setError(null);
          })
          .catch(() => setError("マーカーデータの取得に失敗しました"));
      }, 1500);
    },
    [api]
  );

  useEffect(() => {
    return () => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
    };
  }, []);

  const visibleMarkers = useMemo(() => {
    if (filter === "all") return markers;
    if (filter === "lost") return markers.filter((m) => m.type === "post");
    return markers.filter((m) => m.type === "sighting");
  }, [filter, markers]);

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<MarkerPoint>({ radius: 60, maxZoom: 16 });
    index.load(
      visibleMarkers.map((m) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
        properties: { marker: m },
      }))
    );
    return index;
  }, [visibleMarkers]);

  const clusters = useMemo(() => {
    if (!mapBounds) return [];
    return clusterIndex.getClusters(mapBounds, Math.floor(mapZoom));
  }, [clusterIndex, mapBounds, mapZoom]);

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
    <div className="relative w-full min-h-dvh overflow-hidden map-page">
      <header className="fixed top-0 left-0 right-0 z-[1300] px-4 pt-4 md:px-5 md:pt-5 pointer-events-none">
        <div className="flex items-center gap-2.5 p-2.5 rounded-[20px] bg-background/95 shadow-overlay backdrop-blur-[12px] pointer-events-auto md:max-w-[640px]">
          <span className="text-sm font-bold text-foreground flex-1">
            ねこ探しマップ
          </span>
          {nickname && (
            <span className="text-xs text-muted-foreground font-medium">
              {nickname} 様
            </span>
          )}
        </div>

        <div
          className="flex gap-2.5 mt-3 pt-1 pb-0 px-0.5 overflow-x-auto pointer-events-auto scrollbar-none"
          role="group"
          aria-label="地図フィルター"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.value;
            const activeColors: Record<string, string> = {
              all: "bg-foreground",
              lost: "bg-destructive",
              sighting: "bg-primary",
            };
            return (
              <button
                key={option.value}
                type="button"
                className={`inline-flex items-center justify-center flex-shrink-0 min-h-9 px-4 rounded-full border text-sm font-bold cursor-pointer outline-none transition-colors
                  ${
                    isActive
                      ? `${activeColors[option.value]} text-white border-transparent`
                      : "border-border bg-background/95 text-foreground shadow-chip"
                  }
                  focus-visible:ring-2 focus-visible:ring-ring`}
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
        <p
          className="fixed top-[112px] left-4 right-4 md:top-[116px] md:left-5 md:right-auto md:max-w-[420px] z-[1250] m-0 px-3 py-2.5 rounded-xl border border-destructive-muted bg-destructive-soft/95 text-destructive text-[13px] shadow-overlay"
          role="status"
        >
          {error}
        </p>
      )}
      {locationError && (
        <p
          className="fixed top-[164px] left-4 right-4 md:top-[168px] md:left-5 md:right-auto md:max-w-[420px] z-[1250] m-0 px-3 py-2.5 rounded-xl border border-destructive-muted bg-destructive-soft/95 text-destructive text-[13px] shadow-overlay"
          role="status"
        >
          {locationError}
        </p>
      )}

      <main className="relative w-full h-dvh pt-[92px] pb-[92px] md:pb-6">
        <div className="relative w-full h-full overflow-hidden map-stage__frame">
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
            wheelPxPerZoomLevel={480}
            zoomSnap={0.5}
            zoomDelta={0.5}
            className="w-full h-full"
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
            <MapMoveHandler
              onMove={fetchMarkersWithBounds}
              onViewChange={(bbox, zoom) => {
                setMapBounds(bbox);
                setMapZoom(zoom);
              }}
            />
            <MapContextMenuHandler
              enabled={
                !pickingLocation &&
                selectedMarker === null &&
                !sightingModalOpen
              }
              onActivate={() => setContextMenuOpen(true)}
            />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clusters.map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              const isCluster =
                "cluster" in feature.properties &&
                feature.properties.cluster === true;

              if (isCluster) {
                const clusterId = (
                  feature.properties as Supercluster.ClusterProperties
                ).cluster_id;
                const pointCount = (
                  feature.properties as Supercluster.ClusterProperties
                ).point_count;
                return (
                  <Marker
                    key={`cluster-${clusterId}`}
                    position={[lat, lng]}
                    icon={createClusterIcon(pointCount)}
                    title={`${pointCount}件のマーカー`}
                    eventHandlers={{
                      click: () => {
                        if (!mapInstance) return;
                        const expansionZoom = Math.min(
                          clusterIndex.getClusterExpansionZoom(clusterId),
                          19
                        );
                        mapInstance.flyTo([lat, lng], expansionZoom, {
                          animate: true,
                        });
                      },
                    }}
                  />
                );
              }

              const { marker } = feature.properties as MarkerPoint;
              return (
                <Marker
                  key={`${marker.type}-${marker.id}`}
                  position={[lat, lng]}
                  icon={createMarkerIcon(
                    marker,
                    marker.userId === currentUserId
                  )}
                  title={marker.type === "post" ? "迷子投稿" : "目撃情報"}
                  eventHandlers={{
                    click: () => setSelectedMarker(marker),
                  }}
                />
              );
            })}
          </MapContainer>

          {mapInstance && (
            <div className="absolute top-4 right-4 md:top-5 md:right-5 z-[1100] pointer-events-auto flex flex-col gap-2">
              <div className="flex flex-col rounded-md overflow-hidden shadow-control">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-11 h-11 p-0 border-0 bg-control/95 text-control-foreground cursor-pointer outline-none hover:bg-control-hover active:bg-control-active focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  aria-label="ズームイン"
                  onClick={handleZoomIn}
                >
                  <ZoomInIcon />
                </button>
                <div className="h-px bg-control-foreground/15" />
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-11 h-11 p-0 border-0 bg-control/95 text-control-foreground cursor-pointer outline-none hover:bg-control-hover active:bg-control-active focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  aria-label="ズームアウト"
                  onClick={handleZoomOut}
                >
                  <ZoomOutIcon />
                </button>
              </div>
              <button
                type="button"
                className="relative inline-flex items-center justify-center w-11 h-11 p-0 border-0 rounded-md bg-control/95 text-control-foreground shadow-control cursor-pointer outline-none hover:bg-control-hover focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 disabled:cursor-progress"
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

      <nav
        className={`fixed left-0 right-0 bottom-0 z-[1300] grid gap-2 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5 bg-gradient-to-t from-background via-background/90 to-background/0 md:left-4 md:right-4 md:bottom-4 md:max-w-[720px] md:mx-auto md:rounded-3xl md:shadow-overlay ${currentUserId ? "grid-cols-5" : "grid-cols-2"}`}
        aria-label="投稿アクション"
      >
        <button
          type="button"
          className="inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-destructive-muted bg-destructive-soft text-destructive text-xs font-bold shadow-float cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            if (!currentUserId) {
              toast("投稿を作成するにはログインが必要です");
              navigate("/login");
              return;
            }
            navigate("/create");
          }}
        >
          <PlusIcon />
          <span>迷い猫投稿</span>
        </button>
        <button
          type="button"
          className="inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-border bg-background text-foreground text-xs font-bold shadow-float cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            if (!currentUserId) {
              toast("目撃を報告するにはログインが必要です");
              navigate("/login");
              return;
            }
            setSightingPostId(null);
            setSightingModalOpen(true);
          }}
        >
          <EyeIcon />
          <span>目撃を報告</span>
        </button>
        {currentUserId && (
          <>
            <button
              type="button"
              className="relative inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-border bg-background text-foreground text-xs font-bold shadow-float cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigate("/conversations")}
            >
              <ChatIcon />
              <span>会話</span>
              {unreadData && (unreadData.count ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-extrabold leading-none">
                  {(unreadData.count ?? 0) > 99 ? "99+" : unreadData.count}
                </span>
              )}
            </button>
            <button
              type="button"
              className="inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-border bg-background text-foreground text-xs font-bold shadow-float cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="自分の投稿"
              onClick={() => navigate("/posts")}
            >
              <ListIcon />
              <span>自分の投稿</span>
            </button>
            <button
              type="button"
              className="inline-flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-2xl border border-border bg-background text-muted-foreground text-xs font-bold shadow-float cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="ログアウト"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </nav>

      {pickingLocation && (
        <div
          className="fixed top-0 left-0 right-0 z-[1400] py-2.5 px-4 bg-primary/95 text-primary-foreground text-sm font-bold text-center shadow-control"
          aria-live="polite"
        >
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
            toast("目撃を報告するにはログインが必要です");
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
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <SheetContent side="bottom">
          <div className="px-6 pt-6 pb-8 space-y-3">
            <button
              type="button"
              className="w-full py-3.5 text-base font-bold text-center rounded-2xl border border-destructive-muted bg-destructive-soft text-destructive"
              onClick={() => {
                setContextMenuOpen(false);
                if (!currentUserId) {
                  toast("投稿を作成するにはログインが必要です");
                  navigate("/login");
                } else {
                  navigate("/create");
                }
              }}
            >
              迷い猫投稿
            </button>
            <button
              type="button"
              className="w-full py-3.5 text-base font-bold text-center rounded-2xl border border-border bg-background text-foreground"
              onClick={() => {
                setContextMenuOpen(false);
                if (!currentUserId) {
                  toast("目撃を報告するにはログインが必要です");
                  navigate("/login");
                } else {
                  setSightingPostId(null);
                  setSightingModalOpen(true);
                }
              }}
            >
              目撃を報告する
            </button>
            <button
              type="button"
              className="w-full py-3.5 text-base text-muted-foreground text-center"
              onClick={() => setContextMenuOpen(false)}
            >
              キャンセル
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}

function EyeIcon() {
  return <span aria-hidden="true">👁</span>;
}

function ChatIcon() {
  return <span aria-hidden="true">💬</span>;
}

function ListIcon() {
  return <span aria-hidden="true">📋</span>;
}

function LocationIcon({ loading }: { loading: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`w-[19px] h-[19px] block ${loading ? "animate-[map-locate-spin_1s_linear_infinite]" : ""}`}
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
      className="w-[18px] h-[18px] block"
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
      className="w-[18px] h-[18px] block"
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

function MapContextMenuHandler({
  enabled,
  onActivate,
}: {
  enabled: boolean;
  onActivate: () => void;
}) {
  const map = useMap();
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleContextMenu = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      onActivate();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        clearTimer();
        startPos.current = null;
        return;
      }
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      timerRef.current = setTimeout(() => {
        onActivate();
      }, 600);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        clearTimer();
        startPos.current = null;
        return;
      }
      if (!startPos.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimer();
        startPos.current = null;
      }
    };

    const handleTouchEnd = () => {
      clearTimer();
      startPos.current = null;
    };

    map.on("contextmenu", handleContextMenu);
    map.getContainer().addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    map.getContainer().addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    map.getContainer().addEventListener("touchend", handleTouchEnd);

    return () => {
      map.off("contextmenu", handleContextMenu);
      map
        .getContainer()
        .removeEventListener("touchstart", handleTouchStart as EventListener);
      map
        .getContainer()
        .removeEventListener("touchmove", handleTouchMove as EventListener);
      map
        .getContainer()
        .removeEventListener("touchend", handleTouchEnd as EventListener);
      clearTimer();
    };
  }, [enabled, onActivate, map]);

  return null;
}

function MapMoveHandler({
  onMove,
  onViewChange,
}: {
  onMove: (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => void;
  onViewChange?: (bbox: ClusterBBox, zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      const b = map.getBounds();
      onMove({
        south: b.getSouth(),
        north: b.getNorth(),
        west: b.getWest(),
        east: b.getEast(),
      });
      onViewChange?.(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        map.getZoom()
      );
    };

    map.on("moveend", handler);
    return () => {
      map.off("moveend", handler);
    };
  }, [onMove, onViewChange, map]);

  return null;
}
