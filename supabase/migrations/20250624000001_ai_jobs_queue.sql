-- Align ai_jobs for Equivalente ollama_queue (table may already exist from worker)

alter table public.ai_jobs
  alter column app set default 'equivalente',
  alter column status set default 'pending',
  alter column payload set default '{}'::jsonb;

-- Optional columns used by Equivalente app / polling
alter table public.ai_jobs
  add column if not exists error text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Compatibility: expose `result` as alias of `resultado` is not possible as column;
-- app reads `resultado`. Keep `resultado` as source of truth.

create index if not exists ai_jobs_status_created_idx
  on public.ai_jobs (status, created_at asc);

create index if not exists ai_jobs_created_by_idx
  on public.ai_jobs (created_by, created_at desc);

drop trigger if exists ai_jobs_updated_at on public.ai_jobs;
create trigger ai_jobs_updated_at
  before update on public.ai_jobs
  for each row execute function public.set_updated_at();

alter table public.ai_jobs enable row level security;

drop policy if exists "ai_jobs_admin_all" on public.ai_jobs;
create policy "ai_jobs_admin_all" on public.ai_jobs for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

drop policy if exists "ai_jobs_insert_authenticated" on public.ai_jobs;
create policy "ai_jobs_insert_authenticated" on public.ai_jobs for insert with check (
  auth.uid() is not null
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "ai_jobs_select_own_or_staff" on public.ai_jobs;
create policy "ai_jobs_select_own_or_staff" on public.ai_jobs for select using (
  created_by = auth.uid()
  or (payload->>'userId') = auth.uid()::text
  or public.get_user_role(auth.uid()) in ('admin', 'nutritionist')
);
