create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players p
    where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(p.is_super_admin, false) = true
  );
$$;

revoke all on function public.current_user_is_super_admin() from public;
grant execute on function public.current_user_is_super_admin() to authenticated;

drop policy if exists "Club members can view players in their clubs" on public.players;
create policy "Club members can view players in their clubs"
on public.players
for select
to authenticated
using (
  public.current_user_is_super_admin()
  or exists (
    select 1
    from jsonb_array_elements_text(
      coalesce(to_jsonb(players.clubs), '[]'::jsonb)
    ) as club_id_txt(value)
    where club_id_txt.value = any(public.current_user_club_ids())
  )
);

drop policy if exists "Club members can view ladders in their clubs" on public.ladders;
create policy "Club members can view ladders in their clubs"
on public.ladders
for select
to authenticated
using (
  public.current_user_is_super_admin()
  or club_id::text = any(public.current_user_club_ids())
);

drop policy if exists "Club members can view ladder memberships in their clubs" on public.ladder_memberships;
create policy "Club members can view ladder memberships in their clubs"
on public.ladder_memberships
for select
to authenticated
using (
  public.current_user_is_super_admin()
  or exists (
    select 1
    from public.ladders l
    where l.id = ladder_memberships.ladder_id
      and l.club_id::text = any(public.current_user_club_ids())
  )
);

drop policy if exists "Club members can view matches in their clubs" on public.matches;
create policy "Club members can view matches in their clubs"
on public.matches
for select
to authenticated
using (
  public.current_user_is_super_admin()
  or exists (
    select 1
    from public.ladders l
    where l.id = matches.ladder_id
      and l.club_id::text = any(public.current_user_club_ids())
  )
);

drop policy if exists "Club members can view ladder rank history in their clubs" on public.ladder_rank_history;
create policy "Club members can view ladder rank history in their clubs"
on public.ladder_rank_history
for select
to authenticated
using (
  public.current_user_is_super_admin()
  or exists (
    select 1
    from public.ladders l
    where l.id = ladder_rank_history.ladder_id
      and l.club_id::text = any(public.current_user_club_ids())
  )
);
