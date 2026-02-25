alter table if exists public.ladders
  add column if not exists warm_up_time integer not null default 10,
  add column if not exists play_time integer not null default 60;
