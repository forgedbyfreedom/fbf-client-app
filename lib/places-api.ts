const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '';

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
 * Returns true if a Google Places API key is configured.
 */
export function hasApiKey(): boolean {
  return GOOGLE_PLACES_KEY.length > 0;
}

/**
 * Search for nearby gyms using Google Places Nearby Search API.
 */
export async function searchNearbyGyms(
  latitude: number,
  longitude: number,
  keyword?: string
): Promise<GymPlace[]> {
  if (!GOOGLE_PLACES_KEY) {
    throw new Error(
      'Google Places API key needed. Add EXPO_PUBLIC_GOOGLE_PLACES_KEY to your .env'
    );
  }

  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: '8000', // ~5 miles
    type: 'gym',
    key: GOOGLE_PLACES_KEY,
  });

  if (keyword) {
    params.set('keyword', keyword);
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status} - ${data.error_message || ''}`);
  }

  const results: any[] = data.results || [];

  return results.map((place) => ({
    place_id: place.place_id,
    name: place.name,
    rating: place.rating ?? 0,
    user_ratings_total: place.user_ratings_total ?? 0,
    vicinity: place.vicinity ?? '',
    lat: place.geometry?.location?.lat ?? 0,
    lng: place.geometry?.location?.lng ?? 0,
    open_now: place.opening_hours?.open_now ?? null,
    types: place.types ?? [],
    distance: haversineDistance(
      latitude,
      longitude,
      place.geometry?.location?.lat ?? 0,
      place.geometry?.location?.lng ?? 0
    ),
  }));
}
