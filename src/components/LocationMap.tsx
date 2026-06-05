import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix default icon paths (Leaflet expects assets at /marker-icon.png etc.)
const icon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  latitude: number;
  longitude: number;
  height?: number;
};

export function LocationMap({ latitude, longitude, height = 280 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="w-full rounded-xl border bg-muted"
        style={{ height }}
      />
    );
  }

  const pos: [number, number] = [latitude, longitude];

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-xl border"
        style={{ height }}
      >
        <MapContainer
          center={pos}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Topografisch">
              <TileLayer
                attribution='Karte: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), Daten: &copy; <a href="https://openstreetmap.org">OSM</a>'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                maxZoom={17}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Straße (OSM)">
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>-Mitwirkende'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellit">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="BKG TopPlus (DE)">
              <TileLayer
                attribution='&copy; <a href="https://www.bkg.bund.de">BKG</a>'
                url="https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web/default/WEBMERCATOR/{z}/{y}/{x}.png"
                maxZoom={18}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <Marker position={pos} icon={icon} />
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps <ExternalLink className="size-3.5" />
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1">
          <a
            href={`https://opentopomap.org/#marker=15/${latitude}/${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenTopoMap <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}