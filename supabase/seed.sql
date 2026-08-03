-- Seed data for Equivalente demo
-- NOTA: Los usuarios auth deben crearse en Supabase Auth con estos emails.
-- Después de crear usuarios, actualiza profiles.role y vincula nutritionists/patients.

-- App settings
insert into public.app_settings (key, value) values
  ('ai_mode', '{"mode": "manual_chatgpt"}'::jsonb),
  ('disclaimer', '{"text": "Equivalente no reemplaza atención nutricional profesional."}'::jsonb)
on conflict (key) do nothing;

-- Food items base
insert into public.food_items (name, category, default_portion_label, tags) values
  ('huevo', 'protein', '1 pieza', array['proteina']),
  ('pollo', 'protein', '100 g', array['proteina']),
  ('atún', 'protein', '1/2 lata', array['proteina']),
  ('pescado', 'protein', '100 g', array['proteina']),
  ('carne magra', 'protein', '100 g', array['proteina']),
  ('yogurt griego', 'dairy', '1/2 taza', array['proteina','lacteo']),
  ('queso panela', 'dairy', '40 g', array['proteina','lacteo']),
  ('tortilla', 'carb', '1 pieza', array['carbohidrato']),
  ('tostada horneada', 'carb', '2 piezas', array['carbohidrato']),
  ('arroz', 'carb', '1/2 taza cocido', array['carbohidrato']),
  ('avena', 'carb', '1/2 taza', array['carbohidrato']),
  ('papa', 'carb', '1/2 pieza mediana', array['carbohidrato']),
  ('camote', 'carb', '1/2 pieza mediana', array['carbohidrato']),
  ('pan integral', 'carb', '1 rebanada', array['carbohidrato']),
  ('fruta', 'fruit', '1 pieza mediana', array['carbohidrato','fruta']),
  ('aguacate', 'fat', '1/4 pieza', array['grasa']),
  ('aceite de oliva', 'fat', '1 cdta', array['grasa']),
  ('nueces', 'fat', '6 piezas', array['grasa']),
  ('almendras', 'fat', '10 piezas', array['grasa']),
  ('crema de cacahuate', 'fat', '1 cdta', array['grasa','detonante']),
  ('nopales', 'vegetable', '1/2 taza', array['verdura']),
  ('lechuga', 'vegetable', '1 taza', array['verdura']),
  ('pepino', 'vegetable', '1/2 taza', array['verdura']),
  ('jitomate', 'vegetable', '1/2 taza', array['verdura']),
  ('espinaca', 'vegetable', '1 taza', array['verdura']),
  ('calabacita', 'vegetable', '1/2 taza', array['verdura']),
  ('champiñones', 'vegetable', '1/2 taza', array['verdura']),
  ('brócoli', 'vegetable', '1/2 taza', array['verdura'])
on conflict ((lower(name))) do nothing;

-- Demo setup instructions (run after creating auth users):
--
-- 1. Admin: admin@equivalente.local / password in Supabase Auth
--    UPDATE profiles SET role = 'admin', full_name = 'Admin Demo' WHERE id = '<admin_uuid>';
--
-- 2. Nutriólogo: nutriologo@equivalente.local
--    UPDATE profiles SET role = 'nutritionist', full_name = 'Dra. Demo' WHERE id = '<nutri_uuid>';
--    INSERT INTO nutritionists (profile_id, display_name) VALUES ('<nutri_uuid>', 'Dra. Demo Nutrición');
--
-- 3. Paciente: paciente@equivalente.local
--    UPDATE profiles SET role = 'patient', full_name = 'Paciente Demo' WHERE id = '<patient_uuid>';
--    INSERT INTO patients (profile_id, nutritionist_id, full_name, goal, precision_mode)
--    VALUES ('<patient_uuid>', '<nutritionist_id>', 'Paciente Demo', 'Control de peso', 'strict');
--
-- 4. Forbidden treats for demo patient:
--    INSERT INTO forbidden_treats (patient_id, name, mode, trigger_risk) VALUES
--      ('<patient_id>', 'Mazapán de chocolate', 'exact_portion_required', 5),
--      ('<patient_id>', 'Crema de cacahuate', 'adapted_only', 4),
--      ('<patient_id>', 'Pan dulce', 'never_suggest', 5);
--
-- 5. Sample diet plan with meal slots (see README for full SQL)
