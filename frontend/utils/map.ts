import { Platform, Linking } from 'react-native';

export function openGoogleMaps({
  name,
  address,
  lat,
  lng,
  googleMapsUrl,
}: {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
}) {
  // Prefer official Google Maps URL if available
  if (googleMapsUrl) {
    Linking.openURL(googleMapsUrl);
    return;
  }

  let url = '';

  if (lat && lng) {
    url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    })!;
  } else if (address || name) {
    const query = encodeURIComponent(
      [name, address].filter(Boolean).join(' ')
    );
    url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    })!;
  }

  Linking.openURL(url);
}
