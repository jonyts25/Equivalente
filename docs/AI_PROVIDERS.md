# Proveedores de IA — Equivalente

Equivalente soporta tres proveedores intercambiables vía `AI_PROVIDER`:

```env
AI_PROVIDER=manual_chatgpt | ollama_local | openai_api
```

Toda llamada automática futura pasa por `runAiTask()` en el servidor (`src/lib/ai/provider-router.ts`).

## manual_chatgpt (default)

**Recomendado ahora.**

- No cuesta API.
- No requiere `OPENAI_API_KEY` ni `OLLAMA_BASE_URL`.
- Flujo: la app genera prompt → usuario copia → abre ChatGPT → pega respuesta → valida JSON.
- No embebe ChatGPT ni automatiza sesión.
- `NEXT_PUBLIC_CHATGPT_URL` solo abre el sitio (puede ser pública).

```env
AI_PROVIDER=manual_chatgpt
NEXT_PUBLIC_CHATGPT_URL=https://chatgpt.com
```

## ollama_local (piloto admin/dev)

**Uso personal en PC local — panel `/admin/ia-local`.**

- Corre en tu máquina con [Ollama](https://ollama.com).
- Requiere PC prendida y Ollama corriendo.
- **No expuesto a pacientes** en MVP.
- Documentación completa: [AI_LOCAL_OLLAMA.md](AI_LOCAL_OLLAMA.md)

Variables servidor (nunca en frontend):

```env
ENABLE_OLLAMA_DEV_API=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_SPANISH=gemma3:4b
OLLAMA_MODEL_FAST=llama3.2:3b
OLLAMA_MODEL_SMART=qwen3.5:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_TIMEOUT_MS=60000
```

Para activar en flujos producto (futuro):

```env
AI_PROVIDER=ollama_local
ENABLE_OLLAMA=true
```

### Flujo piloto actual

```
/admin/ia-local → POST /api/ai/equivalente → runEquivalentePilot()
    → ollama-client → nutrition-safety → JSON + flags
```

### Flujo piloto contextual (nuevo)

```
POST /api/ai/equivalente/contextual
    → buildEquivalenteNutritionContext()
    → runEquivalenteContextualPilot()
    → nutrition-safety.ts (contexto real)
```

Los flujos manuales ChatGPT (`manual_chatgpt`) **no** usan estos endpoints.

### Datos demo para piloto contextual

Tras `seed-demo.sql`, ejecuta `supabase/seed-demo-equivalences.sql` para cargar 3 grupos demo (carbohidratos, proteínas, grasas) en el paciente `paciente@equivalente.local`. Son datos de prueba — la nutrióloga debe validarlos antes de uso clínico. Ver [AI_LOCAL_OLLAMA.md](AI_LOCAL_OLLAMA.md).

### Guardar respuestas como borradores

Desde el panel IA local contextual, admin/nutriólogo puede guardar en `generated_menus` (`draft` o `pending_review`). El paciente no ve estos borradores hasta que la nutrióloga los **apruebe** explícitamente.

### Activar Ollama en producto (futuro)

1. Instalar Ollama y modelos: `ollama pull gemma3:4b`
2. Configurar `.env.local`.
3. `runAiTask()` en `ollama-provider.ts` para tareas con schemas producto.

## openai_api (futuro)

**Recomendado para producto estable.**

```env
AI_PROVIDER=openai_api
ENABLE_OPENAI_API=true
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

- Llamadas solo desde backend.
- Requiere pasar por `usage-guard` (créditos, límites).
- Logs en `ai_generation_logs`.

## Arquitectura

```
Pantalla (ManualAiFlow)
    ↓ buildPrompt / prepareAiTask (server)
provider-router.runAiTask()
    ├── manual-chatgpt-provider → { mode: "manual", promptText }
    ├── ollama-provider         → { mode: "automatic", output }  [ENABLE_OLLAMA=true]
    └── openai-provider         → { mode: "automatic", output }  [ENABLE_OPENAI_API=true]
```

## Seguridad

- No exponer `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OPENAI_API_KEY` al cliente.
- No abrir Ollama al internet desde el frontend.
- Minimizar datos clínicos sensibles en prompts cuando no sean necesarios.

## Migración desde AI_MODE

`AI_MODE` está deprecado. Usa `AI_PROVIDER`. Si solo existe `AI_MODE=openai_api`, se mapea automáticamente.
