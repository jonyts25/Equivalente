# Equivalente

PWA privada para convertir una dieta prescrita por nutrióloga en opciones de menús equivalentes, personalizadas, auditables y prácticas.

**Tagline:** Más opciones sin salirte del plan.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- shadcn/ui-style components
- Supabase Auth + Postgres + RLS
- PWA instalable
- Modo IA manual con ChatGPT (sin API en producción inicial)

## Requisitos

- Node.js 20+
- Cuenta Supabase
- npm

## Instalación

```bash
git clone <repo>
cd Equivalente
npm install
cp .env.example .env.local
```

Configura `.env.local` con tus credenciales de Supabase.

## Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ejecuta las migraciones en orden:
   - `supabase/migrations/20250619000001_initial_schema.sql`
   - `supabase/migrations/20250619000002_rls_policies.sql`
   - `supabase/migrations/20250619000003_qa_fixes.sql`
   - `supabase/migrations/20250619000004_security_revokes.sql`
   - `supabase/migrations/20250620000001_add_ollama_provider.sql`
   - `supabase/migrations/20250620000002_ai_monetization.sql`
   - `supabase/migrations/20250622000001_nutrition_progress_tracking.sql`
   - `supabase/migrations/20250623000001_progress_excel_editing.sql`
3. Ejecuta `supabase/seed.sql` para alimentos base y configuración.
4. Crea usuarios en Authentication:
   - `admin@equivalente.local`
   - `nutriologo@equivalente.local`
   - `paciente@equivalente.local`
5. Ejecuta `supabase/seed-demo.sql` para vincular roles, paciente, gustos prohibidos y dieta demo.
6. Ejecuta `supabase/seed-demo-equivalences.sql` para cargar **equivalencias demo** (tortilla/arroz, etc.) — datos de prueba, no prescripción clínica.
7. Ejecuta `supabase/seed-demo-progress.sql` para **seguimiento demo** (check-ins ficticios).

Paciente demo: `paciente@equivalente.local` (ID `3bc09223-6dd6-4181-a855-14ed52c80c54`). Seguimiento: `/nutriologo/pacientes/[id]/seguimiento`. Importar Excel: `/nutriologo/pacientes/[id]/seguimiento/importar`.

Ver [QA Checklist](docs/QA_CHECKLIST.md) para auditoría completa e instrucciones exactas de usuarios demo.

## Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Modo manual ChatGPT

Con `AI_PROVIDER=manual_chatgpt` (default):

1. La app genera un prompt estructurado vía `@/lib/ai` (JSON esperado).
2. Copias el prompt con el botón **Copiar prompt**.
3. Abres ChatGPT en nueva pestaña (**Abrir ChatGPT**).
4. Pegas manualmente el prompt en ChatGPT.
5. Copias la respuesta JSON.
6. Regresas a Equivalente y pegas la respuesta.
7. Validas y guardas.

No se usa OpenAI API ni Ollama, no se embebe ChatGPT, no se exponen API keys.

## Proveedores de IA

| Proveedor | Variable | Estado |
|-----------|----------|--------|
| Manual ChatGPT | `AI_PROVIDER=manual_chatgpt` | **Activo (default)** |
| Ollama local | `AI_PROVIDER=ollama_local` + `ENABLE_OLLAMA=true` | **Piloto dev** (`/admin/ia-local`, `/api/ai/*`) |
| OpenAI API | `AI_PROVIDER=openai_api` + `ENABLE_OPENAI_API=true` | Preparado |

Ver [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md).

## Ollama local (piloto dev)

Requisitos: [Ollama](https://ollama.com) corriendo en Windows (`http://localhost:11434`).

```env
AI_PROVIDER=ollama_local
ENABLE_OLLAMA_DEV_API=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_FAST=llama3.2:3b
OLLAMA_MODEL_SPANISH=gemma3:4b
OLLAMA_MODEL_SMART=qwen3.5:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_TIMEOUT_MS=60000
```

1. `npm run dev`
2. Admin → **IA local** (`/admin/ia-local`) o API:
   - `GET /api/ai/health`
   - `POST /api/ai/equivalente` con `{ "texto": "..." }`
3. Smoke test: `npm run test:ollama` (con dev server activo)

Ver [docs/AI_LOCAL_OLLAMA.md](docs/AI_LOCAL_OLLAMA.md).

La IA corre **solo server-side**; el browser nunca llama a Ollama directo.

### UTF-8 en PowerShell (Windows)

Si ves mojibake (`Â¡Claro que sÃ!`), el JSON suele estar bien; la consola no usa UTF-8:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Invoke-RestMethod -Uri http://localhost:3000/api/ai/equivalente -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"texto":"¿Puedo cambiar 2 tortillas por arroz?"}'
```

Las APIs devuelven `Content-Type: application/json; charset=utf-8`.

## Activar Ollama en flujos producto (futuro)

```env
AI_PROVIDER=ollama_local
ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_FAST=llama3.2:3b
```

## Activar OpenAI API (futuro)

```env
AI_PROVIDER=openai_api
ENABLE_OPENAI_API=true
OPENAI_API_KEY=sk-...
```

Ver `docs/AI_COST_CONTROL.md`.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build producción
npm run start      # servidor producción
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run test:equivalente-context-demo # escenarios con tabla demo
npm run test:contextual-ai-save      # guardado de borradores IA
npm run test:progress                 # seguimiento + guardrails
npm run test:progress-excel           # parser Excel seguimiento
npm run import:progress -- --patientId=UUID --file=./plantilla.xlsx --dry-run
```

## Deploy

Compatible con **Vercel** o **Railway**. Configura las variables de entorno del `.env.example`.

## Disclaimer

Equivalente no reemplaza atención nutricional profesional. Las opciones son variaciones equivalentes basadas en la dieta y reglas configuradas por tu nutriólogo.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Requisitos de producto](docs/PRODUCT_REQUIREMENTS.md)
- [Flujo IA manual ChatGPT](docs/AI_MANUAL_CHATGPT_FLOW.md)
- [Proveedores de IA](docs/AI_PROVIDERS.md)
- [IA local Ollama (piloto admin)](docs/AI_LOCAL_OLLAMA.md)
- [Seguimiento nutricional](docs/NUTRITION_PROGRESS.md)
- [Importación Excel seguimiento](docs/PROGRESS_EXCEL_IMPORT.md)
- [Análisis de progreso IA](docs/AI_PROGRESS_ANALYSIS.md)
- [Seguridad y privacidad](docs/SECURITY_AND_PRIVACY.md)
