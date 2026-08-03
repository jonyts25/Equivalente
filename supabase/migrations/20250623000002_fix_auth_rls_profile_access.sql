-- Fix: authenticated users could not read profiles because RLS policies call
-- get_user_role() which had EXECUTE revoked for role authenticated.
-- PostgreSQL may evaluate both sides of OR in policy expressions.

-- Allow authenticated role to call internal SECURITY DEFINER helpers used by RLS.
grant execute on function public.get_user_role(uuid) to authenticated;
grant execute on function public.patient_nutritionist_profile_id(uuid) to authenticated;

-- Profiles: split select into own-row (no helper) + admin (uses helper).
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select using (public.get_user_role(auth.uid()) = 'admin');

-- Profiles update: same split so users can update own row without helper call.
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_update_admin" on public.profiles
  for update using (public.get_user_role(auth.uid()) = 'admin');
