import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList }       from '../types/navigation';
 
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
 
/** Navigate to any root-stack screen from anywhere in the app. */
export function navigate<K extends keyof RootStackParamList>(
  name: K,
  params?: RootStackParamList[K],
) {
  if (navigationRef.isReady()) {
    // @ts-ignore — overloaded signature; runtime call is correct
    navigationRef.navigate(name, params);
  } else {
    console.warn('[navigationRef] Navigator not ready — navigate() skipped:', name);
  }
}
 
/** Go back if possible. */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
 