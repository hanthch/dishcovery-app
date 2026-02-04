import { useQuery } from '@tanstack/react-query';
import api from '../services/api.service';

export function useRestaurantLandmarks(id: number) {
  return useQuery({
    queryKey: ['restaurant-landmarks', id],
    queryFn: () => api.getRestaurantLandmarkNotes(id),
    enabled: !!id,
  });
}
