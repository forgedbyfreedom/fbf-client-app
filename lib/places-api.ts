// Nearby-gym search backed by OpenStreetMap's Overpass API — free, no API key
// required. Replaces the old Google Places dependency (which needed a paid,
// key-gated endpoint and was returning dead results in the app).

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
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Search for nearby gyms/fitness centres using the OpenStreetMap Overpass API.
 * Searches within `radiusMeters` (default ~8 km / 5 mi) of the given point.
 */
export async function searchNearbyGyms(
  latitude: number,
  longitude: number,
  keyword?: string,
  radiusMeters = 8000
): Promise<GymPlace[]> {
  // leisure=fitness_centre and leisure=sports_centre cover commercial gyms;
  // amenity=gym is an older tag some regions still use.
  const query = `
    [out:json][timeout:25];
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
  let lastErr: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
      });
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
    throw new Error(
      `Could not reach the gym directory right now. ${
        lastErr instanceof Error ? lastErr.message : ''
      }`.trim()
    );
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
