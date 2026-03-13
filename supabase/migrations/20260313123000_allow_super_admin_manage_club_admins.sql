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

alter table public.club_admins enable row level security;

drop policy if exists "Super admins can view club admins" on public.club_admins;
create policy "Super admins can view club admins"
on public.club_admins
for select
to authenticated
using (
  public.current_user_is_super_admin()
);

drop policy if exists "Super admins can insert club admins" on public.club_admins;
create policy "Super admins can insert club admins"
on public.club_admins
for insert
to authenticated
with check (
  public.current_user_is_super_admin()
);

drop policy if exists "Super admins can delete club admins" on public.club_admins;
create policy "Super admins can delete club admins"
on public.club_admins
for delete
to authenticated
using (
  public.current_user_is_super_admin()
);
