-- QA fixes: idempotent policies, food_items unique, secure signup role, demo diet helper

-- Prevent duplicate food catalog entries on re-seed
create unique index if not exists food_items_name_unique on public.food_items (lower(name));

-- Signup always creates patient role; admin/nutritionist assigned by admin only
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'patient'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Fix equivalence_items when group has no patient_id (nutritionist-global groups)
drop policy if exists equivalence_items_access on public.equivalence_items;
create policy equivalence_items_access on public.equivalence_items for all using (
  public.get_user_role(auth.uid()) = 'admin'
  or exists (
    select 1 from public.equivalence_groups eg
    join public.patients p on p.id = eg.patient_id
    join public.nutritionists n on n.id = p.nutritionist_id
    where eg.id = equivalence_items.equivalence_group_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
  or exists (
    select 1 from public.equivalence_groups eg
    join public.nutritionists n on n.id = eg.nutritionist_id
    where eg.id = equivalence_items.equivalence_group_id
      and eg.patient_id is null
      and n.profile_id = auth.uid()
  )
);

-- Nutritionist can insert own record (for bootstrap after admin creates auth user)
drop policy if exists nutritionists_insert_own on public.nutritionists;
create policy nutritionists_insert_own on public.nutritionists for insert with check (
  public.get_user_role(auth.uid()) = 'admin'
  or profile_id = auth.uid()
);

-- Harden security definer helpers
create or replace function public.get_user_role(user_id uuid)
returns text as $$
  select role from public.profiles where id = user_id;
$$ language sql stable security definer set search_path = public;

create or replace function public.patient_nutritionist_profile_id(patient_uuid uuid)
returns uuid as $$
  select n.profile_id
  from public.patients p
  join public.nutritionists n on n.id = p.nutritionist_id
  where p.id = patient_uuid;
$$ language sql stable security definer set search_path = public;
