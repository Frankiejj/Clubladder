create or replace function public.rebalance_ladder_membership_ranks(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select
      id,
      row_number() over (
        order by
          coalesce(rank, 2147483647),
          created_at,
          id
      ) as new_rank
    from public.ladder_memberships
    where ladder_id = p_ladder_id
  )
  update public.ladder_memberships lm
  set rank = 1000000 + r.new_rank
  from ranked r
  where lm.id = r.id;

  with ranked as (
    select
      id,
      row_number() over (
        order by
          coalesce(rank, 2147483647),
          created_at,
          id
      ) as new_rank
    from public.ladder_memberships
    where ladder_id = p_ladder_id
  )
  update public.ladder_memberships lm
  set rank = r.new_rank
  from ranked r
  where lm.id = r.id;
end;
$$;

create or replace function public.rebalance_ladder_membership_ranks_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.ladder_id is null then
    return OLD;
  end if;

  perform public.rebalance_ladder_membership_ranks(OLD.ladder_id);
  return OLD;
end;
$$;

drop trigger if exists trg_rebalance_ladder_memberships_after_delete on public.ladder_memberships;
create trigger trg_rebalance_ladder_memberships_after_delete
  after delete on public.ladder_memberships
  for each row
  execute function public.rebalance_ladder_membership_ranks_after_delete();
