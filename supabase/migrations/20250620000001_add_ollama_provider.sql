-- Add ollama_local as valid AI provider + app_settings seed

-- ai_generation_logs.provider
alter table public.ai_generation_logs
  drop constraint if exists ai_generation_logs_provider_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_provider_check
  check (provider in ('manual_chatgpt', 'ollama_local', 'openai_api'));

-- app_settings: provider config
insert into public.app_settings (key, value) values
  (
    'ai_provider_config',
    '{"ai_provider": "manual_chatgpt", "ollama_enabled": false, "openai_enabled": false}'::jsonb
  )
on conflict (key) do update set
  value = public.app_settings.value || excluded.value,
  updated_at = now();
