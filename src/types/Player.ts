export interface Player {
  id: string;
  name: string;
  email: string;
  rank: number;
  clubs: string[] | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  phone?: string | null;
  createdAt?: string;
  avatarUrl?: string | null;
  last_name?: string | null;
}
