-- Demo equivalence groups for paciente@equivalente.local
-- Run AFTER seed.sql and seed-demo.sql
-- NOT clinical prescription — demo data for IA contextual testing only.

-- Extra food items (idempotent)
insert into public.food_items (name, category, default_portion_label, default_grams, tags) values
  ('frijoles cocidos', 'carb', '1/2 taza', 90, array['carbohidrato','demo']),
  ('manzana', 'fruit', '1 pieza chica', 150, array['carbohidrato','fruta','demo']),
  ('plátano', 'fruit', '1/2 pieza', 60, array['carbohidrato','fruta','demo'])
on conflict ((lower(name))) do nothing;

-- Demo group: Carbohidratos
insert into public.equivalence_groups (patient_id, nutritionist_id, name, category, notes, active)
select p.id, p.nutritionist_id, 'Carbohidratos demo', 'carb',
  'Demo para pruebas. Validar con nutrióloga antes de uso clínico.', true
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
where not exists (
  select 1 from public.equivalence_groups eg
  where eg.patient_id = p.id and lower(eg.name) = lower('Carbohidratos demo')
);

insert into public.equivalence_items (equivalence_group_id, food_item_id, portion_label, grams, units, notes)
select eg.id, fi.id, v.portion, v.grams, v.units, 'Demo — pendiente validación nutrióloga'
from public.equivalence_groups eg
join public.patients p on p.id = eg.patient_id
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
cross join (values
  ('tortilla', '1 pieza', 25::numeric, 1::numeric),
  ('arroz', '1/2 taza cocido', 100::numeric, 1::numeric),
  ('pan integral', '1 rebanada', 30::numeric, 1::numeric),
  ('avena', '1/3 taza cruda', 40::numeric, 1::numeric),
  ('papa', '1/2 pieza mediana', 80::numeric, 1::numeric),
  ('frijoles cocidos', '1/2 taza', 90::numeric, 1::numeric),
  ('manzana', '1 pieza chica', 150::numeric, 1::numeric),
  ('plátano', '1/2 pieza', 60::numeric, 1::numeric)
) as v(food_name, portion, grams, units)
join public.food_items fi on lower(fi.name) = lower(v.food_name)
where lower(eg.name) = lower('Carbohidratos demo')
  and not exists (
    select 1 from public.equivalence_items ei
    where ei.equivalence_group_id = eg.id and ei.food_item_id = fi.id
  );

-- Demo group: Proteínas
insert into public.equivalence_groups (patient_id, nutritionist_id, name, category, notes, active)
select p.id, p.nutritionist_id, 'Proteínas demo', 'protein',
  'Demo para pruebas. Validar con nutrióloga antes de uso clínico.', true
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
where not exists (
  select 1 from public.equivalence_groups eg
  where eg.patient_id = p.id and lower(eg.name) = lower('Proteínas demo')
);

insert into public.equivalence_items (equivalence_group_id, food_item_id, portion_label, grams, units, notes)
select eg.id, fi.id, v.portion, v.grams, v.units, 'Demo — pendiente validación nutrióloga'
from public.equivalence_groups eg
join public.patients p on p.id = eg.patient_id
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
cross join (values
  ('pollo', '120 g cocido', 120::numeric, 1::numeric),
  ('huevo', '2 piezas', 100::numeric, 2::numeric),
  ('atún', '1 lata drenada', 120::numeric, 1::numeric),
  ('yogurt griego', '1 porción', 150::numeric, 1::numeric)
) as v(food_name, portion, grams, units)
join public.food_items fi on lower(fi.name) = lower(v.food_name)
where lower(eg.name) = lower('Proteínas demo')
  and not exists (
    select 1 from public.equivalence_items ei
    where ei.equivalence_group_id = eg.id and ei.food_item_id = fi.id
  );

-- Demo group: Grasas
insert into public.equivalence_groups (patient_id, nutritionist_id, name, category, notes, active)
select p.id, p.nutritionist_id, 'Grasas demo', 'fat',
  'Demo para pruebas. Validar con nutrióloga antes de uso clínico.', true
from public.patients p
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
where not exists (
  select 1 from public.equivalence_groups eg
  where eg.patient_id = p.id and lower(eg.name) = lower('Grasas demo')
);

insert into public.equivalence_items (equivalence_group_id, food_item_id, portion_label, grams, units, notes)
select eg.id, fi.id, v.portion, v.grams, v.units, 'Demo — pendiente validación nutrióloga'
from public.equivalence_groups eg
join public.patients p on p.id = eg.patient_id
join auth.users u on u.id = p.profile_id and u.email = 'paciente@equivalente.local'
cross join (values
  ('aguacate', '1/4 pieza', 40::numeric, 1::numeric),
  ('aceite de oliva', '1 cucharadita', 5::numeric, 1::numeric)
) as v(food_name, portion, grams, units)
join public.food_items fi on lower(fi.name) = lower(v.food_name)
where lower(eg.name) = lower('Grasas demo')
  and not exists (
    select 1 from public.equivalence_items ei
    where ei.equivalence_group_id = eg.id and ei.food_item_id = fi.id
  );
