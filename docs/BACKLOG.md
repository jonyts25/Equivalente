# Backlog

Ideas documentadas para revisar más adelante. No implica desarrollo inmediato.

## Biblioteca de dietas reutilizables (nutrióloga)

Idea a futuro, NO para desarrollo inmediato — dejar documentada para
revisar más adelante con datos de uso real.

Contexto: actualmente la nutrióloga carga la dieta de cada paciente
manualmente por consulta. En la práctica, una nutrióloga real maneja un
conjunto limitado de dietas base ya armadas (hojas/archivos que reutiliza
y adapta según el paciente), no una dieta distinta desde cero cada vez.

Propuesta:
- Un espacio donde la nutrióloga pueda cargar y mantener una biblioteca de
  dietas base sugeridas (reutilizables entre pacientes).
- Una tabla de equivalencias propia de la nutrióloga, editable por ella,
  no fija por app.
- En el perfil de cada paciente, la nutrióloga captura gustos, no gustos y
  prohibiciones específicas.
- Al asignar una dieta base + las preferencias del paciente, la IA genera
  las variaciones equivalentes personalizadas — evitando que la
  nutrióloga tenga que generar manualmente cada combinación posible por
  paciente.

Potencial a futuro: si este flujo funciona bien para uso personal, existe
la posibilidad de ofrecerlo como herramienta para otras nutriólogas
(ej. consultas reales, no solo uso familiar) — evaluar esto únicamente
después de validar el flujo actual con uso real, no antes.

No crear tablas, componentes ni migraciones para esto todavía — es
únicamente para dejar la idea documentada.

## Modo pareja (dietas conjuntas)

Cuando dos pacientes son pareja y la nutrióloga les da dietas distintas,
poder marcarlos como pareja en el sistema y que la IA sugiera la mejor
alternativa combinada entre ambos, considerando gustos, no gustos y
prohibiciones de los dos. No implementar aún — solo dejar documentado.

## Perfiles de enfermedad / restricciones automáticas

La nutrióloga podría crear perfiles de enfermedad (ej. diabetes,
hipertensión) con una lista de alimentos prohibidos asociada. Al asignar
un perfil de enfermedad a un paciente, las sugerencias de IA deben excluir
automáticamente esos alimentos, sin que la nutrióloga tenga que repetir
la restricción manualmente cada vez.

## Control de acceso y cobro por nutrióloga

La nutrióloga es quien da y revoca acceso a sus pacientes a la app (no el
paciente se auto-registra libremente). Ella cobraría un costo adicional
por el uso de la plataforma, que se repartiría con el negocio. Implica
un estado de "activo/inactivo" por paciente controlado por la nutrióloga,
separado del estado clínico del paciente.

## Dashboard de administración (multi-nutrióloga)

Como admin, dar de alta nuevas nutriólogas. Cada nutrióloga da de alta y
activa a sus propios pacientes. El admin necesita un dashboard mensual
con: cuántos pacientes activos tiene cada nutrióloga, cuántos están usando
la plataforma activamente — esta información es la base para facturarle
a cada nutrióloga a fin de mes.

## Dashboard de cobros para la nutrióloga

La nutrióloga necesita su propio dashboard para llevar control de qué
pacientes le han pagado y cuáles no — en el gremio es común que un
paciente tenga varias citas y liquide el pago tiempo después, no siempre
en el momento.

## Revisión de flujos Nutrióloga vs Paciente

Pendiente: revisar a detalle qué debe ver y poder hacer cada rol
(nutrióloga vs paciente) antes de escalar a más de un consultorio. No es
una feature puntual, es una auditoría de permisos y pantallas existentes.

## Migración de dietas desde archivo (Docs/PDF/OCR)

Para la biblioteca de dietas de la nutrióloga: permitir cargar dietas
existentes desde Word, PDF, o fotos con OCR, en vez de solo texto pegado
a mano. Depende de que la biblioteca de dietas (sección anterior) ya
exista.

No crear tablas, componentes, ni migraciones para nada de esto todavía —
es únicamente documentación para revisar más adelante.

## Notificaciones push (recordatorios de comidas)

Requiere que la app esté instalada como PWA para habilitar push. No
implementar aún — solo documentar posibles tipos de notificación:

1. Recordatorio simple por horario: si el paciente registró que
   normalmente cena a cierta hora, mandar una notificación ~1 hora antes
   recordando qué le toca cenar ese día según su menú aprobado.
2. Confirmación de lista de super: si el paciente marca que ya compró lo
   de la lista del súper, la app puede sugerir qué preparar con lo que ya
   tiene.
3. Alternativa más simple al punto 2: mandar el recordatorio de todos
   modos aunque no haya confirmación de compra, solo como recordatorio
   pasivo.

Fuera de alcance explícitamente: integración con refrigeradores
inteligentes o cualquier hardware IoT — mencionado como idea pero
descartado por ahora.

No crear tablas, componentes, service workers ni nada de push todavía —
solo documentación.

## Responsabilidad del usuario en flujo manual ChatGPT

Cuando el paciente usa el flujo de IA manual con ChatGPT (prompt generado
en la app → copia → ChatGPT → pega respuesta) y genera o sigue una dieta /
menú autogenerado fuera de la app sin que esa propuesta haya sido
revisada y aprobada por su nutriólogo(a), el usuario es responsable de
los resultados de actuar sin supervisión profesional.

Pendiente revisar bien: copy legal/disclaimer en UI, cuándo se muestra,
y cómo se relaciona con menús pendientes vs aprobados. No implementar
aún — solo dejar documentado.
