-- Demo seed for Equivalente (run AFTER creating Auth users)
-- Requires emails:
--   admin@equivalente.local
--   nutriologo@equivalente.local
--   paciente@equivalente.local

-- 1) Roles
update public.profiles
set role = 'admin', full_name = 'Admin Demo'
where id = (select id from auth.users where email = 'admin@equivalente.local');

update public.profiles
set role = 'nutritionist', full_name = 'Dra. Demo'
where id = (select id from auth.users where email = 'nutriologo@equivalente.local');

update public.profiles
set role = 'patient', full_name = 'Paciente Demo'
where id = (select id from auth.users where email = 'paciente@equivalente.local');

-- 2) Nutritionist row
insert into public.nutritionists (profile_id, display_name, active)
select p.id, 'Dra. Demo Nutrición', true
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'nutriologo@equivalente.local'
  and not exists (select 1 from public.nutritionists n where n.profile_id = p.id);

-- 3) Patient row
insert into public.patients (profile_id, nutritionist_id, full_name, goal, precision_mode, active)
select
  pat_profile.id,
  n.id,
  'Paciente Demo',
  'Control de peso',
  'strict',
  true
from public.profiles pat_profile
join auth.users u on u.id = pat_profile.id
cross join public.nutritionists n
join public.profiles nut_profile on nut_profile.id = n.profile_id
join auth.users nu on nu.id = nut_profile.id and nu.email = 'nutriologo@equivalente.local'
where u.email = 'paciente@equivalente.local'
  and not exists (
    select 1 from public.patients p where p.profile_id = pat_profile.id
  );

-- 4) Forbidden treats (demo)
insert into public.forbidden_treats (patient_id, name, mode, trigger_risk, ambiguity_required)
select p.id, v.name, v.mode, v.risk, true
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
cross join (values
  ('Mazapán de chocolate', 'exact_portion_required', 5),
  ('Crema de cacahuate', 'adapted_only', 4),
  ('Pan dulce', 'never_suggest', 5)
) as v(name, mode, risk)
where not exists (
  select 1 from public.forbidden_treats ft
  where ft.patient_id = p.id and lower(ft.name) = lower(v.name)
);

-- 5) Sample active diet
insert into public.diet_plans (patient_id, title, raw_text, status, created_by)
select
  p.id,
  'Dieta demo — control de peso',
  E'Desayuno: 1 proteína + 1 carb + verdura\nColación AM: fruta\nComida: 2 proteína + 1 carb + 2 verdura + 1 grasa\nColación PM: yogurt\nCena: 1 proteína + 1 carb + 2 verdura',
  'active',
  nut_profile.id
from public.patients p
join auth.users pu on pu.id = p.profile_id and pu.email = 'paciente@equivalente.local'
join public.nutritionists n on n.id = p.nutritionist_id
join public.profiles nut_profile on nut_profile.id = n.profile_id
where not exists (
  select 1 from public.diet_plans dp
  where dp.patient_id = p.id and dp.status = 'active'
);

-- 6) Meal slots for active diet
insert into public.meal_slots (diet_plan_id, name, slot_order, notes)
select dp.id, v.name, v.ord, v.notes
from public.diet_plans dp
join public.patients p on p.id = dp.patient_id
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
cross join (values
  ('Desayuno', 1, '1 proteína + 1 carb + verdura'),
  ('Colación AM', 2, 'Fruta'),
  ('Comida', 3, '2 proteína + 1 carb + 2 verdura + 1 grasa'),
  ('Colación PM', 4, 'Yogurt'),
  ('Cena', 5, '1 proteína + 1 carb + 2 verdura')
) as v(name, ord, notes)
where dp.status = 'active'
  and not exists (
    select 1 from public.meal_slots ms where ms.diet_plan_id = dp.id
  );
