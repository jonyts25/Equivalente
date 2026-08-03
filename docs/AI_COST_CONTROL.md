# Control de costos IA

## Modo manual (actual)

```env
AI_PROVIDER=manual_chatgpt
```

- Costo de API: **$0**
- El usuario usa su propia cuenta de ChatGPT
- Equivalente genera prompts y valida respuestas
- No descuenta créditos comerciales
- Logs registran `provider: manual_chatgpt`

## Ollama local (futuro)

```env
AI_PROVIDER=ollama_local
ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b
```

- Costo API por token: **$0** (hardware local)
- Costo operativo: PC prendida, electricidad
- Puede tener créditos comerciales en plan aunque el costo real sea bajo

## OpenAI API (futuro)

```env
AI_PROVIDER=openai_api
ENABLE_OPENAI_API=true
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_STRONG_MODEL=gpt-4o
OPENAI_MONTHLY_BUDGET_USD=20
APP_INTERNAL_AI_BUDGET_USD=10
```

### Arquitectura

- Llamadas **solo desde backend** (`runAiTask` → provider)
- Nunca desde frontend
- **Obligatorio** pasar por `usage-guard.ts` antes de llamar
- Logs en `ai_generation_logs` con tokens y costo estimado
- Créditos comerciales en `ai_credit_balances` / `subscription_plans`

### Créditos por tarea

Ver `TASK_CREDIT_COSTS` en `src/lib/ai/usage-guard.ts` y `docs/AI_MONETIZATION_AND_LIMITS.md`.

### Presupuestos

- `OPENAI_MONTHLY_BUDGET_USD` — tope global mensual
- `APP_INTERNAL_AI_BUDGET_USD` — tope interno de la app

## Por qué no API key en frontend

- Exposición pública de la key
- Sin control de costos
- Sin logs centralizados
- Violación de términos de OpenAI

## Por qué no embeber ChatGPT

- No hay API oficial para embed
- Riesgo de ToS
- Sin control de formato JSON
- Sin auditoría clínica

## Build sin variables de IA automática

Con `AI_PROVIDER=manual_chatgpt`, el build **no falla** sin `OPENAI_API_KEY` ni `OLLAMA_BASE_URL`.
