# IA local con Ollama — Equivalente

Herramienta **admin/dev** para probar IA nutricional local sin exponer Ollama al navegador ni a pacientes.

## URL

- Panel admin: **`/admin/ia-local`**
- Panel nutriólogo: **`/nutriologo/ia-local`**
- Health API: `GET /api/ai/health`
- Piloto libre: `POST /api/ai/equivalente`
- Piloto contextual: `POST /api/ai/equivalente/contextual` (requiere sesión admin/nutriólogo)

## Dos modos de piloto

| Modo | Endpoint | Contexto |
|------|----------|----------|
| **Libre** | `POST /api/ai/equivalente` | Sin paciente — siempre falta dieta/equivalencias |
| **Contextual** | `POST /api/ai/equivalente/contextual` | Dieta, comida, equivalencias, preferencias, gustos prohibidos del paciente |

El piloto libre sirve para validar guardrails genéricos. El contextual usa `buildEquivalenteNutritionContext()` y es el siguiente paso hacia MVP personal.

## Flujo arquitectónico

### Piloto libre
```
/admin/ia-local → POST /api/ai/equivalente → runEquivalentePilot() → nutrition-safety → Ollama
```

### Piloto contextual
```
/admin/ia-local (sección contextual)
    → POST /api/ai/equivalente/contextual
    → buildEquivalenteNutritionContext(patientId, dietPlanId, mealSlotId)
    → runEquivalenteContextualPilot()
    → prompts/equivalente-contextual.ts
    → nutrition-safety.ts (con contextCompleteness real)
    → Ollama
```

**Nota:** No usa `runAiTask()` del provider-router (contrato JSON distinto a tareas producto). Flujos `manual_chatgpt` intactos.

## Variables requeridas

```env
ENABLE_OLLAMA_DEV_API=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_SPANISH=gemma3:4b
OLLAMA_MODEL_FAST=llama3.2:3b
OLLAMA_MODEL_SMART=qwen3.5:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_TIMEOUT_MS=60000
```

Opcional para producto futuro (no requerido en piloto):

```env
AI_PROVIDER=ollama_local
ENABLE_OLLAMA=true
```

## Modelos recomendados (Windows local)

| Variable | Modelo | Uso |
|----------|--------|-----|
| `OLLAMA_MODEL_SPANISH` | `gemma3:4b` | Respuestas en español (default piloto) |
| `OLLAMA_MODEL_FAST` | `llama3.2:3b` | Pruebas rápidas |
| `OLLAMA_MODEL_SMART` | `qwen3.5:latest` | Consultas más complejas |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text:latest` | Embeddings (futuro) |

## Cómo probar

1. Ollama corriendo: `http://localhost:11434`
2. `npm run dev`
3. Login como **admin** o **nutriólogo** → **IA local**
4. Sección **Probar con contexto de paciente**: elige paciente demo, dieta, comida
5. Smoke automatizado:

```bash
npm run test:ollama
npm run test:ollama-safety
npm run test:equivalente-context   # unit, sin Ollama
npm run test:equivalente-context-demo  # escenarios con tabla demo
```

## Piloto contextual — curl (sesión requerida)

Desde el navegador logueado como admin, usa la UI. Para API directa necesitas cookies de sesión Supabase SSR.

```json
POST /api/ai/equivalente/contextual
{
  "patientId": "3bc09223-6dd6-4181-a855-14ed52c80c54",
  "texto": "¿Puedo cambiar 2 tortillas por arroz?",
  "hintIntencion": "sustitucion_alimento"
}
```

## Qué contexto se envía a Ollama

- Paciente: nombre, goal, precision_mode (no notas privadas)
- Dieta activa: título, status
- Meal slot: nombre, requirements nutricionales
- Equivalencias: grupos + items (máx 15 grupos, 8 items/grupo)
- Preferencias alimentarias (máx 30)
- Gustos prohibidos (máx 20)

**NO se envía:** historial, logs, notas clínicas extensas, datos de otros pacientes.

## Datos demo actuales

Paciente demo (`paciente@equivalente.local`, ID `3bc09223-6dd6-4181-a855-14ed52c80c54`):

| Dato | Estado |
|------|--------|
| Dieta activa + 5 meal slots | ✅ `seed-demo.sql` |
| Gustos prohibidos (mazapán, crema, pan dulce) | ✅ |
| Equivalencias demo (3 grupos, 14 ítems) | ✅ `seed-demo-equivalences.sql` |

### Cargar equivalencias demo

Tras `seed.sql` y `seed-demo.sql`:

```bash
# Supabase SQL Editor o CLI
psql $DATABASE_URL -f supabase/seed-demo-equivalences.sql
```

Grupos demo (todos con nota *“Demo para pruebas. Validar con nutrióloga antes de uso clínico.”*):

- **Carbohidratos demo:** tortilla, arroz, pan integral, avena, papa, frijoles, manzana, plátano
- **Proteínas demo:** pollo, huevo, atún, yogur griego
- **Grasas demo:** aguacate, aceite de oliva

**Mazapán** permanece en `forbidden_treats`, no en equivalencias.

### Dónde verlas

- UI: `/nutriologo/pacientes/3bc09223-6dd6-4181-a855-14ed52c80c54/equivalencias` (badge **Demo**)
- IA local: context completeness → Equivalencias **sí** + conteo grupos/ítems

### Probar IA contextual con equivalencias

1. Login admin o nutriólogo → `/admin/ia-local` o `/nutriologo/ia-local`
2. Paciente demo → dieta activa → comida (ej. Comida)
3. Preguntas sugeridas:
   - «¿Puedo cambiar 2 tortillas por arroz?»
   - «¿Cuánto arroz equivale a una tortilla?»
   - «Tengo antojo de mazapán»
   - «No tengo avena, ¿qué puedo usar?»

La IA puede orientar con la tabla demo, pero **siempre** debe marcar revisión nutrióloga y no dar aprobación clínica absoluta.

## Guardar borradores revisables (nutrióloga)

Tras probar con contexto en `/admin/ia-local` o `/nutriologo/ia-local`, puedes guardar la respuesta en `generated_menus`:

| Acción | Status guardado | Visible al paciente |
|--------|-----------------|---------------------|
| Guardar como nota IA | `draft` | No |
| Guardar como menú borrador | `draft` | No |
| Guardar como sugerencia pendiente | `pending_review` | No (hasta aprobar) |
| Descartar | — | — |

**Nunca** se guarda como `approved` desde IA local. La nutrióloga debe aprobar manualmente en `/nutriologo/pacientes/[id]/menus`.

Antes de guardar se muestra aviso: *“Esta respuesta fue generada por IA local y debe revisarse antes de mostrarse al paciente.”*

`content_json` incluye: `source: ollama_local_contextual`, provider, model, flags, confianza, context completeness, pregunta original y respuesta.

Ver borradores: `/nutriologo/pacientes/[id]/menus?status=draft` · Detalle: `/nutriologo/pacientes/[id]/menus/[menuId]`

Tests: `npm run test:contextual-ai-save`

## Health check

```bash
curl http://localhost:3000/api/ai/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "provider": "ollama_local",
  "models": ["llama3.2:3b", "gemma3:4b", "..."]
}
```

## Contrato JSON (`POST /api/ai/equivalente`)

Request:

```json
{
  "texto": "¿Puedo cambiar 2 tortillas por arroz?",
  "model": "gemma3:4b",
  "hintIntencion": "sustitucion_alimento",
  "debug": true
}
```

Response:

```json
{
  "ok": true,
  "provider": "ollama_local",
  "model": "gemma3:4b",
  "intencion": "sustitucion_alimento",
  "alimentos_detectados": ["tortillas", "arroz"],
  "respuesta_paciente": "...",
  "requiere_revision_nutriologa": true,
  "motivo_revision": "...",
  "confianza": 0.55,
  "flags": ["missing_equivalence_table", "requires_professional_review"]
}
```

## Reglas de seguridad nutricional

Implementadas en `src/lib/ai/nutrition-safety.ts`:

- No reemplaza a la nutrióloga
- No diagnostica
- No inventa equivalencias exactas sin tabla
- Fuerza `requiere_revision_nutriologa` si faltan datos
- Corrige respuestas permisivas
- **No aprueba menús clínicos**

## Por qué Ollama no va al frontend

- Evita exponer `localhost:11434` al navegador
- Centraliza guardrails en servidor
- Permite control de acceso (admin / `ENABLE_OLLAMA_DEV_API`)
- Facilita logging y límites futuros (`usage-guard`)

## Encoding UTF-8

Si en **PowerShell** ves `Â¡Claro que sÃ!`, es mojibake de consola — la app y el navegador muestran UTF-8 correcto.

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

Endpoints responden `Content-Type: application/json; charset=utf-8`.

## Limitaciones del modelo local

- Puede ignorar instrucciones JSON → corregido por `nutrition-safety.ts`
- Confianza alta sin contexto → cap en código
- Equivalencias inventadas → flag `possible_invented_equivalence`
- Latencia variable según hardware
- No sustituye revisión clínica

## Volver a modo manual ChatGPT

En `.env.local`:

```env
AI_PROVIDER=manual_chatgpt
AI_MODE=manual_chatgpt
ENABLE_OLLAMA=false
```

Reinicia `npm run dev`. Los flujos manuales en nutriólogo/paciente siguen igual.

## Acceso

| Rol | `/admin/ia-local` | `/api/ai/*` sin login |
|-----|-------------------|------------------------|
| Admin autenticado | Sí | No (403) |
| Nutriólogo autenticado | Sí (`/nutriologo/ia-local`) | No (403) |
| `ENABLE_OLLAMA_DEV_API=true` | — | Solo `/api/ai/health` y `/api/ai/equivalente` libre |
| Paciente | No | No |

No mostrar IA local a pacientes en MVP.
