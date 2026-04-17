import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MarkerDto } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [35.9062, 139.6236];

export default function Map() {
  const api = useApiClient();
  const [markers, setMarkers] = useState<MarkerDto[]>([]);

  useEffect(() => {
    api.getMapMarkers().then(setMarkers).catch(console.error);
  }, [api]);

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
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]}>
            <Popup minWidth={220}>
              <div style={{ textAlign: "center" }}>
                <strong style={{ fontSize: "1.1em" }}>{m.title}</strong>
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt={m.title}
                    style={{ display: "block", width: "100%", margin: "8px 0", borderRadius: 4 }}
                  />
                )}
                <p style={{ margin: 0, fontSize: "0.85em", textAlign: "left", lineHeight: 1.5 }}>
                  {m.description}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
