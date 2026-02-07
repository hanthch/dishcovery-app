export interface LocationPermission {
  status: 'granted' | 'denied' | 'undetermined';
  latitude?: number;
  longitude?: number;
}