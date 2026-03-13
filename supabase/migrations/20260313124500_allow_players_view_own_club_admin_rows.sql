create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.players p
  where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

revoke all on function public.current_player_id() from public;
grant execute on function public.current_player_id() to authenticated;

drop policy if exists "Players can view their own club admin rows" on public.club_admins;
create policy "Players can view their own club admin rows"
on public.club_admins
for select
to authenticated
using (
  player_id = public.current_player_id()
  or public.current_user_is_super_admin()
);
