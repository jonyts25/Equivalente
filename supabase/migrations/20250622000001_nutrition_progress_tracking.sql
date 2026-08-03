-- Nutrition progress tracking (anthropometric + body composition + IA analysis)

-- Baseline profile (one per patient)
create table if not exists public.patient_baseline_profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade unique,
  height_cm numeric,
  initial_weight_kg numeric,
  ideal_weight_kg numeric,
  max_weight_kg_min numeric,
  max_weight_kg_max numeric,
  body_distribution text not null default 'unknown'
    check (body_distribution in ('android', 'gynoid', 'mixed', 'unknown')),
  medical_notes text,
  medications_notes text,
  allergies_notes text,
  antecedents_notes text,
  source_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Source photos (paper forms — extraction future)
create table if not exists public.progress_source_photos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  storage_path text,
  photo_type text not null default 'other'
    check (photo_type in ('anthropometric_sheet', 'body_composition_sheet', 'other')),
  taken_at date,
  uploaded_by uuid references public.profiles(id) on delete set null,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracted', 'reviewed', 'failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anthropometric check-ins
create table if not exists public.nutrition_checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  checkin_date date not null,
  blood_pressure_text text,
  diet_label text,
  weight_kg numeric,
  chest_cm numeric,
  waist_cm numeric,
  abdomen_cm numeric,
  hip_cm numeric,
  neck_cm numeric,
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'photo_extract', 'imported')),
  source_photo_id uuid references public.progress_source_photos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Body composition entries
create table if not exists public.body_composition_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  measured_at date not null,
  weight_kg numeric,
  body_fat_percent numeric,
  bone_mass_kg numeric,
  water_percent numeric,
  muscle_mass_kg numeric,
  physique_rating numeric,
  kcal numeric,
  metabolic_age numeric,
  visceral_fat numeric,
  body_fat_mass_kg numeric,
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'photo_extract', 'imported')),
  source_photo_id uuid references public.progress_source_photos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IA progress analyses (review before patient visibility)
create table if not exists public.progress_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  analysis_date timestamptz not null default now(),
  range_start date,
  range_end date,
  provider text not null default 'ollama_local'
    check (provider in ('manual_chatgpt', 'ollama_local', 'openai_api')),
  model text,
  summary text not null,
  trend_json jsonb not null default '{}'::jsonb,
  flags text[] not null default '{}',
  requires_nutritionist_review boolean not null default true,
  nutritionist_notes text,
  visible_to_patient boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_checkins_patient_date_idx
  on public.nutrition_checkins (patient_id, checkin_date desc);

create index if not exists body_composition_entries_patient_date_idx
  on public.body_composition_entries (patient_id, measured_at desc);

create index if not exists progress_ai_analyses_patient_date_idx
  on public.progress_ai_analyses (patient_id, analysis_date desc);

create index if not exists progress_source_photos_patient_created_idx
  on public.progress_source_photos (patient_id, created_at desc);

create trigger patient_baseline_profiles_updated_at
  before update on public.patient_baseline_profiles
  for each row execute function public.set_updated_at();

create trigger progress_source_photos_updated_at
  before update on public.progress_source_photos
  for each row execute function public.set_updated_at();

create trigger nutrition_checkins_updated_at
  before update on public.nutrition_checkins
  for each row execute function public.set_updated_at();

create trigger body_composition_entries_updated_at
  before update on public.body_composition_entries
  for each row execute function public.set_updated_at();

create trigger progress_ai_analyses_updated_at
  before update on public.progress_ai_analyses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.patient_baseline_profiles enable row level security;
alter table public.progress_source_photos enable row level security;
alter table public.nutrition_checkins enable row level security;
alter table public.body_composition_entries enable row level security;
alter table public.progress_ai_analyses enable row level security;

-- Helper: patient owns record
-- Admin full access on all progress tables
create policy "baseline_admin_all" on public.patient_baseline_profiles for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "photos_admin_all" on public.progress_source_photos for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "checkins_admin_all" on public.nutrition_checkins for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "composition_admin_all" on public.body_composition_entries for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "analyses_admin_all" on public.progress_ai_analyses for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

-- Nutritionist: assigned patients (read + write)
create policy "baseline_nutritionist" on public.patient_baseline_profiles for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = patient_baseline_profiles.patient_id and n.profile_id = auth.uid()
  )
);

create policy "photos_nutritionist" on public.progress_source_photos for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = progress_source_photos.patient_id and n.profile_id = auth.uid()
  )
);

create policy "checkins_nutritionist" on public.nutrition_checkins for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = nutrition_checkins.patient_id and n.profile_id = auth.uid()
  )
);

create policy "composition_nutritionist" on public.body_composition_entries for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = body_composition_entries.patient_id and n.profile_id = auth.uid()
  )
);

create policy "analyses_nutritionist" on public.progress_ai_analyses for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = progress_ai_analyses.patient_id and n.profile_id = auth.uid()
  )
);

-- Patient: read own baseline, checkins, composition
create policy "baseline_patient_select" on public.patient_baseline_profiles for select using (
  exists (
    select 1 from public.patients p
    where p.id = patient_baseline_profiles.patient_id and p.profile_id = auth.uid()
  )
);

create policy "checkins_patient_select" on public.nutrition_checkins for select using (
  exists (
    select 1 from public.patients p
    where p.id = nutrition_checkins.patient_id and p.profile_id = auth.uid()
  )
);

create policy "composition_patient_select" on public.body_composition_entries for select using (
  exists (
    select 1 from public.patients p
    where p.id = body_composition_entries.patient_id and p.profile_id = auth.uid()
  )
);

-- Patient: analyses only when visible_to_patient
create policy "analyses_patient_select" on public.progress_ai_analyses for select using (
  visible_to_patient = true
  and exists (
    select 1 from public.patients p
    where p.id = progress_ai_analyses.patient_id and p.profile_id = auth.uid()
  )
);

-- Patients cannot read source photos (clinical/internal)
-- No patient insert/update policies on clinical tables
