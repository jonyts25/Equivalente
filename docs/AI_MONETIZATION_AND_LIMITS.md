# Monetización y límites de IA

**Estado:** preparado, no activo. El modo `manual_chatgpt` no descuenta créditos.

## Créditos vs tokens

| Concepto | Descripción |
|----------|-------------|
| **Tokens** | Unidad real de OpenAI/Ollama (input + output) |
| **Créditos comerciales** | Unidad que ve el paciente/nutriólogo en su plan |

No vendemos tokens directos al paciente. Cada tarea tiene un costo en créditos configurado en `ai_task_pricing` y constantes en `usage-guard.ts`.

## Costo por tarea (referencia)

| Tarea | Créditos |
|-------|----------|
| craving_check | 1 |
| generate_meal_options | 2 |
| generate_day_menu | 5 |
| generate_week_menu | 20 |
| parse_diet | 25 |
| shopping_list | 5 |
| ingredients_menu | 2 |

## Planes demo (seed)

| Plan | Precio MXN/mes | IA | Créditos/mes | Diario | Menús/semana |
|------|----------------|-----|--------------|--------|--------------|
| Sin IA | 0 | No | 0 | 0 | 0 |
| IA Básica | 500 | Sí | 300 | 20 | 2 |
| IA Plus | 900 | Sí | 800 | 60 | 8 |

## Tablas

- `subscription_plans` — catálogo de planes
- `customer_subscriptions` — suscripción activa por paciente/nutriólogo
- `ai_task_pricing` — costo en créditos por tarea y proveedor
- `ai_credit_balances` — saldo del periodo
- `ai_credit_transactions` — ledger de movimientos
- `patient_ai_limits` — límites legacy por paciente (coexiste como override granular; planes son la fuente comercial futura)

## usage-guard.ts

Flujo futuro para `ollama_local` y `openai_api`:

1. `assertCanUseAi` — plan activo, `ai_enabled`, créditos, límites diarios/semanales
2. `reserveAiCredits` — reserva atómica antes de llamar al proveedor
3. Llamada al proveedor vía `runAiTask`
4. `finalizeAiUsage` — descuenta créditos y enlaza log
5. `releaseAiReservation` — si falla la llamada, libera reserva

En `manual_chatgpt`: todos los guards son no-op (siempre permitido, sin costo).

## Por proveedor

### manual_chatgpt

- Costo API: **$0**
- No pasa por `assertCanUseAi` con bloqueo
- Sesiones registradas en `manual_ai_sessions` y `ai_generation_logs` sin descuento de créditos

### ollama_local

- Costo por token: **$0** (hardware local)
- Costo operativo: electricidad, PC prendida
- Puede tener créditos comerciales en plan aunque el costo real sea bajo

### openai_api

- Debe pasar **siempre** por usage guard antes de llamar
- `estimated_max_cost_usd` en pricing ayuda a no exceder margen del plan
- Presupuestos globales: `OPENAI_MONTHLY_BUDGET_USD`, `APP_INTERNAL_AI_BUDGET_USD`

## Por qué no vender tokens directos

- Los usuarios no entienden tokens.
- El costo real varía por modelo y longitud de respuesta.
- Los créditos por tarea dan predictibilidad comercial y margen controlado.

## Cobros

Stripe / Mercado Pago **no integrados todavía**. Las tablas preparan el modelo para activarlo después.
