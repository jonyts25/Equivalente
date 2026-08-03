# Análisis de progreso con IA local (Ollama)

Piloto **admin/nutriólogo** — no expuesto al paciente sin revisión.

## Endpoint

```
POST /api/ai/equivalente/progress-analysis
```

Requiere sesión admin o nutriólogo con acceso al paciente.

```json
{
  "patientId": "uuid",
  "rangeStart": "2025-01-01",
  "rangeEnd": "2025-06-30",
  "model": "gemma3:4b",
  "save": true
}
```

## Flujo

```
/nutriologo/pacientes/[id]/seguimiento/analisis
  → POST /api/ai/equivalente/progress-analysis
  → buildProgressAnalysisContext()
  → Ollama (prompts/progress-analysis.ts)
  → progress-analysis-guardrails.ts
  → progress_ai_analyses (visible_to_patient=false)
```

## Guardrails

- **No** diagnostica enfermedades
- **No** cambia dieta ni prescribe planes
- **No** sugiere medicamentos ni suplementos
- `requires_nutritionist_review=true` siempre
- Confianza cap ≤ 0.75
- Lenguaje prohibido → flag `guardrail_corrected`

## Respuesta JSON

```json
{
  "summary": "...",
  "trend": {
    "weight": "down | up | stable | insufficient_data",
    "waist": "...",
    "body_fat": "...",
    "muscle_mass": "..."
  },
  "observations": [],
  "flags": [],
  "questions_for_patient": [],
  "suggested_review_points_for_nutritionist": [],
  "requires_nutritionist_review": true,
  "confidence": 0.65
}
```

## Visibilidad al paciente

1. Nutrióloga revisa en `/seguimiento/analisis`
2. **Marcar visible al paciente** → `visible_to_patient=true`
3. Paciente ve resumen en `/paciente/progreso`

Nunca se activa visibilidad automáticamente.

## Limitaciones del modelo local

- Pocos datos → tendencias `insufficient_data`
- Puede ignorar instrucciones → corregido por guardrails
- No sustituye juicio clínico de la nutrióloga
- Lectura de fotos manuscritas: **no implementada** (captura manual rápida)

## Tests

```bash
npm run test:progress
```

## Variables

Mismas que IA local Ollama: `ENABLE_OLLAMA_DEV_API`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL_SPANISH`.

Ver [AI_LOCAL_OLLAMA.md](AI_LOCAL_OLLAMA.md).
