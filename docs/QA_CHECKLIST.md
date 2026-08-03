# QA Checklist — Equivalente

**Última auditoría:** 2026-06-22 (post-refactor proveedores IA)  
**Auditoría previa:** 2026-06-19  
**Proyecto Supabase:** `Equivalente` (`bpqbhaxlqzthmmtgfbry`)

---

## Scripts automatizados

| Comando | Qué valida |
|---------|------------|
| `npm run test:ambiguity` | 9 casos del detector + tono amable |
| `npm run test:providers` | `getActiveProvider`, `runAiTask` manual, bloqueo Ollama/OpenAI |
| `npm run test:e2e` | Auth + RLS con usuarios demo (requiere contraseña correcta) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run build` | Build producción (28 rutas) |

---

## 1. Build y calidad (2026-06-22)

| Check | Resultado |
|-------|-----------|
| `npm run lint` | OK (0 errores) |
| `npm run typecheck` | OK |
| `npm run build` | OK — 28 rutas App Router |
| `npm run test:ambiguity` | OK — **9/9** casos + tono |
| `npm run test:providers` | OK — **8/8** checks |

---

## 2. Variables de entorno

### `.env.local` mínimo validado

```env
NEXT_PUBLIC_SUPABASE_URL=https://bpqbhaxlqzthmmtgfbry.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
AI_MODE=manual_chatgpt          # legacy; sin AI_PROVIDER también funciona
ENABLE_OPENAI_API=false
```

| Check | Resultado |
|-------|-----------|
| App corre sin `AI_PROVIDER` | OK — default `manual_chatgpt` vía `AI_MODE` o fallback |
| App corre sin `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | OK — build + providers test |
| App corre sin `OPENAI_API_KEY` | OK |
| Sin `SUPABASE_SERVICE_ROLE_KEY` en cliente | OK — no requerida para flujo manual |
| `manual_chatgpt` no llama Ollama ni OpenAI | OK — `ManualAiFlow` usa `buildPrompt` local; sin `fetch` a `:11434` ni OpenAI |
| API keys no expuestas al frontend | OK — solo `NEXT_PUBLIC_*` |

**Nota:** `prepareAiTask()` (server action) usa `runAiTask()` → `runManualChatGptTask()` que solo devuelve `mode: "manual"` + `promptText`. La UI manual construye el prompt en cliente con el mismo `buildPrompt`.

---

## 3. Provider router (post-refactor)

| Check | Resultado |
|-------|-----------|
| `getActiveProvider()` sin `AI_PROVIDER` | `manual_chatgpt` |
| `runAiTask()` con manual | `mode: "manual"`, `promptText` > 50 chars |
| `ollama_local` + `ENABLE_OLLAMA=false` | Lanza *"Ollama no está habilitado"* — no hace fetch |
| `openai_api` + `ENABLE_OPENAI_API=false` | Lanza *"OpenAI API no está habilitada"* — no hace fetch |
| `isOllamaEnabled()` default | `false` |
| `isOpenAiEnabled()` default | `false` |

Archivos: `src/lib/ai/config.ts`, `provider-router.ts`, `providers/*`

---

## 4. Supabase / migraciones

| Migración MCP | Estado |
|---------------|--------|
| `qa_fixes` | Aplicada |
| `security_revokes` | Aplicada |
| `add_ollama_provider` | Aplicada |
| `ai_monetization` | Aplicada |

### Datos demo confirmados (SQL 2026-06-22)

| Recurso | Estado |
|---------|--------|
| Usuarios Auth + profiles (3) | OK |
| Dieta activa `Dieta demo — control de peso` | OK — paciente `3bc09223-…` |
| `subscription_plans` | 3 planes: Sin IA, IA Básica, IA Plus |
| `manual_ai_sessions` | 0 (sin flujo E2E aún) |
| `generated_menus` | 0 (sin flujo E2E aún) |

---

## 5. RLS y permisos

### Políticas verificadas en DB

| Tabla | Políticas |
|-------|-----------|
| `manual_ai_sessions` | `manual_ai_sessions_access` |
| `ai_generation_logs` | `ai_logs_admin`, `ai_logs_insert_own`, `ai_logs_nutritionist` |
| `subscription_plans` | `subscription_plans_admin`, `subscription_plans_read` (activos) |
| `customer_subscriptions` | `customer_subscriptions_access` (admin / paciente dueño / nutriólogo dueño) |
| `ai_credit_balances` | `ai_credit_balances_access` (aislado por paciente/nutriólogo) |
| `ai_credit_transactions` | `ai_credit_transactions_access` |

### Por rol (código + políticas)

| Regla | Estado |
|-------|--------|
| Admin ve todo | OK — políticas `*_admin` |
| Nutriólogo solo pacientes asignados | OK |
| Paciente solo su info | OK |
| Paciente no aprueba clínicamente | OK — `updateMenuStatus` + RLS |
| Nutriólogo aprueba/rechaza menús | OK — código + UI |
| Créditos/suscripciones no expuestos cross-patient | OK — políticas por `profile_id` |

### JWT real (E2E automatizado)

| Check | Resultado |
|-------|-----------|
| `npm run test:e2e` con `Equivalente2026!` | **FALLÓ** — `Invalid login credentials` |
| Causa | Contraseña demo en Supabase Auth distinta a la documentada, o usuario recreado sin esa clave |

**Acción manual:** En Supabase Dashboard → Authentication → Users, resetear contraseña de los 3 demo a `Equivalente2026!` (o exportar `DEMO_PASSWORD=…` al correr `npm run test:e2e`).

---

## 6. Flujo manual ChatGPT

| Paso | Estado | Notas |
|------|--------|-------|
| Generar prompt (nutriólogo dieta) | OK código | `ManualAiFlow` + `buildPrompt` |
| Copiar prompt | OK | Clipboard API |
| Abrir ChatGPT | OK | `OpenChatGPTButton` → `NEXT_PUBLIC_CHATGPT_URL` o chatgpt.com |
| Pegar respuesta | OK | |
| Validar JSON | OK | Zod en `validateAiResponse` |
| Guardar `manual_ai_sessions` | OK código | `saveManualAiSession` / `validateAndSaveMenu` |
| Guardar `generated_menus` | OK código | |
| Paciente → `pending_review` | OK | `saveGeneratedMenu` default por rol |
| Nutriólogo → `draft` | OK | `ManualMenuGenerator` |
| Aprobar/rechazar menú | OK código | `updateMenuStatus` + `MenuActions` |
| E2E con sesión real | **Pendiente** | Requiere contraseña Auth válida |

Rutas clave:
- Nutriólogo: `/nutriologo/pacientes/[id]/dieta`, `/menus/manual`
- Paciente: `/paciente/opciones/manual`, `/paciente/antojo`

---

## 7. Detector de ambigüedad

`precision_mode=strict` — **9/9 PASS** (`npm run test:ambiguity`):

| Entrada | Esperado | Resultado |
|---------|----------|-----------|
| mazapán de chocolate | requires_clarification | PASS |
| un mazapán de chocolate | requires_clarification | PASS |
| mazapán grande | requires_clarification | PASS |
| una cucharada de crema de cacahuate | requires_clarification | PASS |
| crema de cacahuate copeteada | requires_clarification | PASS |
| poquito aceite | requires_clarification | PASS |
| una tortillita | requires_clarification | PASS |
| un vaso de jugo | requires_clarification | PASS |
| un puñito de nueces | requires_clarification | PASS |

Tono: mensaje *"No lo bloqueo por castigo…"* — sin regaño.  
Antojo: `ManualAiFlow` oculto hasta `clarificationApproved` o `status === "ok"`.

---

## 8. Pantallas con datos reales

Revisión de código + datos DB (sin browser E2E):

| Ruta | Estado | Fuente de datos |
|------|--------|-----------------|
| `/admin` | OK | Contadores `nutritionists`, `patients`, `ai_generation_logs` |
| `/admin/configuracion` | OK | `app_settings` + env `AI_PROVIDER` / flags |
| `/nutriologo/pacientes` | OK | `patients` filtrados por RLS |
| `/nutriologo/pacientes/[id]/dieta` | OK | `diet_plans` + `meal_slots` |
| `/nutriologo/pacientes/[id]/menus` | OK | `generated_menus` + acciones |
| `/paciente/hoy` | OK | dieta activa + último menú aprobado/pending |
| `/paciente/opciones/manual` | OK | `ManualMenuGenerator` |
| `/paciente/antojo` | OK | `CravingChecker` + detector |

Estados vacíos: mensajes con links a flujo manual donde aplica.

---

## 9. Persistencia

| Acción | Server action | Validado |
|--------|---------------|----------|
| Crear/editar dieta | `parseAndSaveDiet` | Código OK; E2E JWT pendiente |
| Crear equivalencia | `saveEquivalenceGroup` | Código OK |
| Gusto prohibido | `saveForbiddenTreat` | DB demo con registros |
| `manual_ai_session` | `saveManualAiSession` | Código OK |
| Respuesta validada + menú | `validateAndSaveMenu` | Código OK |
| Aprobar/rechazar menú | `updateMenuStatus` | Código OK |
| Feedback paciente | `savePatientFeedback` | **Sin UI** en `/paciente/hoy` |

---

## 10. Checklist por rol (manual)

### Admin (`admin@equivalente.local`)
- [ ] Login → `/admin` muestra contadores reales
- [ ] `/admin/pacientes` lista todos los pacientes
- [ ] `/admin/configuracion` muestra `manual_chatgpt` y flags en false
- [ ] `/admin/logs-ia` accesible

### Nutriólogo (`nutriologo@equivalente.local`)
- [ ] Login → ve solo paciente demo asignado
- [ ] `/nutriologo/pacientes/3bc09223-6dd6-4181-a855-14ed52c80c54/dieta` — dieta activa
- [ ] Flujo manual: copiar → ChatGPT → pegar → validar → guardar
- [ ] `/menus` — aprobar menú `pending_review` del paciente

### Paciente (`paciente@equivalente.local`)
- [ ] Login → `/paciente/hoy` — próxima comida + menú o vacío útil
- [ ] `/paciente/opciones/manual` — generar y guardar → `pending_review`
- [ ] `/paciente/antojo` — "mazapán de chocolate" pide aclaración antes de ChatGPT
- [ ] No puede aprobar menú clínicamente (solo favorito/rechazo propio)

---

## Bugs encontrados (2026-06-22)

| # | Severidad | Bug | Estado |
|---|-----------|-----|--------|
| 1 | Bajo | Detector sin plantilla específica para `jugo` / `nueces` | **Corregido** — templates en `ambiguity-detector.ts` |
| 2 | Info | `npm run test:e2e` falla por credenciales Auth | **No bloqueante** — resetear password en Dashboard |
| 3 | Bajo | Feedback paciente sin UI | **Pendiente** — action existe |

### Bugs corregidos en auditorías anteriores (siguen vigentes)

| # | Bug | Fix |
|---|-----|-----|
| 1 | `ManualMenuGenerator` sin `manual_ai_sessions` | `validateAndSaveMenu` |
| 2 | `parseAndSaveDiet` sin sesión manual | `saveManualAiSession` |
| 3 | `CravingChecker` sin sesión manual | `validateAndSaveMenu` |
| 4 | Antojo sin bloqueo por ambigüedad | `clarificationApproved` |
| 5 | RLS `equivalence_items` | Migración `qa_fixes` |
| 6 | Signup rol desde metadata | Siempre `patient` |
| 7 | RPC SECURITY DEFINER expuestos | Migración `security_revokes` |

---

## Pendientes no bloqueantes

- Reset de contraseñas demo para `npm run test:e2e`
- UI de feedback en `/paciente/hoy`
- Admin no accede a rutas `/nutriologo/*` (diseño middleware)
- PWA instalación manual en dispositivo
- Activar Ollama / OpenAI API (fuera de alcance QA actual)

---

## Configurar Supabase (exacto)

1. Proyecto: [Equivalente](https://supabase.com/dashboard/project/bpqbhaxlqzthmmtgfbry)
2. `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://bpqbhaxlqzthmmtgfbry.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard>
   AI_MODE=manual_chatgpt
   ENABLE_OPENAI_API=false
   ```
3. Migraciones (ya aplicadas vía MCP; para entorno nuevo, ejecutar en orden los archivos en `supabase/migrations/`)
4. `supabase/seed.sql` — catálogo + settings
5. Auth → Users → crear usuarios demo (abajo)
6. SQL Editor → `supabase/seed-demo.sql` — vincula profiles / nutritionists / patients

---

## Crear usuarios demo (exacto)

**Authentication → Users → Add user** (email confirmado):

| Email | Contraseña sugerida | Rol final |
|-------|---------------------|-----------|
| `admin@equivalente.local` | `Equivalente2026!` | admin |
| `nutriologo@equivalente.local` | `Equivalente2026!` | nutritionist |
| `paciente@equivalente.local` | `Equivalente2026!` | patient |

Luego ejecutar `supabase/seed-demo.sql`.

### Vincular profiles / nutritionists / patients

El seed-demo hace (por email, sin UUIDs hardcodeados):

1. `profiles.role` → admin / nutritionist / patient
2. Fila en `nutritionists` para el nutriólogo
3. Fila en `patients` con `nutritionist_id` y `precision_mode=strict` para el paciente

**IDs actuales en producción:**

| Rol | Email | Profile UUID |
|-----|-------|--------------|
| Admin | admin@equivalente.local | `e28760a2-97eb-407a-b255-7cd290eebd05` |
| Nutriólogo | nutriologo@equivalente.local | `b78e0151-3b9a-4fd8-9ee3-134e0da6bfd6` |
| Paciente | paciente@equivalente.local | `4b5bebee-7326-4c74-b6b0-460a578f4025` |

Paciente ID: `3bc09223-6dd6-4181-a855-14ed52c80c54`

---

## Prueba manual recomendada (15 min)

1. Reset password demo si `test:e2e` falla
2. Login nutriólogo → `/nutriologo/pacientes/3bc09223-6dd6-4181-a855-14ed52c80c54/dieta`
3. Pegar JSON dieta de ChatGPT → validar → guardar → verificar fila en `manual_ai_sessions`
4. Login paciente → `/paciente/opciones/manual` → guardar → `generated_menus.status = pending_review`
5. Login nutriólogo → menús → aprobar
6. Paciente → `/paciente/antojo` → "mazapán de chocolate" → debe pedir aclaración antes del flujo ChatGPT
