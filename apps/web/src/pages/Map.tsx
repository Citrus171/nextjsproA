import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MapMarkerDto } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [35.9062, 139.6236];

const STATUS_LABEL: Record<string, string> = {
  lost: "迷子",
  resolved: "解決済み",
};

export default function Map() {
  const api = useApiClient();
  const [markers, setMarkers] = useState<MapMarkerDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMapMarkers()
      .then(setMarkers)
      .catch(() => setError("マーカーデータの取得に失敗しました"));
  }, [api]);

  if (error) return <p style={{ padding: 16, color: "red" }}>{error}</p>;

  return (
    <div style={{ height: "calc(100vh - 40px)", width: "100%" }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        minZoom={11}
        maxZoom={19}
        maxBounds={[
          [35.7, 139.4],
          [36.1, 139.9],
        ]}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m) => (
          <Marker key={`${m.type}-${m.id}`} position={[m.lat, m.lng]}>
            <Popup minWidth={180}>
              <div>
                <strong>{m.type === "post" ? "迷子投稿" : "目撃情報"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85em" }}>
                  ステータス: {STATUS_LABEL[m.status] ?? m.status}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
