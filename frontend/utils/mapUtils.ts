import { Platform, Linking } from 'react-native';

type OpenMapsArgs = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
};

export async function openMaps({
  name,
  address,
  lat,
  lng,
  googleMapsUrl,
}: OpenMapsArgs) {
  // FIX: Use address alone (not name+address) for text queries — mixing the
  // restaurant name into the search string can confuse Maps and land on the
  // wrong pin or a generic search result instead of the exact address.
  const addressQuery = encodeURIComponent(address || name || '');

  let googleMapsAppUrl = '';
  let appleMapsUrl     = '';
  let webUrl           = '';

  // ===== 1️⃣ GOOGLE MAPS APP =====
  // FIX: lat/lng must win over a stored googleMapsUrl — the stored URL was
  // generated at creation time and may be stale or imprecise. Coordinates
  // always give a direct pin drop.
  if (lat && lng) {
    googleMapsAppUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
  } else if (googleMapsUrl) {
    // Stored URL is still useful when we have no coordinates
    googleMapsAppUrl = googleMapsUrl;
  } else {
    googleMapsAppUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?q=${addressQuery}`
        : `geo:0,0?q=${addressQuery}`;
  }

  // ===== 2️⃣ APPLE MAPS (iOS FALLBACK) =====
  // FIX: use `daddr` (destination) instead of `q` when we have coordinates —
  // `daddr` opens turn-by-turn directions, which is what users expect.
  if (lat && lng) {
    appleMapsUrl = `maps://?daddr=${lat},${lng}`;
  } else {
    appleMapsUrl = `maps://?q=${addressQuery}`;
  }

  // ===== 3️⃣ WEB FALLBACK =====
  // FIX: prefer a directions URL with coordinates over a text search URL —
  // this drops a precise pin instead of returning a list of search results.
  webUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

  try {
    // Prefer Google Maps app
    const canOpenGoogle = await Linking.canOpenURL(googleMapsAppUrl);
    if (canOpenGoogle) {
      await Linking.openURL(googleMapsAppUrl);
      return;
    }

    // iOS fallback → Apple Maps
    if (Platform.OS === 'ios') {
      const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
      if (canOpenApple) {
        await Linking.openURL(appleMapsUrl);
        return;
      }
    }

    // Last resort → browser
    await Linking.openURL(webUrl);
  } catch (err) {
    console.error('[openMaps] Failed to open maps:', err);
  }
}