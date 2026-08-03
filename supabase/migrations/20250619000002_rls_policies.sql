-- RLS policies for Equivalente

alter table public.profiles enable row level security;
alter table public.nutritionists enable row level security;
alter table public.patients enable row level security;
alter table public.diet_plans enable row level security;
alter table public.meal_slots enable row level security;
alter table public.meal_requirements enable row level security;
alter table public.food_items enable row level security;
alter table public.equivalence_groups enable row level security;
alter table public.equivalence_items enable row level security;
alter table public.patient_food_preferences enable row level security;
alter table public.forbidden_treats enable row level security;
alter table public.generated_menus enable row level security;
alter table public.manual_ai_sessions enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.patient_feedback enable row level security;
alter table public.app_settings enable row level security;
alter table public.patient_ai_limits enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles for select using (
  auth.uid() = id or public.get_user_role(auth.uid()) = 'admin'
);
create policy "profiles_update_own_or_admin" on public.profiles for update using (
  auth.uid() = id or public.get_user_role(auth.uid()) = 'admin'
);

-- Nutritionists
create policy "nutritionists_admin_all" on public.nutritionists for all using (
  public.get_user_role(auth.uid()) = 'admin'
);
create policy "nutritionists_select_own" on public.nutritionists for select using (
  profile_id = auth.uid()
);

-- Patients
create policy "patients_admin_all" on public.patients for all using (
  public.get_user_role(auth.uid()) = 'admin'
);
create policy "patients_select_nutritionist" on public.patients for select using (
  exists (
    select 1 from public.nutritionists n
    where n.id = patients.nutritionist_id and n.profile_id = auth.uid()
  )
);
create policy "patients_select_self" on public.patients for select using (
  profile_id = auth.uid()
);
create policy "patients_insert_nutritionist" on public.patients for insert with check (
  public.get_user_role(auth.uid()) in ('admin', 'nutritionist')
);
create policy "patients_update_nutritionist" on public.patients for update using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.nutritionists n
    where n.id = patients.nutritionist_id and n.profile_id = auth.uid()
  )
);

-- Food items (global catalog — readable by all authenticated, writable by admin)
create policy "food_items_select_authenticated" on public.food_items for select using (auth.uid() is not null);
create policy "food_items_admin_write" on public.food_items for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

-- Diet plans
create policy "diet_plans_admin" on public.diet_plans for all using (
  public.get_user_role(auth.uid()) = 'admin'
);
create policy "diet_plans_nutritionist" on public.diet_plans for all using (
  exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = diet_plans.patient_id and n.profile_id = auth.uid()
  )
);
create policy "diet_plans_patient_read" on public.diet_plans for select using (
  exists (select 1 from public.patients p where p.id = diet_plans.patient_id and p.profile_id = auth.uid())
);

-- Meal slots & requirements (inherit via diet plan access)
create policy "meal_slots_access" on public.meal_slots for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.diet_plans dp
    join public.patients p on p.id = dp.patient_id
    left join public.nutritionists n on n.id = p.nutritionist_id
    where dp.id = meal_slots.diet_plan_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

create policy "meal_requirements_access" on public.meal_requirements for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.meal_slots ms
    join public.diet_plans dp on dp.id = ms.diet_plan_id
    join public.patients p on p.id = dp.patient_id
    left join public.nutritionists n on n.id = p.nutritionist_id
    where ms.id = meal_requirements.meal_slot_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

-- Equivalence groups & items
create policy "equivalence_groups_access" on public.equivalence_groups for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where (equivalence_groups.patient_id = p.id and (p.profile_id = auth.uid() or n.profile_id = auth.uid()))
       or (equivalence_groups.nutritionist_id = n.id and n.profile_id = auth.uid())
  )
);

create policy "equivalence_items_access" on public.equivalence_items for all using (
  public.get_user_role(auth.uid()) = 'admin'
  or exists (
    select 1 from public.equivalence_groups eg
    join public.patients p on p.id = eg.patient_id
    join public.nutritionists n on n.id = p.nutritionist_id
    where eg.id = equivalence_items.equivalence_group_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
  or exists (
    select 1 from public.equivalence_groups eg
    join public.nutritionists n on n.id = eg.nutritionist_id
    where eg.id = equivalence_items.equivalence_group_id
      and eg.patient_id is null
      and n.profile_id = auth.uid()
  )
);

-- Preferences & forbidden treats
create policy "patient_food_preferences_access" on public.patient_food_preferences for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = patient_food_preferences.patient_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

create policy "forbidden_treats_access" on public.forbidden_treats for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = forbidden_treats.patient_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

-- Generated menus
create policy "generated_menus_access" on public.generated_menus for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = generated_menus.patient_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

-- Manual AI sessions
create policy "manual_ai_sessions_access" on public.manual_ai_sessions for all using (
  user_id = auth.uid()
  or public.get_user_role(auth.uid()) = 'admin'
  or exists (
    select 1 from public.patients p
    where p.id = manual_ai_sessions.patient_id
      and public.patient_nutritionist_profile_id(p.id) = auth.uid()
  )
);

-- AI logs
create policy "ai_logs_admin" on public.ai_generation_logs for all using (
  public.get_user_role(auth.uid()) = 'admin'
);
create policy "ai_logs_nutritionist" on public.ai_generation_logs for select using (
  exists (
    select 1 from public.patients p
    where p.id = ai_generation_logs.patient_id
      and public.patient_nutritionist_profile_id(p.id) = auth.uid()
  )
);
create policy "ai_logs_insert_own" on public.ai_generation_logs for insert with check (
  user_id = auth.uid()
);

-- Patient feedback
create policy "patient_feedback_access" on public.patient_feedback for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = patient_feedback.patient_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);

-- App settings (admin only)
create policy "app_settings_admin" on public.app_settings for all using (
  public.get_user_role(auth.uid()) = 'admin'
);

-- Patient AI limits
create policy "patient_ai_limits_access" on public.patient_ai_limits for all using (
  public.get_user_role(auth.uid()) = 'admin' or exists (
    select 1 from public.patients p
    join public.nutritionists n on n.id = p.nutritionist_id
    where p.id = patient_ai_limits.patient_id
      and (p.profile_id = auth.uid() or n.profile_id = auth.uid())
  )
);
