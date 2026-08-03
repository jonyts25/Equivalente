-- Equivalente: schema inicial
-- Ejecutar en Supabase SQL Editor o via supabase db push

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'nutritionist', 'patient')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nutritionists
create table if not exists public.nutritionists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Patients
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  nutritionist_id uuid not null references public.nutritionists(id) on delete cascade,
  full_name text not null,
  goal text,
  notes text,
  precision_mode text not null default 'normal' check (precision_mode in ('relaxed', 'normal', 'strict')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Diet plans
create table if not exists public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  raw_text text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meal slots
create table if not exists public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans(id) on delete cascade,
  name text not null,
  slot_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meal requirements
create table if not exists public.meal_requirements (
  id uuid primary key default gen_random_uuid(),
  meal_slot_id uuid not null references public.meal_slots(id) on delete cascade,
  protein_units numeric,
  carb_units numeric,
  fat_units numeric,
  vegetable_rule text,
  calories_target numeric,
  protein_target numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Food items
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('protein','carb','fat','vegetable','fruit','dairy','condiment','processed','drink','other')),
  default_portion_label text,
  default_grams numeric,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equivalence groups
create table if not exists public.equivalence_groups (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid references public.nutritionists(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  name text not null,
  category text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equivalence items
create table if not exists public.equivalence_items (
  id uuid primary key default gen_random_uuid(),
  equivalence_group_id uuid not null references public.equivalence_groups(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  portion_label text not null,
  grams numeric,
  units numeric not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Patient food preferences
create table if not exists public.patient_food_preferences (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  custom_food_name text,
  preference text not null check (preference in ('love','ok','neutral','dislike','rejected','clinical_ban','trigger','forbidden_treat','controlled')),
  strictness text check (strictness in ('never','adapted_only','nutritionist_approval','exact_portion_only','allowed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Forbidden treats
create table if not exists public.forbidden_treats (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  reason text,
  mode text not null check (mode in ('never_suggest','adapted_only','approval_required','exact_portion_required','sensory_alternative')),
  ambiguity_required boolean not null default true,
  trigger_risk int check (trigger_risk between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generated menus
create table if not exists public.generated_menus (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  diet_plan_id uuid references public.diet_plans(id) on delete set null,
  meal_slot_id uuid references public.meal_slots(id) on delete set null,
  generation_type text not null check (generation_type in ('meal_options','day_menu','week_menu','craving','ingredients','shopping_list','parse_diet')),
  title text not null,
  content_json jsonb not null default '{}',
  explanation text,
  status text not null default 'draft' check (status in ('draft','pending_review','approved','rejected','favorite','patient_rejected','requires_clarification','blocked')),
  created_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Manual AI sessions
create table if not exists public.manual_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_type text not null,
  prompt_text text not null,
  pasted_response text,
  parsed_json jsonb,
  validation_status text not null default 'draft' check (validation_status in ('draft','copied','pasted','valid','invalid','saved')),
  validation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI generation logs (future)
create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_type text not null,
  provider text not null check (provider in ('manual_chatgpt','openai_api')),
  model text,
  prompt_version text not null default '1.0.0',
  input_json jsonb not null default '{}',
  output_json jsonb,
  status text not null,
  error text,
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric,
  created_at timestamptz not null default now()
);

-- Patient feedback
create table if not exists public.patient_feedback (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  generated_menu_id uuid references public.generated_menus(id) on delete set null,
  feedback_type text not null check (feedback_type in ('liked','disliked','missing_ingredient','too_expensive','too_slow','not_filling','triggered_craving','other')),
  comment text,
  created_at timestamptz not null default now()
);

-- App settings
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Patient AI limits (future)
create table if not exists public.patient_ai_limits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade unique,
  monthly_credits int not null default 100,
  used_credits int not null default 0,
  max_daily_generations int not null default 10,
  max_weekly_menus int not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger nutritionists_updated_at before update on public.nutritionists for each row execute function public.set_updated_at();
create trigger patients_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger diet_plans_updated_at before update on public.diet_plans for each row execute function public.set_updated_at();
create trigger meal_slots_updated_at before update on public.meal_slots for each row execute function public.set_updated_at();
create trigger meal_requirements_updated_at before update on public.meal_requirements for each row execute function public.set_updated_at();
create trigger food_items_updated_at before update on public.food_items for each row execute function public.set_updated_at();
create trigger equivalence_groups_updated_at before update on public.equivalence_groups for each row execute function public.set_updated_at();
create trigger equivalence_items_updated_at before update on public.equivalence_items for each row execute function public.set_updated_at();
create trigger patient_food_preferences_updated_at before update on public.patient_food_preferences for each row execute function public.set_updated_at();
create trigger forbidden_treats_updated_at before update on public.forbidden_treats for each row execute function public.set_updated_at();
create trigger generated_menus_updated_at before update on public.generated_menus for each row execute function public.set_updated_at();
create trigger manual_ai_sessions_updated_at before update on public.manual_ai_sessions for each row execute function public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
create trigger patient_ai_limits_updated_at before update on public.patient_ai_limits for each row execute function public.set_updated_at();

-- Auto-create profile on signup
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: get user role
create or replace function public.get_user_role(user_id uuid)
returns text as $$
  select role from public.profiles where id = user_id;
$$ language sql stable security definer set search_path = public;

-- Helper: nutritionist profile for patient
create or replace function public.patient_nutritionist_profile_id(patient_uuid uuid)
returns uuid as $$
  select n.profile_id
  from public.patients p
  join public.nutritionists n on n.id = p.nutritionist_id
  where p.id = patient_uuid;
$$ language sql stable security definer set search_path = public;

-- Unique food names for idempotent seed
create unique index if not exists food_items_name_unique on public.food_items (lower(name));
