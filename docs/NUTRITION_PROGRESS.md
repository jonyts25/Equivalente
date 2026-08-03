# Seguimiento nutricional — Equivalente

Módulo para registrar mediciones antropométricas, composición corporal y análisis de tendencias — sin duplicar trabajo de la nutrióloga.

## Qué captura

### Perfil base (`patient_baseline_profiles`)

- Talla, peso inicial, peso ideal, peso máximo (rango)
- Distribución corporal: androide / genoide / mixta / desconocida
- Notas médicas, medicamentos, alergias, antecedentes (texto libre)
- **No** incluye teléfono ni datos de contacto

### Check-ins antropométricos (`nutrition_checkins`)

- Fecha, T/A (texto), dieta/indicación
- Peso, tórax, cintura, abdomen, cadera, cuello
- Notas, origen (`manual`, `excel_import`, `photo_extract`, `imported`)
- `visible_to_patient`, `is_deleted` (soft delete), auditoría en `progress_edit_audit_log`

### Notas de adherencia (`progress_adherence_notes`)

- Hambre, antojos, energía, sueño (1–5), digestión, ejercicio, adherencia estimada
- Por defecto **no visibles** al paciente hasta que la nutrióloga las publique

### Composición corporal (`body_composition_entries`)

- Fecha, peso, % grasa, masa ósea, % agua, masa muscular
- Complexión, kcal, edad metabólica, grasa visceral

### Fotos de formato en papel (`progress_source_photos`)

- Referencia a storage (futuro)
- Estado de extracción: `pending` → `extracted` → `reviewed`
- **Limitación:** lectura automática de manuscritos no implementada en MVP

### Análisis IA (`progress_ai_analyses`)

- Resumen, tendencias JSON, flags
- `requires_nutritionist_review=true` siempre
- `visible_to_patient=false` por defecto

## Rutas

| Rol | Ruta |
|-----|------|
| Nutriólogo | `/nutriologo/pacientes/[id]/seguimiento` |
| Nutriólogo | `/nutriologo/pacientes/[id]/seguimiento/nuevo` — captura rápida |
| Nutriólogo | `/nutriologo/pacientes/[id]/seguimiento/importar` — Excel con preview |
| Nutriólogo | `/nutriologo/pacientes/[id]/seguimiento/analisis` |
| Paciente | `/paciente/progreso` — solo lectura, datos aprobados |

## Cómo cargar seguimiento

### Importar Excel (recomendado para historial)

1. Perfil del paciente → **Seguimiento** → **Importar Excel**
2. Sube `plantilla_seguimiento_nutricional_equivalente.xlsx`
3. Revisa preview y confirma importación

Ver [PROGRESS_EXCEL_IMPORT.md](PROGRESS_EXCEL_IMPORT.md).

### Captura manual

1. Perfil del paciente → **Seguimiento**
2. **+ Captura rápida** — solo fecha + peso + medidas disponibles
3. En la tabla de check-ins: **Editar**, **Borrar**, **Visible pac.** / **Ocultar pac.**
4. Composición corporal en sección opcional colapsable

## Seed demo

```bash
psql $DATABASE_URL -f supabase/seed-demo-progress.sql
```

Paciente: `paciente@equivalente.local` — 6 check-ins y 4 registros de composición **ficticios demo**, claramente marcados. Los números del formato en papel real no se cargaron automáticamente por ambigüedad del manuscrito.

## Privacidad

- Admin: acceso total
- Nutriólogo: solo pacientes asignados
- Paciente: lectura de check-ins/composición; análisis IA solo si `visible_to_patient=true`
- Paciente **no** puede crear ni editar mediciones clínicas ni análisis

Ver [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

## IA

Ver [AI_PROGRESS_ANALYSIS.md](AI_PROGRESS_ANALYSIS.md).
