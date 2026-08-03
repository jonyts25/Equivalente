# Product Requirements — Equivalente

## Principio central

La IA no inventa dietas nuevas. Genera variaciones equivalentes a una dieta base prescrita.

## Lo que NO hace

- No crea dietas clínicas desde cero
- No reemplaza a la nutrióloga
- No modifica objetivos clínicos
- No inventa equivalencias fuera de reglas configuradas

## Reglas configurables

- Dieta base, equivalencias, porciones
- Restricciones, alimentos permitidos/prohibidos
- Alimentos detonantes, gustos prohibidos
- Preferencias del paciente, reglas de precisión

## Clasificación alimentaria

| Tipo | Descripción |
|------|-------------|
| favorito | Le gusta, puede incluirse si cabe |
| no preferido | No disfruta, ocasional |
| rechazado | No quiere que se sugiera |
| prohibido clínico | Indicación profesional |
| detonante | Riesgo de antojo/atracón |
| gusto prohibido | Le gusta pero requiere cuidado |

## Modos de gusto prohibido

- No sugerir nunca
- Solo versión adaptada
- Solo si nutrióloga aprueba
- Solo porción exacta
- Alternativa sensorial

## Precision mode

UI: **No me dejes hacerme trampa**

- `relaxed` — menos preguntas
- `normal` — balance
- `strict` — más aclaraciones ante ambigüedad

## Estados de menú

`draft`, `pending_review`, `approved`, `rejected`, `favorite`, `patient_rejected`, `requires_clarification`, `blocked`

Menús generados por paciente → siempre `pending_review` hasta aprobación clínica.
