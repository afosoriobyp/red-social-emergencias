"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Report, GRAVITY_META, TYPE_LABELS, CATEGORY_LABELS } from "@/lib/types";
import { Link2, Navigation } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [
  Number(process.env.NEXT_PUBLIC_CITY_LAT) || 4.4126,
  Number(process.env.NEXT_PUBLIC_CITY_LNG) || -76.1546,
];
const NEARBY_KM = Number(process.env.NEXT_PUBLIC_NEARBY_KM) || 25;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function markerIcon(report: Report): L.DivIcon {
  const meta = GRAVITY_META[report.gravity];
  const svg = `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 1C9 1 3 7.5 3 15.2 3 27 17 43 17 43s14-16 14-27.8C31 7.5 25 1 17 1Z" fill="${meta.color}" stroke="white" stroke-width="2.5"/>
    <circle cx="17" cy="15" r="6" fill="white" fill-opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  });
}

function FitReports({
  reports,
  locateOnMount,
}: {
  reports: Report[];
  locateOnMount: boolean;
}) {
  const map = useMap();
  const positioned = useRef(false);

  useEffect(() => {
    if (reports.length === 0) {
      if (!positioned.current) {
        positioned.current = true;
        if (locateOnMount && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, {
                duration: 0.8,
              }),
            () => map.setView(DEFAULT_CENTER, 12),
            { timeout: 6000 },
          );
        } else {
          map.setView(DEFAULT_CENTER, 12);
        }
      }
      return;
    }
    positioned.current = true;
    const near = reports.filter(
      (r) => haversineKm(DEFAULT_CENTER[0], DEFAULT_CENTER[1], r.lat, r.lng) <= NEARBY_KM,
    );
    if (near.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }
    const bounds = L.latLngBounds(
      near.map((r) => [r.lat, r.lng] as [number, number]),
    );
    map.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
      animate: true,
      duration: 0.7,
    });
  }, [reports, map, locateOnMount]);

  return null;
}

export default function MapView({
  reports,
  onLocate,
  locateOnMount = false,
}: {
  reports: Report[];
  onLocate?: (lat: number, lng: number) => void;
  locateOnMount?: boolean;
}) {
  const [located, setLocated] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const userIcon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:4px solid rgba(37,99,235,.35);box-shadow:0 0 0 8px rgba(37,99,235,.25)"></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    [],
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={12}
      className="h-full w-full z-0"
      scrollWheelZoom
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitReports reports={reports} locateOnMount={locateOnMount} />
      {reports.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={markerIcon(r)}>
          <Popup>
            <div className="w-56 font-sans">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: GRAVITY_META[r.gravity].color }}>
                  {GRAVITY_META[r.gravity].label}
                </span>
                <span className="text-[11px] text-gray-500">
                  {CATEGORY_LABELS[r.category]}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-tight">{r.title}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {TYPE_LABELS[r.type]} · hace {formatAgo(r.createdAt)}
              </p>
              {r.address && (
                <p className="mt-1 text-xs text-gray-500">📍 {r.address}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Navigation size={11} /> Cómo llegar
                </a>
                {r.contactPhone && (
                  <a
                    href={`https://wa.me/${r.contactPhone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700 hover:bg-green-200"
                  >
                    <Link2 size={11} /> Contactar
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {located && (
        <Marker position={located} icon={userIcon}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      )}
      {onLocate && (
        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const p: [number, number] = [
                  pos.coords.latitude,
                  pos.coords.longitude,
                ];
                setLocated(p);
                onLocate?.(p[0], p[1]);
                mapRef.current?.flyTo(p, 13, { duration: 0.6 });
              });
            }
          }}
          className="absolute bottom-4 right-4 z-[1000] rounded-full bg-white p-3 shadow-lg ring-1 ring-black/5 hover:bg-gray-50"
          aria-label="Mi ubicación"
        >
          <Navigation size={18} className="text-blue-600" />
        </button>
      )}
    </MapContainer>
  );
}

function formatAgo(date: Date): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}