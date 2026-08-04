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
