export interface Player {
  id: string;
  name: string;
  email: string;
  gender: string | null;
  rank: number;
  wins: number;
  losses: number;
  matchFrequency: number | null; // mapped from singles_match_frequency
  singlesMatchFrequency?: number | null; // mapped from singles_match_frequency
  doublesMatchFrequency?: number | null; // kept for compatibility (set to null)
  clubs: string[] | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  phone?: string | null;
  createdAt?: string;
  avatarUrl?: string | null;
}
