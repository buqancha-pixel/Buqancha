/**
 * Xaritadagi joylashuv: admin kiritgan matndan koordinata va xarita havolalari.
 * Avtomatik geokodlash ishlatilmaydi — O'zbekiston manzillarida ko'pincha boshqa shahardagi
 * shu nomli ko'chani topadi.
 */
export type LatLng = { lat: number; lng: number };

// O'zbekiston chegaralari (biroz zaxira bilan)
const BOUNDS = { minLat: 37, maxLat: 45.7, minLng: 55.9, maxLng: 73.3 };

export function inUzbekistan({ lat, lng }: LatLng): boolean {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

const NUM = String.raw`(-?\d{1,3}\.\d+)`;

/**
 * "41.311081, 69.240562", Google Maps havolasi (@lat,lng / q=lat,lng / !3dlat!4dlng)
 * yoki Yandex havolasi (ll=lng,lat / pt=lng,lat) → koordinata.
 */
export function parseLocation(input: string): LatLng | null {
  const s = decodeURIComponent(input.trim());
  const pick = (a: string, b: string, swap = false): LatLng => {
    const x = Number(a);
    const y = Number(b);
    return swap ? { lat: y, lng: x } : { lat: x, lng: y };
  };
  let m: RegExpMatchArray | null;
  if ((m = s.match(new RegExp(String.raw`!3d${NUM}!4d${NUM}`)))) return valid(pick(m[1], m[2]));
  if ((m = s.match(new RegExp(String.raw`@${NUM},${NUM}`)))) return valid(pick(m[1], m[2]));
  if ((m = s.match(new RegExp(String.raw`[?&](?:q|query|ll|destination)=${NUM},\s*${NUM}`))) && /google|goo\.gl/.test(s))
    return valid(pick(m[1], m[2]));
  if ((m = s.match(new RegExp(String.raw`[?&](?:ll|pt)=${NUM},${NUM}`))) && /yandex/.test(s)) return valid(pick(m[1], m[2], true));
  if ((m = s.match(new RegExp(String.raw`^${NUM}\s*[,;\s]\s*${NUM}$`)))) return valid(pick(m[1], m[2]));
  return null;
}

function valid(p: LatLng): LatLng | null {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && inUzbekistan(p) ? p : null;
}

export type Place = { name: string; address?: string | null; city?: string | null; lat?: number | null; lng?: number | null };

function query(p: Place): string {
  return [p.name, p.address, p.city, "O'zbekiston"].filter(Boolean).join(", ");
}

export function googleMapsUrl(p: Place): string {
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : query(p);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function yandexMapsUrl(p: Place): string {
  if (p.lat != null && p.lng != null) return `https://yandex.uz/maps/?pt=${p.lng},${p.lat}&z=17&l=map`;
  return `https://yandex.uz/maps/?text=${encodeURIComponent(query(p))}`;
}
