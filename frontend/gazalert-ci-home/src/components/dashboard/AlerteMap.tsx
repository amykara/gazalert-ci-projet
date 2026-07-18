import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function AlerteMap({ lat, lon, niveau }: { lat: number; lon: number; niveau: string }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!conteneurRef.current) return;

    const couleur = niveau === "critique" ? "#ef4444" : "#f97316";

    const map = L.map(conteneurRef.current, {
      zoomControl: true,
    }).setView([lat, lon], 14);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.circleMarker([lat, lon], {
      radius: 10,
      fillColor: couleur,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, niveau]);

  return <div ref={conteneurRef} className="h-full w-full" />;
}
