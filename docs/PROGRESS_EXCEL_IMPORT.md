# Importación Excel — seguimiento nutricional

Guía para cargar `plantilla_seguimiento_nutricional_equivalente.xlsx` en Equivalente.

## Plantilla

Hojas esperadas:

| Hoja | Contenido |
|------|-----------|
| `01 Datos base` | Campo / Valor / Notas / Confianza |
| `02 Seguimiento medidas` | Mediciones antropométricas por fecha |
| `03 Composición corporal` | Báscula de bioimpedancia u otro formato |
| `04 Notas adherencia` | Hambre, antojos, energía, sueño, etc. |

**No se importa teléfono.** Si un valor está en **Notas** y no en **Valor**, el importador lo usa igualmente y deja constancia en `source_notes`.

## Opción A — UI (recomendada)

1. Inicia sesión como nutrióloga o admin.
2. Ve a **Pacientes → [paciente] → Seguimiento → Importar Excel**.
3. Sube el `.xlsx`.
4. Revisa la vista previa:
   - datos base detectados;
   - número de check-ins, composición y notas;
   - advertencias (p. ej. valor tomado de Notas, filas omitidas);
   - duplicados vs registros ya guardados.
5. Elige modo de duplicados:
   - **Omitir** — no inserta filas que ya existen (misma fecha + peso).
   - **Actualizar** — sobrescribe el registro existente.
   - **Importar de todos modos** — inserta aunque haya coincidencia.
6. Pulsa **Importar seguimiento**.

Ruta: `/nutriologo/pacientes/[id]/seguimiento/importar`

## Opción B — Script CLI

```bash
npm run import:progress -- --patientId=UUID --file="./plantilla_seguimiento_nutricional_equivalente.xlsx"
npm run import:progress -- --patientId=UUID --file="./plantilla.xlsx" --dry-run
npm run import:progress -- --patientId=UUID --file="./plantilla.xlsx" --duplicate-mode=update
```

Requisitos:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`
- Opcional: `SUPABASE_SERVICE_ROLE_KEY` (sin auth demo)
- Sin service role: usa `nutriologo@equivalente.local` + `DEMO_PASSWORD`

## Duplicados

Claves de detección:

- Check-ins: `patient_id` + `checkin_date` + `weight_kg`
- Composición: `patient_id` + `measured_at` + `weight_kg`
- Adherencia: `patient_id` + `note_date`

## Después de importar

1. Abre **Seguimiento** y revisa tablas.
2. **Editar** peso/cintura en check-ins si hubo error de captura.
3. **Ocultar pac.** / **Visible pac.** para controlar qué ve el paciente.
4. **Borrar** (soft delete) registros mal capturados; **Restaurar** si fue error.

Todos los cambios quedan en `progress_edit_audit_log`.

## Parser reutilizable

`src/lib/progress/excel-parser.ts`:

- `parseProgressWorkbook(buffer)` — entrada principal
- `parseBaselineSheet`, `parseCheckinsSheet`, `parseBodyCompositionSheet`, `parseAdherenceNotesSheet`

Tests: `npm run test:progress-excel`

## Limitaciones

- Fechas seriales Excel y cadenas ISO se convierten a `date`.
- Errores de fórmula (`#VALUE!`) en cambios de peso/grasa se ignoran; se recalculan si hay datos previos.
- Filas sin fecha válida o sin medida relevante se omiten con advertencia.
- Los datos importados **deben validarse** por nutrióloga antes de publicar al paciente (`visible_to_patient`).

Ver también [NUTRITION_PROGRESS.md](NUTRITION_PROGRESS.md) y [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).
