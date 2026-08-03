-- Revoke public RPC access to internal SECURITY DEFINER helpers (Supabase advisor)

revoke execute on function public.get_user_role(uuid) from public, anon, authenticated;
revoke execute on function public.patient_nutritionist_profile_id(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;
