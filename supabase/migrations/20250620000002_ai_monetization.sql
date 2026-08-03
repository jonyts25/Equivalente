-- AI monetization: subscription plans, credits, task pricing (future — not active in manual mode)

-- Subscription plans
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  monthly_price_mxn numeric not null default 0,
  ai_enabled boolean not null default false,
  monthly_ai_credits int not null default 0,
  max_daily_ai_requests int not null default 0,
  max_weekly_menu_generations int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customer subscriptions
create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  nutritionist_id uuid references public.nutritionists(id) on delete set null,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task pricing (credits per task per provider)
create table if not exists public.ai_task_pricing (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  provider text not null check (provider in ('manual_chatgpt', 'ollama_local', 'openai_api')),
  credits_cost int not null default 0,
  estimated_max_input_tokens int,
  estimated_max_output_tokens int,
  estimated_max_cost_usd numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_type, provider)
);

-- Credit balances per period
create table if not exists public.ai_credit_balances (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  nutritionist_id uuid references public.nutritionists(id) on delete cascade,
  monthly_credits_granted int not null default 0,
  credits_used int not null default 0,
  credits_remaining int not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  updated_at timestamptz not null default now(),
  check (patient_id is not null or nutritionist_id is not null)
);

-- Credit transactions ledger
create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  nutritionist_id uuid references public.nutritionists(id) on delete set null,
  generated_menu_id uuid references public.generated_menus(id) on delete set null,
  ai_generation_log_id uuid references public.ai_generation_logs(id) on delete set null,
  task_type text not null,
  provider text not null check (provider in ('manual_chatgpt', 'ollama_local', 'openai_api')),
  credits_delta int not null,
  reason text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Triggers
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

create trigger customer_subscriptions_updated_at
  before update on public.customer_subscriptions
  for each row execute function public.set_updated_at();

create trigger ai_task_pricing_updated_at
  before update on public.ai_task_pricing
  for each row execute function public.set_updated_at();

create trigger ai_credit_balances_updated_at
  before update on public.ai_credit_balances
  for each row execute function public.set_updated_at();

-- RLS
alter table public.subscription_plans enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.ai_task_pricing enable row level security;
alter table public.ai_credit_balances enable row level security;
alter table public.ai_credit_transactions enable row level security;

create policy subscription_plans_admin on public.subscription_plans for all
  using (public.get_user_role(auth.uid()) = 'admin');
create policy subscription_plans_read on public.subscription_plans for select
  using (auth.uid() is not null and active = true);

create policy customer_subscriptions_access on public.customer_subscriptions for all
  using (
    public.get_user_role(auth.uid()) = 'admin'
    or exists (select 1 from public.patients p where p.id = customer_subscriptions.patient_id and p.profile_id = auth.uid())
    or exists (select 1 from public.nutritionists n where n.id = customer_subscriptions.nutritionist_id and n.profile_id = auth.uid())
  );

create policy ai_task_pricing_admin on public.ai_task_pricing for all
  using (public.get_user_role(auth.uid()) = 'admin');
create policy ai_task_pricing_read on public.ai_task_pricing for select
  using (auth.uid() is not null);

create policy ai_credit_balances_access on public.ai_credit_balances for all
  using (
    public.get_user_role(auth.uid()) = 'admin'
    or exists (select 1 from public.patients p where p.id = ai_credit_balances.patient_id and p.profile_id = auth.uid())
    or exists (select 1 from public.nutritionists n where n.id = ai_credit_balances.nutritionist_id and n.profile_id = auth.uid())
  );

create policy ai_credit_transactions_access on public.ai_credit_transactions for all
  using (
    public.get_user_role(auth.uid()) = 'admin'
    or exists (select 1 from public.patients p where p.id = ai_credit_transactions.patient_id and p.profile_id = auth.uid())
    or exists (select 1 from public.nutritionists n where n.id = ai_credit_transactions.nutritionist_id and n.profile_id = auth.uid())
  );

-- Demo subscription plans
insert into public.subscription_plans (name, description, monthly_price_mxn, ai_enabled, monthly_ai_credits, max_daily_ai_requests, max_weekly_menu_generations)
select v.name, v.description, v.price, v.ai, v.credits, v.daily, v.weekly
from (values
  ('Sin IA', 'Solo modo manual ChatGPT sin costo API', 0::numeric, false, 0, 0, 0),
  ('IA Básica', 'IA automática con límites moderados', 500::numeric, true, 300, 20, 2),
  ('IA Plus', 'IA automática con más créditos', 900::numeric, true, 800, 60, 8)
) as v(name, description, price, ai, credits, daily, weekly)
where not exists (select 1 from public.subscription_plans sp where sp.name = v.name);

-- Task pricing defaults
insert into public.ai_task_pricing (task_type, provider, credits_cost, estimated_max_output_tokens, estimated_max_cost_usd)
select v.task, v.provider, v.credits, v.tokens, v.cost
from (values
  ('craving_check', 'openai_api', 1, 700, 0.01::numeric),
  ('generate_meal_options', 'openai_api', 2, 1800, 0.03::numeric),
  ('ingredients_menu', 'openai_api', 2, 1800, 0.03::numeric),
  ('generate_day_menu', 'openai_api', 5, 3500, 0.06::numeric),
  ('shopping_list', 'openai_api', 5, 2000, 0.04::numeric),
  ('generate_week_menu', 'openai_api', 20, 8000, 0.15::numeric),
  ('parse_diet', 'openai_api', 25, 3500, 0.10::numeric),
  ('craving_check', 'ollama_local', 0, 700, 0::numeric),
  ('generate_meal_options', 'ollama_local', 0, 1800, 0::numeric),
  ('craving_check', 'manual_chatgpt', 0, null, null),
  ('generate_meal_options', 'manual_chatgpt', 0, null, null),
  ('generate_day_menu', 'manual_chatgpt', 0, null, null),
  ('generate_week_menu', 'manual_chatgpt', 0, null, null),
  ('parse_diet', 'manual_chatgpt', 0, null, null),
  ('shopping_list', 'manual_chatgpt', 0, null, null),
  ('ingredients_menu', 'manual_chatgpt', 0, null, null)
) as v(task, provider, credits, tokens, cost)
where not exists (
  select 1 from public.ai_task_pricing p
  where p.task_type = v.task and p.provider = v.provider
);
