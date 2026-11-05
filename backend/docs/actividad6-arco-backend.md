# Actividad 6: derechos ARCO y consentimiento explícito

## Alcance y decisiones detenidas

Implementación preparada en `feature/actividad6-arco-backend`, sobre `998b5cd`,
coincidente con `main` remoto al verificar la base. Se leyó el documento móvil
`pry-app-tsg/docs/actividad6-arco-consentimiento.md`, especialmente desde su línea
154. No se modificó ese repositorio, ni se ejecutaron commit, push o merge.

**Esto implementa operaciones del servidor; no acredita por sí solo que el
criterio esté completado en el despliegue o que exista cumplimiento legal integral.**
Estas decisiones se detuvieron sin escoger políticas de negocio:

1. **Aviso aprobado:** falta confirmar documento, versión, hash y finalidades.
   El servicio no inventa una versión del texto estático de septiembre de 2025.
   Sin configuración aprobada, consultar/aceptar el aviso devuelve
   `503 PRIVACY_NOTICE_UNAVAILABLE`. Alternativas: aprobar y publicar un aviso
   inmutable, o conservar temporalmente la atención ARCO manual. No se activó
   ninguna configuración de producción.
2. **Registro obligatorio y compatibilidad:** el web actual no envía evidencia.
   `PRIVACY_REQUIRE_REGISTRATION_CONSENT=false` mantiene el registro existente;
   un alta sin `privacyConsent` no genera recibo ni se considera aceptada.
   Alternativas: actualizar primero web/móvil y activar la exigencia para todos,
   o mantener esta transición explícita. No activar el flag sin adaptar clientes.
3. **Cancelación efectiva y conservación:** únicamente se recibe una solicitud
   `pending_review`. Falta decidir eliminación, anonimización, bloqueo, plazos,
   fundamento y responsable por categoría, incluyendo respaldos, membresías,
   obligaciones, reembolsos, auditoría y archivos derivados/exportaciones.
   No se añadió un ejecutor de bajas ni una ruta administrativa para resolverlas.
   Una implementación posterior deberá revocar sesiones/JWT/accesos, revisar
   activos y saldos, aplicar la política aprobada y comunicar la resolución.
4. **Google sin contraseña local:** `409 REAUTHENTICATION_METHOD_UNAVAILABLE`.
   Alternativas: implementar OAuth fresco con estado, PKCE, nonce y validación de
   identidad/frescura, o acordar otro procedimiento de identidad. Mientras tanto,
   el cliente debe presentar el canal ARCO manual. Un login Google anterior no
   autoriza la solicitud automatizada. Una cuenta vinculada que sí tiene
   contraseña local puede usar esa contraseña y los factores locales configurados.

## Revisión del backend y reutilización

| Existente | Uso y compatibilidad |
| --- | --- |
| `core.Users` | Identidad, rol, bcrypt y factores. Sin columnas nuevas ni aceptación retroactiva. |
| `core.TrainerProfiles` | Fuente única de nombre/teléfono de entrenadores. El nuevo PATCH conserva especialidad, foto y demás campos profesionales. |
| `core.UserProfiles`, historial de peso/calorías | El contrato físico/deportivo continúa separado de la identidad. No se captura salud adicional. |
| `GET /api/user/profile` | Se amplía la única ruta existente: conserva `id`, `email`, `rol`, `authMethod`, `provider`, `loginMethod`; añade nombre, teléfono, fecha, versión y ETag. |
| `GET/PUT /api/trainer/profile` | Se conservan URLs y respuesta `{ profile }`/`{ message, profile }`, incluidos strings vacíos para campos opcionales y multipart con foto. PUT comparte bloqueo con PATCH. |
| `GET/PUT /api/profile/me` y sus historiales | Mismos contratos; ahora comprueban también sesión persistida, propietario, vencimiento y blacklist. |
| JWT, `core.sessions`, blacklist y roles | Middleware ARCO usa los mismos JWT/sesiones y roles almacenados; exige que token y fila de sesión correspondan al usuario. Los tres roles pueden operar solo sus datos. |
| Brevo | Solo se encontraron envíos transaccionales de seguridad/cuenta. El nuevo OTP ARCO usa un correo específico, sin logs de destinatario/código. |

El middleware heredado `requireAuth` verificaba solo JWT/usuario, y `verifyToken`
no comprobaba que `session.userId` coincidiera con el JWT. Las rutas de perfil
reutilizadas y las nuevas operaciones ahora comprueban esa relación, sesión y
blacklist. No se cambió la autenticación de checkout, webhooks o pagos.

Se revisaron `models/index.js`, modelos y migraciones de órdenes, pagos,
membresías e historial. `Orders.userId`, `SubscriptionHistories.userId` y
`SubscriptionEvents.userId` tienen restricciones de eliminación; historial
también referencia membresía/plan con `RESTRICT`. Los enlaces de pagos a órdenes
e historial tienen `SET NULL` en algunos casos. Perfiles deportivos y otras
relaciones tienen cascadas; un borrado genérico de usuario no es una baja segura.
La nueva operación no actualiza ni elimina ninguno de estos registros.
Esta revisión fue de código: no se inspeccionaron restricciones reales de Neon.

## Contratos implementados

Todas las rutas privadas exigen `Authorization: Bearer <JWT>` con sesión vigente;
no aceptan IDs de usuario en el cuerpo. Se envía `Cache-Control: no-store`.
Los errores de dominio usan `{ code, error, fields? }`, sin cuerpo recibido,
SQL, secretos ni diagnósticos del proveedor. Una falla de infraestructura devuelve
503; las sesiones inválidas devuelven 401.
Los errores del parser JSON también se responden de forma genérica (400/413),
antes de que el logger predeterminado de Express pueda imprimir fragmentos del cuerpo.

### Aviso y consentimiento

`GET /api/privacy/notice` es público. Devuelve:

```json
{
  "noticeId": "privacy-notice",
  "version": "<versión aprobada>",
  "contentSha256": "<64 hex minúsculas>",
  "documentUrl": "<HTTPS del documento inmutable>",
  "requiredForRegistration": false
}
```

Configurar, después de aprobar el documento, `PRIVACY_NOTICE_VERSION`,
`PRIVACY_NOTICE_SHA256` y `PRIVACY_NOTICE_URL`. El hash debe calcularse sobre los
bytes del documento aprobado; la configuración es del servidor, no del cliente.
No reutilizar una versión para otro contenido. Este servicio no hospeda ni
reescribe el aviso y no descarga su URL en cada petición.

`POST /api/auth/register` se extiende con este campo opcional durante la transición:

```json
{
  "email": "persona@example.com",
  "password": "<contraseña>",
  "client": "mobile",
  "privacyConsent": { "noticeId": "privacy-notice", "version": "<versión>", "accepted": true }
}
```

Cuenta y evidencia se escriben en una sola transacción. El 201 mantiene `message`
y añade `privacyConsent: { receiptId, noticeId, version, contentSha256, documentUrl,
acceptedAt, revokedAt }` únicamente cuando hubo aceptación explícita persistida.
La fecha, usuario, fuente y hash los fija el servidor. Con la exigencia activada,
falta/negativa devuelve `422 CONSENT_REQUIRED`; versión antigua devuelve
`409 NOTICE_VERSION_CHANGED`. Incluso durante la transición, un consentimiento
enviado debe ser válido. Registro público solo permite `role: "cliente"`;
no puede otorgar rol administrativo ni crear entrenadores por esa vía.

`GET /api/user/privacy-consents` devuelve `{ consents: [...] }` solo del titular.
Una cuenta anterior, creada por Google o dada de alta por un administrador no
obtiene consentimiento automáticamente. `POST /api/user/privacy-consents`, con
el objeto `{ noticeId, version, accepted: true }`, permite que su titular acepte
el aviso después de iniciar sesión. Devuelve 201 con el recibo; repetir la misma
versión/hash devuelve la misma evidencia. No implica permiso de promociones.
No se implementa revocación automática ni se presenta una solicitud de
cancelación como revocación ya resuelta.

### Acceso y rectificación

`GET /api/user/profile` devuelve identidad propia y `fullName`, `phone`,
`updatedAt`, `version`. Campos personales ausentes son `null`. No incluye
contraseñas, OTP, secretos TOTP, tokens ni IDs del proveedor. No es una exportación
completa del expediente financiero/deportivo: esos módulos conservan sus rutas
propias y autorización existente.

`version` es un **string opaco**, no el entero sugerido originalmente. Su cabecera
ETag es `"<version>"`. `PATCH /api/user/profile` exige `If-Match` con el valor
exacto recibido y acepta únicamente `fullName` (máx. 160) y `phone` (máx. 30):

```json
{ "fullName": "Nombre corregido", "phone": null }
```

Omitir un campo lo preserva; `null`/string vacío lo limpia. Nombre admite Unicode
y rechaza controles/markup; teléfono admite dígitos, espacios, `+` inicial,
paréntesis, puntos y guiones. No admite correo, ID, rol ni datos de autenticación.
Respuesta 200 `{ id, fullName, phone, updatedAt, version }` con ETag nuevo;
422 con errores por campo, 428 si falta precondición y 412 si cambió el perfil.
El móvil debe conservar ETag entre GET/PATCH y recargar ante conflicto.
CORS expone ETag al navegador.

El PUT de entrenador mantiene su semántica previa de formulario completo;
no obtiene control de concurrencia obligatorio para conservar compatibilidad.
Su escritura cambia el ETag que observa el nuevo PATCH. Puede seguir habiendo
sobrescritura si dos clientes usan el PUT heredado con formularios antiguos;
el móvil debería migrar la identidad al PATCH parcial.

### Oposición

`GET /api/user/privacy-preferences`:

```json
{
  "version": 1,
  "preferences": [
    { "purpose": "promotional_communications", "optOut": null, "updatedAt": null },
    { "purpose": "satisfaction_surveys", "optOut": null, "updatedAt": null }
  ]
}
```

`PATCH /api/user/privacy-preferences` acepta `{ version: 1, preferences: [
{ purpose: "promotional_communications", optOut: true }] }`. Devuelve el estado
persistido con versión incremental y fecha servidor. `true` es oposición;
`false` es una elección expresa de no oposición, **no un consentimiento
publicitario independiente**. `null` significa sin elección y no habilita envíos.
Campos/finalidades desconocidas o repetidas y tipos incorrectos devuelven 422;
versión antigua devuelve 409. Los cambios generan eventos de auditoría atómicos.

No se encontró un emisor de promociones o encuestas que hubiera que modificar.
Los correos indispensables de autenticación continúan funcionando. Un futuro
emisor opcional debe usar `maySendOptionalCommunication()` y aportar una
autorización/fundamento aprobados por separado: el guard devuelve false sin ese
requisito o si hay oposición/sin elección. No se exponen parámetros HTTP para
declarar esa autorización. No se amplían finalidades ni se modifica la analítica
existente; su fundamento y política de datos derivados requieren revisión.

### Reautenticación y cancelación

`POST /api/auth/reauthenticate` requiere sesión y:

```json
{ "purpose": "account-cancellation", "method": "password", "password": "<actual>" }
```

La cuenta debe estar verificada y haber completado el cambio inicial obligatorio.
Con método normal devuelve 200 `{ reauthenticationToken, expiresAt }`.
Con OTP/confirm-link exige contraseña **y después un OTP ARCO nuevo**, separado
del código/enlace de login. Con TOTP exige contraseña y un intervalo del
autenticador posterior al inicio del reto. En ambos casos devuelve
202 `{ challengeId, method, expiresAt, notBefore? }`, todavía sin prueba.

`POST /api/auth/reauthenticate/verify` acepta `{ challengeId, code }` y devuelve
200 con la prueba únicamente al completar factores. A diferencia de la propuesta
móvil, `method: "otp"/"totp"` por sí solos no inician el trámite: el primer paso
de una cuenta local siempre verifica su contraseña. El TOTP debe esperar
`notBefore`; el cliente no debe anunciar que una prueba existe al recibir 202.

Retos y pruebas caducan a los 5 minutos y son de un solo uso. Un reto permite
5 intentos y se limita a 3 retos por cuenta en 5 minutos en la BD. Límite HTTP
compartido de inicio/verificación: 10 intentos por usuario en 15 minutos; además
hay límite por IP. El OTP se almacena con HMAC y nonce; la prueba se almacena
como SHA-256. No se reutilizan ni modifican OTP/enlaces del login. Cambiar
credenciales/factores invalida las pruebas emitidas. Son específicas de usuario,
sesión y propósito, y se vuelve a comprobar la sesión dentro de la transacción.

`POST /api/user/account-cancellation-requests` exige la prueba y
`Idempotency-Key: <UUID>`:

```json
{ "confirmation": "SOLICITAR CANCELACIÓN", "reauthenticationToken": "<prueba>" }
```

Devuelve 202 solo después de persistir `{ requestId, status: "pending_review",
createdAt, resolvedAt: null, membershipImpact: { requiresReview: true },
retentionSummary }`. Cada categoría de conservación se presenta explícitamente
como `{ category, policyStatus: "pending_approval", reason: null, retainUntil:
null }`: no es un fundamento/plazo ya aprobado. La cuenta y las membresías siguen
activas mientras la solicitud espera revisión. No hay borrado ni revocación de
sesiones por el mero hecho de solicitarla.

La misma clave y cuerpo devuelve el mismo folio aun después de consumir la
prueba; otro cuerpo con esa clave devuelve 409. No puede haber dos solicitudes
pendientes por cuenta. La prueba se consume en la misma transacción que crea el
folio: un fallo revierte ambos cambios. Prueba ausente/inválida/vencida/ajena:
403; confirmación incorrecta: 422; conflicto o solicitud previa pendiente: 409.

`GET /api/user/account-cancellation-requests/:requestId` solo consulta folios
propios. Un UUID inexistente o ajeno devuelve el mismo 404.

## Migración y despliegue

`20261104000100-create-arco-privacy.js` sigue el runner Sequelize existente
(`up/down({ sequelize, transaction })`) y crea únicamente tablas nuevas en `core`:

- `UserPersonalDatas`: identidad de cliente/administrador; entrenador sigue en su tabla.
- `PrivacyConsents`: evidencia de aceptación y documento.
- `PrivacyPreferences`, `PrivacyPreferenceEvents`: elección actual y trazabilidad.
- `ReauthenticationChallenges`, `ReauthenticationProofs`: retos/pruebas ligados a sesión.
- `AccountCancellationRequests`: folios, idempotencia y estado pendiente.

No se rellena consentimiento histórico ni se modifican tablas financieras. FKs
a usuarios/sesiones usan `RESTRICT`. Índices únicos protegen evidencia, claves
idempotentes y una sola solicitud pendiente. El rollback toma bloqueos exclusivos
y rechaza eliminar tablas cuando existe cualquier dato/evidencia.

No se ejecutó el runner normal ni se conectó con Neon. Antes de desplegar:
revisar permisos mínimos del rol runtime sobre las tablas nuevas y probar en una
base de pruebas autorizada. Aplicar la migración aprobada antes del código que
consulta estas tablas. No confiar en `sync()` ni añadir DDL al arranque. Una baja
futura deberá diseñar la conservación de estas evidencias y de sesiones referidas
por FK; no añadir cascadas para sortear restricciones.

## Pruebas y límites de evidencia

Las pruebas VM usan el código real de servicios, validadores, controladores,
rutas, JWT, bcrypt y TOTP, con persistencia/correo simulados. Las de PostgreSQL
ejecutan la migración y modelos de privacidad reales en un clúster nuevo limitado
a `127.0.0.1`, sin cargar `.env`. Las tablas previas de dominio en esa prueba son
fixtures mínimos, no una copia completa del esquema de producción. Los correos
se simulan; no se envió ninguno real ni se llamó a Google/Mercado Pago/Render.

```powershell
cd backend
npm.cmd run test:privacy
npm.cmd test
# Usar una instalación local de binarios PostgreSQL; crea y detiene su propio clúster.
$env:ARCO_TEST_POSTGRES_BIN = 'C:\ruta\postgresql\bin'
npm.cmd run verify:privacy:postgres
```

También existe `test:privacy:postgres` para una base **desechable nueva**, llamada
`titanium_arco_test`, con `ARCO_TEST_DATABASE_URL` explícita y
`ARCO_TEST_ALLOW_LOCAL_DDL=true`. Rechaza hosts remotos, nombres distintos,
parámetros que alteren conexión y un schema `core` preexistente. Limpia solo el
schema sintético que creó; el runner detiene su clúster y preserva los artefactos
sintéticos en una carpeta temporal para diagnóstico.

Resultados locales:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run test:privacy` | 45 pruebas aprobadas, incluye seguridad del destino PostgreSQL y pruebas HTTP. |
| `npm.cmd test` | 405 pruebas aprobadas, incluidas las de privacidad; sin fallos. |
| `npm.cmd run verify:privacy:postgres` | 9 pruebas aprobadas (una principal y ocho subpruebas), sin omisiones. |
| Sintaxis Node de JS nuevo/modificado y `git diff --check` | Aprobados. |

Se comprueban los cinco
ámbitos ARCO, acceso sin sesión/ajeno, campos protegidos, Google sin prueba,
OTP/TOTP frescos, vencimiento, reuso, cambios de credenciales, aislamiento,
concurrencia, idempotencia, rollback y conservación de finanzas/membresías.

Pendiente de validación de despliegue: migración con permisos reales en staging,
correo Brevo real con cuenta de prueba y punta a punta web/móvil. El limitador
HTTP usa memoria como los existentes: un despliegue con varias réplicas necesita
un almacén compartido para mantener su cuota global; los intentos/consumo del reto
y su límite de emisión sí se persisten en PostgreSQL.
