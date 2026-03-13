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

drop policy if exists "Super admins can update ladder memberships" on public.ladder_memberships;
create policy "Super admins can update ladder memberships"
on public.ladder_memberships
for update
to authenticated
using (
  public.current_user_is_super_admin()
)
with check (
  public.current_user_is_super_admin()
);
