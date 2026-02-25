import { useQuery } from '@tanstack/react-query';
import api from '../services/Api.service';

export function useRestaurantLandmarks(id: string) {
  return useQuery({
    queryKey: ['restaurant-landmarks', id],
    queryFn: () => api.getRestaurantLandmarkNotes(id),
    enabled: !!id,
  });
}