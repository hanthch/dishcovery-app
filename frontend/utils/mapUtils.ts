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
  const query = encodeURIComponent(
    [name, address].filter(Boolean).join(' ')
  );

  let googleMapsAppUrl = '';
  let appleMapsUrl = '';
  let webUrl = '';

  // ===== 1️⃣ GOOGLE MAPS APP =====
  if (googleMapsUrl) {
    googleMapsAppUrl = googleMapsUrl;
  } else if (lat && lng) {
    googleMapsAppUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
  } else {
    googleMapsAppUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?q=${query}`
        : `geo:0,0?q=${query}`;
  }

  // ===== 2️⃣ APPLE MAPS (iOS FALLBACK) =====
  if (lat && lng) {
    appleMapsUrl = `maps://?q=${lat},${lng}`;
  } else {
    appleMapsUrl = `maps://?q=${query}`;
  }

  webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

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
    console.error('Failed to open maps:', err);
  }
}