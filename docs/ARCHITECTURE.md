# Arquitectura — Equivalente

## Capas

```
┌─────────────────────────────────────────┐
│  PWA (Next.js App Router + Tailwind)    │
├─────────────────────────────────────────┤
│  Middleware (auth + role routing)       │
├─────────────────────────────────────────┤
│  Server Actions / RSC                   │
├─────────────────────────────────────────┤
│  Supabase (Auth, Postgres, RLS)         │
└─────────────────────────────────────────┘
```

## Roles

| Rol | Ruta base | Acceso |
|-----|-----------|--------|
| admin | `/admin` | Todo el sistema |
| nutritionist | `/nutriologo` | Pacientes asignados |
| patient | `/paciente` | Solo su información |

El rol se obtiene siempre del servidor (`profiles.role`), nunca del cliente.

## IA — proveedores intercambiables

Variable: `AI_PROVIDER=manual_chatgpt | ollama_local | openai_api`

```
src/lib/ai/
  config.ts              # lectura de env (servidor)
  provider-router.ts     # runAiTask() — punto de entrada servidor
  usage-guard.ts         # créditos y límites (futuro)
  providers/
    manual-chatgpt-provider.ts
    ollama-provider.ts
    openai-provider.ts
  prompts/               # builders de prompt
  schemas/               # validación Zod JSON
```

### manual_chatgpt (actual)

- `ManualAiFlow` usa `buildPrompt` de `@/lib/ai`
- Sesiones en `manual_ai_sessions`
- Logs en `ai_generation_logs`

### ollama_local (futuro)

- `ENABLE_OLLAMA=true` + `AI_PROVIDER=ollama_local`
- POST `{OLLAMA_BASE_URL}/api/chat` desde servidor únicamente

### openai_api (futuro)

- `ENABLE_OPENAI_API=true` + `AI_PROVIDER=openai_api`
- Pasa por `usage-guard` antes de llamar

`src/lib/manual-ai/` — adaptadores deprecados que re-exportan `@/lib/ai`.

Ver [AI_PROVIDERS.md](AI_PROVIDERS.md) y [AI_MONETIZATION_AND_LIMITS.md](AI_MONETIZATION_AND_LIMITS.md).

## Módulos clave

- `src/lib/nutrition/ambiguity-detector.ts` — detector local de ambigüedad
- `src/lib/data/patient-context.ts` — contexto para prompts
- `src/app/actions/` — server actions (diet, menus, auth, ai)

## Base de datos

Ver migraciones en `supabase/migrations/`. RLS habilitado en todas las tablas sensibles.

## PWA

- `public/manifest.json`
- Íconos SVG temporales en `public/icons/`
- Metadata en `src/app/layout.tsx`
