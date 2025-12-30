-- Add missing singles_match_frequency column to players
alter table public.players
  add column if not exists singles_match_frequency integer;

