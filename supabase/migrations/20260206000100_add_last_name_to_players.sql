-- Add last_name column to players
alter table public.players
  add column if not exists last_name text;
