// Nearby-gym search. Primary source: Google Places (New) — reliable, with
// ratings and open-now. Fallback: OpenStreetMap's public Overpass servers
// (free, no key) — used only if Google fails, because those servers are
// volunteer-run and regularly return 500s/timeouts under load.

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '';

export interface GymPlace {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  vicinity: string;
  lat: number;
  lng: number;
  open_now: boolean | null;
  types: string[];
  distance: number; // miles from user
}

/**
 * Haversine formula to calculate distance between two lat/lng points in miles.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * No API key is required for the OpenStreetMap backend, so this is always true.
 * Kept for backwards compatibility with callers that gate on it.
 */
export function hasApiKey(): boolean {
  return true;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const GOOGLE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.shortFormattedAddress',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours.openNow',
  'places.primaryType',
  'places.types',
].join(',');

async function searchGoogle(
  latitude: number,
  longitude: number,
  keyword: string | undefined,
  radiusMeters: number
): Promise<GymPlace[]> {
  const circle = { center: { latitude, longitude }, radius: Math.min(radiusMeters, 50000) };
  const kw = keyword?.trim();
  const url = kw
    ? 'https://places.googleapis.com/v1/places:searchText'
    : 'https://places.googleapis.com/v1/places:searchNearby';
  const body = kw
    ? { textQuery: /gym|fitness|crossfit|studio|club/i.test(kw) ? kw : `${kw} gym`, maxResultCount: 20, locationBias: { circle } }
    : {
        // Primary type only — "gym" alone also matches hotels that have one.
        includedPrimaryTypes: ['gym', 'fitness_center'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: { circle },
      };
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': GOOGLE_FIELDS },
      body: JSON.stringify(body),
    },
    12000
  );
  if (!res.ok) throw new Error(`Places ${res.status}`);
  const data = await res.json();
  return ((data.places || []) as any[])
    .map((p) => {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (lat == null || lng == null) return null;
      return {
        place_id: String(p.id),
        name: p.displayName?.text || 'Gym',
        rating: Number(p.rating) || 0,
        user_ratings_total: Number(p.userRatingCount) || 0,
        vicinity: p.shortFormattedAddress || p.formattedAddress || '',
        lat,
        lng,
        open_now: typeof p.currentOpeningHours?.openNow === 'boolean' ? p.currentOpeningHours.openNow : null,
        types: (p.types as string[]) || [p.primaryType || 'gym'],
        distance: haversineDistance(latitude, longitude, lat, lng),
      } as GymPlace;
    })
    .filter((g): g is GymPlace => g !== null)
    // Keyword searches keep Google's relevance order; nearby lists go by distance.
    .sort((a, b) => (kw ? 0 : a.distance - b.distance));
}

/**
 * Search for nearby gyms/fitness centres within `radiusMeters`
 * (default ~8 km / 5 mi) of the given point.
 */
export async function searchNearbyGyms(
  latitude: number,
  longitude: number,
  keyword?: string,
  radiusMeters = 8000
): Promise<GymPlace[]> {
  let googleErr: unknown = null;
  if (GOOGLE_KEY) {
    try {
      return await searchGoogle(latitude, longitude, keyword, radiusMeters);
    } catch (err) {
      googleErr = err;
      console.warn('[gyms] Google Places failed, trying OpenStreetMap', err);
    }
  }
  return searchOverpass(latitude, longitude, keyword, radiusMeters, googleErr);
}

async function searchOverpass(
  latitude: number,
  longitude: number,
  keyword: string | undefined,
  radiusMeters: number,
  priorErr: unknown
): Promise<GymPlace[]> {
  // leisure=fitness_centre and leisure=sports_centre cover commercial gyms;
  // amenity=gym is an older tag some regions still use.
  const query = `
    [out:json][timeout:20];
    (
      node["leisure"="fitness_centre"](around:${radiusMeters},${latitude},${longitude});
      way["leisure"="fitness_centre"](around:${radiusMeters},${latitude},${longitude});
      node["leisure"="sports_centre"](around:${radiusMeters},${latitude},${longitude});
      way["leisure"="sports_centre"](around:${radiusMeters},${latitude},${longitude});
      node["amenity"="gym"](around:${radiusMeters},${latitude},${longitude});
    );
    out center tags 60;
  `.trim();

  let data: any = null;
  let lastErr: unknown = priorErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: query },
        20000
      );
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`);
        continue;
      }
      data = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!data) {
    console.warn('[gyms] all sources failed', lastErr);
    throw new Error('Could not reach the gym directory right now. Check your connection and try again.');
  }

  const elements: any[] = data.elements || [];
  const kw = keyword?.toLowerCase().trim();

  const gyms: GymPlace[] = elements
    .map((el) => {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) return null;

      const name: string = tags.name || 'Unnamed gym';
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
      ].filter(Boolean);
      const vicinity = addressParts.join(' ') || tags['addr:full'] || '';

      const types: string[] = [];
      if (tags.leisure) types.push(String(tags.leisure));
      if (tags.amenity) types.push(String(tags.amenity));
      if (tags.sport) types.push(String(tags.sport));

      return {
        place_id: `osm-${el.type}-${el.id}`,
        name,
        rating: 0, // OSM has no ratings
        user_ratings_total: 0,
        vicinity,
        lat,
        lng,
        open_now: null, // opening_hours parsing is out of scope
        types: types.length ? types : ['gym'],
        distance: haversineDistance(latitude, longitude, lat, lng),
      } as GymPlace;
    })
    .filter((g): g is GymPlace => g !== null)
    .filter((g) => (kw ? g.name.toLowerCase().includes(kw) : true))
    .sort((a, b) => a.distance - b.distance);

  return gyms;
}
