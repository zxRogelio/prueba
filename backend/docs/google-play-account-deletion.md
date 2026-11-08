# Eliminación de cuentas y revisión administrativa

Preparación local del 8 de noviembre de 2026. No se aplicaron migraciones a Neon ni se desplegó código. La aprobación de conservación sigue pendiente. Este documento sustituye, para el nuevo procedimiento, las limitaciones de la sección de cancelación de `actividad6-arco-backend.md`.

## Contratos y acceso

Se reutilizan la solicitud, reautenticación, consentimiento, perfil y preferencias ARCO. No existe una ruta que elimine una cuenta con un correo.

| Ruta | Acceso y comportamiento |
| --- | --- |
| `GET /api/privacy/capabilities` | Público; contrato 2 con `databaseReady=true` tras comprobar metadatos del esquema, índice único y trigger inmutable habilitado. Ausencia o error: 503 `PRIVACY_SCHEMA_NOT_READY` y `databaseReady=false`. Sin usuarios ni contenido de políticas. |
| `GET /api/user/account-cancellation-requests` | Sesión vigente; últimos 50 folios propios, ordenados de más reciente a más antiguo. Recuperación entre instalaciones/sesiones sin copiar credenciales. |
| `GET /api/user/account-cancellation-requests/:requestId` | Solo titular; folio ajeno e inexistente responden el mismo 404. |
| `GET /api/admin/account-cancellation-requests?status=pending_review&page=1` | Administrador persistido; 50 registros por página, `hasMore`. |
| `GET /api/admin/account-cancellation-requests/:requestId` | Administrador; estado, versión, referencias acotadas a obligaciones y auditoría. No devuelve objetos financieros completos. |
| `POST /api/admin/account-cancellation-requests/:requestId/decisions` | Sesión administrativa revalidada dentro de la transacción. Prohíbe autorrevisión. Cabecera `Idempotency-Key: UUID`; cuerpo `{ status, version, reasonCode }`. |

No se usan roles del cuerpo ni del JWT para autorizar administradores: se consulta el usuario almacenado. Respuestas privadas `no-store`; diagnósticos de SQL/proveedor nunca se reflejan en errores HTTP. `reasonCode` es un código de motivo en mayúsculas, no un campo de notas personales o fundamentos legales.

La comprobación de capacidades es solo una lectura; no migra ni repara objetos. Su disponibilidad no acredita aprobación legal ni habilita la ejecución de bajas. El preflight de producción exige también `cancellationStatusLookup`, `googleEmailStepUp` y `deletionRequiresApprovedPolicy`. La consulta de metadatos nueva requiere validación en el entorno aislado autorizado antes del despliegue; durante esta auditoría no se ejecutaron migraciones.

## Estados y auditoría

```
pending_review -> under_review -> awaiting_policy -> under_review
                            \-> rejected
                            \-> completed (compuertas de aprobación y operación)
awaiting_policy -> rejected | completed (mismas compuertas)
```

`rejected` y `completed` son terminales. Mientras exista un folio en cualquiera de los tres estados abiertos, no se admite una segunda solicitud abierta. El índice parcial PostgreSQL respalda esta regla.

Cada decisión bloquea la fila, verifica la versión y registra `AccountCancellationEvents` en la misma transacción. La base rechaza UPDATE/DELETE de eventos; una finalización conserva identificador y SHA-256 de la política aplicada. La misma clave/comando no genera otro evento; reutilizar una clave con otro comando produce 409. Dos decisiones con la misma versión no pueden sobrescribirse. Un fallo de auditoría revierte también estado, seudonimización y revocaciones.

## Operación administrativa

1. Abrir `/admin/solicitudes-eliminacion` con cuenta administrativa autorizada y seleccionar el folio. Pasarlo a revisión con el motivo correspondiente.
2. Revisar referencias de membresías, pedidos y pagos en sus módulos existentes. El detalle muestra hasta 100 referencias por categoría y el total. No cancelar membresías, reembolsar pagos o cambiar pedidos automáticamente para desbloquear una baja.
3. Usar `awaiting_policy` mientras falte aprobación. Un rechazo requiere una decisión real del responsable; el código no selecciona motivos por defecto.
4. Solo considerar una finalización después de aprobar el alcance por categoría, preparar el procedimiento operativo y ensayarlo sobre datos sintéticos aislados. En esta tarea **no se habilita una finalización en producción**.
5. Tras una respuesta incierta, reintentar exactamente la misma decisión/clave o revisar la auditoría. La interfaz conserva el comando incierto y bloquea cambiar de folio hasta resolverlo.

## Política y límites del ejecutor v1

No se distribuye una política aprobada. Sin `ACCOUNT_DELETION_POLICY_JSON`, finalizar responde `409 RETENTION_POLICY_PENDING_APPROVAL`. Una aprobación enviada por HTTP se rechaza como campo desconocido.

Una política debe provenir del responsable, tener `status=approved`, identificador, aprobador, fechas de aprobación/vigencia y coincidir byte a byte con `ACCOUNT_DELETION_POLICY_SHA256`. El hash identifica el documento configurado; no sustituye la evidencia de su aprobación. No incluir sus valores en Git ni copiar las políticas sintéticas de pruebas.

El ejecutor `identity-profile-v1` soporta exclusivamente:

- `identity=pseudonymize`: sustituye el correo de login por un identificador sin buzón y limpia contraseña, identidad del proveedor, OTP y secretos de autenticación. Conserva la clave y los vínculos internos: no es anonimización irreversible de todo el expediente.
- `personalData=erase`: limpia nombre/teléfono de identidad personal y del perfil de entrenador. Conserva la clave interna del usuario y las relaciones.
- Reglas explícitas `retain`, con motivo aprobado y `retainUntil` vigente, para **cada** categoría: `payment_records`, `orders_and_receipts`, `memberships_and_history`, `security_and_audit`, `backups`, `health_and_training`, `addresses_and_delivery`, `analytics_and_exports`, `media_and_provider_data`.

Una política que exija borrar otras categorías necesita otro ejecutor revisado; el v1 rechaza acciones/coberturas incompatibles. No hay borrado global de usuarios, cascadas, escrituras financieras, llamadas de reembolso ni borrado de Cloudinary. No se afirma que conservar todos esos datos resulte legalmente apropiado. El responsable debe decidirlo y puede exigir un alcance distinto, bloqueando este ejecutor.

Además se exige `ACCOUNT_DELETION_EXECUTION_ENABLED=true`, desactivado por ausencia. La aprobación documental no habilita esa compuerta operativa. Antes de habilitarla se requiere un procedimiento que controle operaciones en curso, escrituras concurrentes de los módulos heredados y proveedores, notificación de resolución, respaldos y vencimiento de retenciones. Esta preparación no autoriza activar la variable en Neon Primary/Render.

El v1 bloquea finalización con membresías distintas de `expired/cancelled`, pedidos distintos de `cancelled/refunded` o pagos fuera de estados terminales soportados. Es deliberadamente conservador: pedidos pagados/entregados y otros casos necesitan revisar el ejecutor, sin alterar las finanzas para sortear la compuerta. Las lecturas de dependencias no sustituyen un procedimiento operativo que detenga y reconcilie escrituras en curso.

Una finalización válida revoca todas las sesiones, consume retos/pruebas y marca QR como usados, junto con `Users.deletionCompletedAt`. Los middleware y la emisión de sesiones bloquean esa cuenta; QR revalida también al propietario. Se conserva auditoría y trazabilidad referencial.

El titular consulta estados mientras tenga sesión válida. Al finalizar y revocar sesiones, esa vía devuelve 401: la entrega de la resolución final debe hacerse por el procedimiento verificado del responsable. No se abre una consulta pública de folios que revele datos de personas.

## Google y página pública

`/eliminar-cuenta` funciona desde navegador sin instalar la aplicación. Usa el login existente, contraseña y factores ARCO nuevos, confirmación textual, clave idempotente y folio. La sección de privacidad enlaza esta página. Después de ciertos flujos de Google/segundo factor, el usuario vuelve a esta página; no se modifica el login existente.

Para una cuenta Google sin contraseña local se admite `POST /api/auth/reauthenticate` con `{ purpose: 'account-cancellation', method: 'google-email' }` únicamente desde una sesión cuyo JWT fue emitido con login Google, con proveedor/sub identificados y cuenta verificada. No acepta email/ID en el cuerpo. Exige un reto nuevo de correo, o el TOTP configurado; se reutilizan límites, caducidad, intentos, uso único y vínculo a sesión/credenciales. No equivale a reutilizar el OTP de login ni a aceptar un ID token proporcionado por el navegador. Un cambio de sub invalida la prueba. Las cuentas locales conservan contraseña y factores previos.

## Migración y pruebas

`20261108000100-account-cancellation-review.js` añade `Users.deletionCompletedAt`, revisión/versiones, estados abiertos e índices, y eventos con FKs `RESTRICT`. El rollback se niega a perder decisiones, estados procesados o cuentas ya deshabilitadas. No cambia importes ni elimina relaciones.

El ensayo PostgreSQL usa el lanzador existente `npm.cmd run verify:privacy:postgres`: crea otro clúster y base `titanium_arco_test`, exclusivamente en loopback, sin cargar `.env`. Incluye `up/down/up`, HTTP y concurrencia reales. Los fixtures de dominio financiero son mínimos; no certifican el esquema completo de producción. Las pruebas VM cubren también finalización con una política **sintética**, sin servicios externos. Consultar resultados finales en `../../docs/google-play-implementation.md`.

Antes de cualquier despliegue futuro: revisión del diff, aprobación de migración, ensayo con esquema completo aislado, permisos runtime mínimos y plan de compatibilidad/rollback. No ejecutar aquí el runner normal contra `.env`.

[Requisito de eliminación de Google Play](https://support.google.com/googleplay/android-developer/answer/13327111): se necesita un camino dentro de la app y un recurso web. Recibir solicitudes pendientes o disponer de esta infraestructura no acredita por sí solo cumplimiento ni habilita publicar.
