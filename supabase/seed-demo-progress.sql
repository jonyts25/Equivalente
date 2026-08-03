-- Demo progress data for paciente@equivalente.local
-- Fictional demo values — NOT from scanned paper (handwriting too ambiguous).
-- Run AFTER seed-demo.sql

insert into public.patient_baseline_profiles (
  patient_id, height_cm, initial_weight_kg, ideal_weight_kg,
  body_distribution, source_notes, created_by
)
select p.id, 182, 92.5, 85, 'unknown',
  'Datos demo reconstruidos parcialmente. Validar contra expediente original.',
  n.profile_id
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
join public.nutritionists n on n.id = p.nutritionist_id
where not exists (
  select 1 from public.patient_baseline_profiles b where b.patient_id = p.id
);

-- Demo check-ins (6 entries, progressive trend)
insert into public.nutrition_checkins (
  patient_id, checkin_date, weight_kg, chest_cm, waist_cm, abdomen_cm, hip_cm,
  diet_label, notes, source, created_by
)
select p.id, v.d::date, v.w, v.ch, v.wa, v.ab, v.hi, v.diet,
  'Demo — validar con expediente', 'manual', n.profile_id
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
join public.nutritionists n on n.id = p.nutritionist_id
cross join (values
  ('2025-01-15'::text, 92.5::numeric, 110::numeric, 98::numeric, 96::numeric, 105::numeric, 'Plan inicial'),
  ('2025-02-12', 91.8, 109, 97, 95, 104, 'Plan activo'),
  ('2025-03-10', 90.6, 108, 95, 93, 103, 'Plan activo'),
  ('2025-04-08', 89.9, 107, 94, 92, 102, 'Plan activo'),
  ('2025-05-06', 89.2, 106, 93, 91, 101, 'Plan activo'),
  ('2025-06-03', 88.5, 105, 92, 90, 100, 'Plan activo')
) as v(d, w, ch, wa, ab, hi, diet)
where not exists (
  select 1 from public.nutrition_checkins c
  where c.patient_id = p.id and c.checkin_date = v.d::date
);

-- Demo body composition (4 entries)
insert into public.body_composition_entries (
  patient_id, measured_at, weight_kg, body_fat_percent, muscle_mass_kg,
  water_percent, visceral_fat, metabolic_age, notes, source, created_by
)
select p.id, v.d::date, v.w, v.bf, v.mm, v.wa, v.vf, v.ma,
  'Demo — validar con báscula original', 'manual', n.profile_id
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
join public.nutritionists n on n.id = p.nutritionist_id
cross join (values
  ('2025-02-12'::text, 91.8::numeric, 28.5::numeric, 38.2::numeric, 52::numeric, 12::numeric, 38::numeric),
  ('2025-03-10', 90.6, 27.8, 38.8, 53, 11, 37),
  ('2025-04-08', 89.9, 27.2, 39.1, 53.5, 11, 36),
  ('2025-06-03', 88.5, 26.5, 39.8, 54, 10, 35)
) as v(d, w, bf, mm, wa, vf, ma)
where not exists (
  select 1 from public.body_composition_entries e
  where e.patient_id = p.id and e.measured_at = v.d::date
);
