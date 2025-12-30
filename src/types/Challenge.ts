export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: "pending" | "scheduled" | "accepted" | "completed" | "cancelled";
  scheduledDate?: string | null;
  winnerId?: string | null;
  score?: string | null;
  player1Score?: number | null;
  player2Score?: number | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
