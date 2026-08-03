# Seguridad y privacidad

## Autenticación

- Supabase Auth (email/password)
- Sesión en cookies httpOnly via `@supabase/ssr`
- Middleware valida sesión en cada request protegido

## Autorización

- Rol almacenado en `profiles.role`
- Verificado en middleware, layouts y server actions
- **Nunca** confiar en rol enviado desde cliente

## Row Level Security (RLS)

| Recurso | Admin | Nutriólogo | Paciente |
|---------|-------|------------|----------|
| profiles | own + all | own | own |
| patients | all | assigned | self |
| diet_plans | all | assigned | read own |
| generated_menus | all | assigned | own |
| manual_ai_sessions | all | assigned + own | own |
| ai_generation_logs | all | assigned patients | — |
| app_settings | all | — | — |

## Datos clínicos

- Paciente **no puede** modificar dieta base, equivalencias oficiales ni objetivos
- Paciente **no puede** aprobar menús clínicamente
- Menús de paciente quedan en `pending_review`

## IA y privacidad

- Modo manual: datos van a ChatGPT solo si el usuario los pega manualmente
- Modo API futuro: datos procesados server-side con logs auditables
- **Ollama local (piloto):** admin/nutriólogo vía `/admin/ia-local` o `/nutriologo/ia-local`; contextual usa datos acotados del paciente (sin historial/logs)
- Pacientes **no** tienen acceso a IA local contextual todavía
- Borradores de IA local se guardan en `generated_menus` con status `draft` o `pending_review`; **nunca** `approved` automático
- Borradores con `source: ollama_local_contextual` **no** se muestran al paciente hasta aprobación explícita de nutrióloga
- JSON técnico/debug solo visible a admin/nutriólogo en detalle de menú
- **Seguimiento nutricional:** tablas `patient_baseline_profiles`, `nutrition_checkins`, `body_composition_entries`, `progress_adherence_notes`, `progress_ai_analyses`, `progress_edit_audit_log`
- Importación Excel: solo admin/nutriólogo (server-side); paciente no importa
- Paciente lee solo registros con `visible_to_patient=true` e `is_deleted=false`
- Soft delete en check-ins/composición/adherencia; cambios registrados en audit log
- Paciente lee check-ins/composición propios; análisis IA solo si `visible_to_patient=true`
- Paciente no inserta/actualiza mediciones clínicas ni análisis de progreso
- No se almacena teléfono en módulo de seguimiento
- No se almacenan credenciales de ChatGPT

## Variables sensibles

- `OPENAI_API_KEY` — solo servidor, nunca `NEXT_PUBLIC_`
- `OLLAMA_BASE_URL`, modelos Ollama — solo servidor
- Supabase service role — no incluida en frontend

## Disclaimer

Visible en la app:

> Equivalente no reemplaza atención nutricional profesional. Las opciones son variaciones equivalentes basadas en la dieta y reglas configuradas por tu nutriólogo.
