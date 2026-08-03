-- Extend progress tracking for Excel import, soft delete, adherence notes, audit log

-- patient_baseline_profiles
alter table public.patient_baseline_profiles
  add column if not exists visible_to_patient boolean not null default false,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- nutrition_checkins extensions
alter table public.nutrition_checkins
  add column if not exists checkin_time time,
  add column if not exists bmi numeric,
  add column if not exists weight_change_kg numeric,
  add column if not exists source_file_name text,
  add column if not exists source_row_number int,
  add column if not exists confidence text,
  add column if not exists visible_to_patient boolean not null default true,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.nutrition_checkins drop constraint if exists nutrition_checkins_source_check;
alter table public.nutrition_checkins
  add constraint nutrition_checkins_source_check
  check (source in ('manual', 'excel_import', 'photo_extract', 'imported'));

alter table public.nutrition_checkins drop constraint if exists nutrition_checkins_confidence_check;
alter table public.nutrition_checkins
  add constraint nutrition_checkins_confidence_check
  check (confidence is null or confidence in ('alta', 'media', 'baja', 'dudoso'));

-- body_composition_entries extensions
alter table public.body_composition_entries
  add column if not exists weight_change_kg numeric,
  add column if not exists body_fat_change_percent numeric,
  add column if not exists source_file_name text,
  add column if not exists source_row_number int,
  add column if not exists confidence text,
  add column if not exists visible_to_patient boolean not null default true,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.body_composition_entries drop constraint if exists body_composition_entries_source_check;
alter table public.body_composition_entries
  add constraint body_composition_entries_source_check
  check (source in ('manual', 'excel_import', 'photo_extract', 'imported'));

alter table public.body_composition_entries drop constraint if exists body_composition_entries_confidence_check;
alter table public.body_composition_entries
  add constraint body_composition_entries_confidence_check
  check (confidence is null or confidence in ('alta', 'media', 'baja', 'dudoso'));

-- Adherence notes
create table if not exists public.progress_adherence_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  note_date date not null,
  hunger_level int check (hunger_level is null or (hunger_level >= 1 and hunger_level <= 5)),
  cravings_level int check (cravings_level is null or (cravings_level >= 1 and cravings_level <= 5)),
  energy_level int check (energy_level is null or (energy_level >= 1 and energy_level <= 5)),
  sleep_quality int check (sleep_quality is null or (sleep_quality >= 1 and sleep_quality <= 5)),
  digestion text,
  exercise text,
  estimated_adherence_percent numeric,
  diet_change_notes text,
  patient_report text,
  nutritionist_note text,
  flags text[] not null default '{}',
  source text not null default 'manual'
    check (source in ('manual', 'excel_import', 'photo_extract', 'imported')),
  confidence text check (confidence is null or confidence in ('alta', 'media', 'baja', 'dudoso')),
  visible_to_patient boolean not null default false,
  is_deleted boolean not null default false,
  source_file_name text,
  source_row_number int,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists progress_adherence_notes_patient_date_idx
  on public.progress_adherence_notes (patient_id, note_date desc);

create trigger progress_adherence_notes_updated_at
  before update on public.progress_adherence_notes
  for each row execute function public.set_updated_at();

-- Audit log
create table if not exists public.progress_edit_audit_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'restore', 'import')),
  before_json jsonb,
  after_json jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists progress_edit_audit_log_patient_idx
  on public.progress_edit_audit_log (patient_id, changed_at desc);

-- RLS new tables
alter table public.progress_adherence_notes enable row level security;
alter table public.progress_edit_audit_log enable row level security;

drop policy if exists "adherence_admin_all" on public.progress_adherence_notes;
create policy "adherence_admin_all" on public.progress_adherence_notes for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

drop policy if exists "adherence_nutritionist" on public.progress_adherence_notes;
create policy "adherence_nutritionist" on public.progress_adherence_notes for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = progress_adherence_notes.patient_id and n.profile_id = auth.uid()
  )
);

drop policy if exists "adherence_patient_select" on public.progress_adherence_notes;
create policy "adherence_patient_select" on public.progress_adherence_notes for select using (
  visible_to_patient = true
  and is_deleted = false
  and exists (
    select 1 from public.patients p
    where p.id = progress_adherence_notes.patient_id and p.profile_id = auth.uid()
  )
);

drop policy if exists "audit_admin_all" on public.progress_edit_audit_log;
create policy "audit_admin_all" on public.progress_edit_audit_log for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

drop policy if exists "audit_nutritionist_select" on public.progress_edit_audit_log;
create policy "audit_nutritionist_select" on public.progress_edit_audit_log for select using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = progress_edit_audit_log.patient_id and n.profile_id = auth.uid()
  )
);

drop policy if exists "audit_nutritionist_insert" on public.progress_edit_audit_log;
create policy "audit_nutritionist_insert" on public.progress_edit_audit_log for insert with check (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = progress_edit_audit_log.patient_id and n.profile_id = auth.uid()
  )
  or public.get_user_role(auth.uid()) = 'admin'
);
