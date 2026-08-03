# Flujo IA manual ChatGPT

## Configuración

```env
AI_PROVIDER=manual_chatgpt
```

No requiere `OPENAI_API_KEY`.

## Flujo paso a paso

1. Usuario inicia tarea (estructurar dieta, pedir opciones, evaluar antojo, etc.)
2. App construye prompt con `prompt-builder.ts`
3. Usuario copia prompt (`CopyPromptButton` — Clipboard API)
4. Usuario abre ChatGPT (`OpenChatGPTButton` → `https://chatgpt.com`)
5. Usuario pega prompt en ChatGPT manualmente
6. ChatGPT devuelve JSON
7. Usuario copia respuesta y pega en `PasteChatGPTResponseBox`
8. Usuario valida (`ValidateManualAIResponseButton`)
9. App valida con Zod (`response-validator.ts`)
10. App guarda en `manual_ai_sessions` y `generated_menus` / `diet_plans`

## Tareas soportadas

| Task | Uso |
|------|-----|
| `parse_diet` | Estructurar dieta en meal slots |
| `generate_meal_options` | Opciones equivalentes |
| `generate_day_menu` | Menú del día |
| `generate_week_menu` | Menú semanal |
| `craving_check` | Evaluar antojo |
| `ingredients_menu` | Menú con ingredientes disponibles |
| `shopping_list` | Lista de súper |

## Componentes UI

- `PromptPreviewCard`
- `CopyPromptButton`
- `OpenChatGPTButton`
- `SharePromptButton` (Web Share API en móvil)
- `PasteChatGPTResponseBox`
- `ValidateManualAIResponseButton`
- `ManualAiFlow` (orquestador)

## Lo que NO hacemos

- No embeber ChatGPT
- No iframe
- No automatizar sesión
- No pedir credenciales de ChatGPT
- No mostrar historial de ChatGPT en la PWA
- No API key en frontend

## Error de validación

> No pude leer bien la respuesta. Intenta copiar el bloque completo de ChatGPT o vuelve a generar el prompt.
