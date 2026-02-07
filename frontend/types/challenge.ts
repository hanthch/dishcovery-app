export interface Challenge {
  id: string;
  name: string;
  description: string;
  image: string;
  foodType: string;
  postsRequired: number;
  postsCompleted: number;
  participants: number;
  isJoined: boolean;
  rewards?: string;
  endDate: string;
}