import { Challenge } from "@/types/Challenge";
import { Database } from "@/integrations/supabase/types";

// DB types
export type DbChallenge = Database["public"]["Tables"]["matches"]["Row"];
export type DbClub = Database["public"]["Tables"]["clubs"]["Row"];
export type DbPlayer = Database["public"]["Tables"]["players"]["Row"];

//
// ------------------------
// CLUB MAPPER
// ------------------------
//
export const mapDbClub = (row: DbClub) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  sport: row.sport,
  createdAt: row.created_at,
});

//
// ------------------------
// PLAYER MAPPER
// ------------------------
//
export const mapDbPlayer = (row: DbPlayer) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  gender: row.gender,
  rank: row.rank,
  wins: row.wins ?? 0,
  losses: row.losses ?? 0,
  singlesRating: row.singles_rating,
  doublesRating: row.doubles_rating,
  matchFrequency: row.singles_match_frequency,
  singlesMatchFrequency: row.singles_match_frequency ?? null,
  doublesMatchFrequency: null,
  clubs: row.clubs ?? null,
  isAdmin: row.is_admin ?? false,
  createdAt: row.created_at ?? undefined,
});

//
// ------------------------
// CHALLENGE MAPPER
// ------------------------
//
export const mapDbChallengeToChallenge = (row: DbChallenge): Challenge => ({
  id: row.id,
  challengerId: row.challenger_id,
  challengedId: row.challenged_id,
  status: row.status as "pending" | "accepted" | "completed",
  scheduledDate: row.scheduled_date,
  winnerId: row.winner_id,
  player1Score: row.player1_score,
  player2Score: row.player2_score,
  score: row.score,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// UI -> DB for inserts/updates
export const mapChallengeToDb = (challenge: Partial<Challenge>) => ({
  challenger_id: challenge.challengerId,
  challenged_id: challenge.challengedId,
  status: challenge.status,
  scheduled_date: challenge.scheduledDate,
  winner_id: challenge.winnerId,
  score: challenge.score,
  player1_score: challenge.player1Score,
  player2_score: challenge.player2Score,
  notes: challenge.notes,
});
