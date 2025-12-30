
export interface Club {
  id: string;
  name: string;
  ladders: {
    singles: boolean;
    doubles: boolean;
  };
  adminId?: string; // ID of the player who is the club admin
}
