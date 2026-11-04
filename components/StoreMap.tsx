"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapPoint = { id: string; name: string; address: string | null; lat: number; lng: number; mapUrl: string };

/** Do'konlar xaritasi (OpenStreetMap). Faqat aniq koordinatasi kiritilgan joylar ko'rsatiladi. */
export function StoreMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const icon = L.divIcon({ className: "store-pin", html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
      const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
      for (const p of points) {
        L.marker([p.lat, p.lng], { icon, title: p.name })
          .addTo(map)
          .bindPopup(
            `<strong>${esc(p.name)}</strong>${p.address ? `<br>${esc(p.address)}` : ""}<br><a href="${esc(p.mapUrl)}" target="_blank" rel="noopener noreferrer">Yo'nalish olish ↗</a>`,
          );
      }
      // konteyner o'lchami aniq bo'lgach ko'rinishni hisoblaymiz
      map.invalidateSize();
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
      else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [56, 56], maxZoom: 15 });
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={el} className="store-map h-[340px] w-full overflow-hidden rounded-card border border-border sm:h-[440px]" role="region" aria-label="Kitob do'konlari xaritasi" />;
}
