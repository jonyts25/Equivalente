-- Diet templates library (reusable by nutritionist, not tied to a patient).

create table if not exists public.diet_templates (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists(id) on delete cascade,
  title text not null,
  raw_text text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_templates_nutritionist_id_idx
  on public.diet_templates (nutritionist_id);

drop trigger if exists diet_templates_updated_at on public.diet_templates;
create trigger diet_templates_updated_at
  before update on public.diet_templates
  for each row execute function public.set_updated_at();

alter table public.diet_templates enable row level security;

-- Admin: full access
create policy "diet_templates_admin_all" on public.diet_templates
  for all using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

-- Nutritionist: only own templates (nutritionist_id -> profile_id = auth.uid())
create policy "diet_templates_nutritionist_own" on public.diet_templates
  for all using (
    exists (
      select 1 from public.nutritionists n
      where n.id = diet_templates.nutritionist_id
        and n.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.nutritionists n
      where n.id = diet_templates.nutritionist_id
        and n.profile_id = auth.uid()
    )
  );
