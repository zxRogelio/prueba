# Diagnóstico y reconciliación de Checkout Pro

La confirmación procede exclusivamente de una consulta autenticada a Mercado Pago.
La redirección del navegador no confirma pagos. El webhook mantiene la validación HMAC
y la tolerancia de timestamp existente, tanto para segundos como para milisegundos.
El manifiesto usa `data.id` de la URL (en minúsculas), `x-request-id` y el `ts` recibido;
los campos ausentes se omiten según las reglas del SDK oficial. Un webhook sin firma
válida, incluidas notificaciones IPN sin firma, no confirma nada.

## Diagnóstico de una operación pendiente (anonimizado)

La investigación de solo lectura encontró:

- Orden y pago local identificados privadamente; pago pendiente y sin recibo.
- Operación Mercado Pago aprobada, con importe MXN coincidente con la orden.
- El token local consultado pertenece al mismo vendedor que `collector_id`.
- Eventos con `SignatureMismatch`, con timestamps dentro de la tolerancia.
- El `internal_error` autenticado localizado pertenece a una operación sintética.
- El usuario conserva una membresía anual vigente.

Esto no comprueba el secreto ni el token desplegados en Render. Comparar privadamente
el secreto de Webhooks de la aplicación correcta con la configuración desplegada.
No copiar firmas, tokens ni secretos a logs o tickets. No sustituir el secreto por
el Access Token. La firma original no está almacenada, por lo que no es posible
recalcular retrospectivamente el HMAC de esos eventos.

## Uso administrativo

Desde `backend`, la vista previa consulta el proveedor y los registros locales sin
actualizar registros, crear eventos ni ejecutar los servicios de confirmación:

```powershell
node scripts/reconcileMercadoPagoPayment.js --order-id UUID_ORDEN_REVISADA --provider-payment-id ID_OPERACION_REVISADA
```

Tanto la vista previa como la aplicación requieren una política configurada por el
responsable del entorno. No se modificaron `.env`, credenciales ni conexiones:

| Configuración nueva, no secreta | Significado |
| --- | --- |
| `MERCADOPAGO_EXPECTED_SELLER_ID` | ID de la cuenta Titanium verificado independientemente. |
| `MERCADOPAGO_EXPECTED_LIVE_MODE` | Literal `true` o `false`, nunca inferido del prefijo del token. |
| `MERCADOPAGO_RECONCILIATION_ENVIRONMENT` | Destino autorizado: `test` o `production`; se combina con la política de cuenta y recurso. |
| `MERCADOPAGO_RECONCILIATION_PAYMENT_MODE` | `sandbox`, `checkout_pro_test_account` o `production`. Sin configurar conserva `sandbox` en `test` y `production` en producción. |
| `MERCADOPAGO_RECONCILIATION_DATABASE_ID` | SHA-256 del host, puerto, base, usuario y esquema efectivos de Sequelize. |

Si falta esta política o no coincide el destino, se rechaza la reconciliación antes
de consultar al proveedor. La rama Git y `NODE_ENV` no identifican una base de Neon.
El responsable debe contrastar host/base con la rama y proyecto correctos en Neon;
copiar automáticamente la huella del destino actual no acredita que sea el deseado.
La huella excluye contraseña, parámetros de conexión y URL. Se puede obtener sin
consultar PostgreSQL ni Mercado Pago mediante `--show-database-id`; no se ha
ejecutado ese comando durante estos cambios. Cambiar host, rol o pool requiere revisar
y aprobar nuevamente la huella. No se soporta reconciliación con réplicas de lectura
o destinos enrutados a otra rama sin identificar primero el destino efectivo.

### Checkout Pro con vendedores de prueba y `live_mode=true`

La documentación actual de Mercado Pago indica que el vendedor de prueba de Checkout
Pro tiene credenciales de prueba con prefijo `APP_USR`. El material oficial de
certificación también utiliza credenciales productivas de un usuario de prueba y
`init_point` productivo para simular pagos. Por tanto, no se identifica una operación
comercial únicamente por el prefijo del token ni por el modo técnico del recurso.
Esta documentación respalda el flujo; no garantiza que todos los pagos simulados
devuelvan `live_mode=true`. El valor informado para la operación investigada procede del
diagnóstico comunicado por el operador; no se consultó ese pago durante estos cambios.

La política distingue estos casos y siempre compara el booleano del pago obtenido
por API con `MERCADOPAGO_EXPECTED_LIVE_MODE` sin conversiones:

| Política | Entorno Titanium | `live_mode` esperado | Cuenta autenticada con el token |
| --- | --- | --- | --- |
| `sandbox` | `test` | `false` | Vendedor autorizado coincidente con `collector_id`. |
| `checkout_pro_test_account` | `test` | `true` | El proveedor debe devolver `tags` con `test_user` en `/users/me`. |
| `production` | `production` | `true` | El proveedor debe devolver etiquetas válidas sin `test_user`. |

Para el escenario comunicado del vendedor de prueba verificado, el responsable debe autorizar
explícitamente la política `checkout_pro_test_account`, `test` y el valor esperado
`true`, manteniendo el vendedor fijado y la huella de la rama de pruebas de Neon
verificada independientemente. No se cambiaron las variables de entorno ni las
credenciales. Esta configuración no autoriza `--apply` por sí sola: permanecen la
sesión administrativa, confirmación de orden y destino y todas las validaciones de
importe, moneda, referencia y estado `approved`.

La identidad y las etiquetas se obtienen en la consulta autenticada existente a
`https://api.mercadopago.com/users/me`, usando el mismo token que consulta el pago;
no se aceptan etiquetas introducidas mediante argumentos, nombres, correos o metadata.
El marcador `test_user` está documentado en el recurso oficial de usuarios de Mercado
Libre. Su disponibilidad en la respuesta de Mercado Pago de esta cuenta concreta
queda pendiente de una comprobación autorizada de solo lectura. Si falta ese marcador
o la respuesta no lo acredita, la excepción falla cerrada; no se permite un bypass.
Una cuenta comercial con `live_mode=true` se rechaza en el destino de pruebas y una
cuenta `test_user` se rechaza en producción. Las comprobaciones se repiten al obtener
el pago fresco tras el bloqueo; no se cambia la política de webhooks.

Referencias oficiales:
- [Mercado Pago: cuentas de prueba de Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/test-accounts)
- [Mercado Pago: cambios del flujo de pruebas y credenciales](https://www.mercadopago.com.co/developers/es/news/2024/06/26/Improvements-in-the-integration-testing-flow)
- [Mercado Pago: certificación Checkout Pro, simulación con `init_point`](https://http2.mlstatic.com/frontend-assets/dx-devsite/devprogram/Examen_ES_ChoPRO.pdf)
- [Mercado Libre: consulta autenticada de usuarios y `test_user`](https://developers.mercadolibre.com.mx/servicios-consulta-usuarios)

La aplicación exige autorización operativa previa, `--apply`,
`--confirm-order ID_ORDEN`, `--confirm-database HUELLA_AUTORIZADA` y
`--operator-token-stdin`. El JWT administrativo vigente se suministra mediante una
tubería privada desde una fuente protegida, nunca como argumento de consola,
literal guardado en el historial, archivo versionado o variable de credenciales nueva.
El script rechaza la entrada interactiva visible. La sesión ya debe existir: el
script no inicia sesiones, solicita OTP, cambia contraseñas ni escribe credenciales.
Se verifican firma HS256, expiración, sesión no revocada y vinculada al usuario,
rol actual `administrador`, cuenta verificada y ausencia de aprobación o cambio de
contraseña pendiente. Estas condiciones se vuelven a comprobar dentro de la
transacción y después de consultar al proveedor. `--actor` es opcional y solamente
puede corroborar el ID del operador autenticado; nunca autoriza por sí mismo.
No hay ruta HTTP pública ni ejecución automática de reconciliación. No se ha
ejecutado `--apply` sobre el pago real.

Antes de aplicar se comprueban ID de operación, vendedor esperado, vendedor del token,
`live_mode` booleano y estado estrictamente `approved`. El importe en centavos exactos
debe coincidir en proveedor, pago y orden; los tres deben tener moneda MXN y el usuario
del pago debe coincidir con el de la orden. La referencia externa es obligatoria para
reconciliar y debe identificar exactamente la orden. Se comprueban también las
referencias de metadata y la preferencia cuando el proveedor la devuelve. Si el pago
ya fue confirmado con otra operación, está cancelado, reembolsado o en revisión,
el procedimiento lo rechaza. La transacción vuelve a resolver y bloquear el pago y
la orden para comprobar que siguen correspondiendo a la operación solicitada.

La vista previa utiliza `SET TRANSACTION READ ONLY` y aislamiento `REPEATABLE READ`.
No adquiere bloqueos de actualización, crea eventos ni ejecuta historiales. Muestra
orden, estados, importe, destino autorizado, recibo existente y períodos existentes
y previstos. Consulta también las reglas de transición y pagos duplicados. Las
fechas son orientativas: una compra concurrente puede cambiar la planificación;
al aplicar se devuelve la planificación efectivamente guardada.

Se reutiliza `confirmPaidPayment`, que actualiza orden/pago, activa membresías y crea
el recibo en la misma transacción. Webhook y reconciliación comparten un bloqueo
transaccional por ID de operación de Mercado Pago. Después de esperar ese bloqueo,
la reconciliación vuelve a consultar al proveedor, con consultas de tiempo limitado.
No existe atomicidad distribuida entre PostgreSQL y Mercado Pago: un reembolso
posterior a la consulta necesita el flujo existente de notificaciones/reembolsos.

Los índices únicos declarados y los servicios existentes protegen recibos por pago,
operaciones por proveedor e integrantes individuales por ítem. Debe comprobarse
que estos índices estén efectivamente desplegados; no se ejecutó ningún `sync` ni
migración. El primer registro de `Payment.metadata.reconciliation` se conserva y
`reconciliationHistory` añade cada confirmación/reintento completado, con ID de
intento, operador derivado de su sesión, destino y fecha, sin tokens. `createdBy`
en nuevas membresías y recibos identifica al operador. Los intentos fallidos
autorizados producen logs estructurados sanitizados: sus escrituras se revierten
y no se intenta guardar auditoría parcial dentro de la transacción fallida. Se
requiere retención de esos logs en Render para preservar también los fallos.

La mensual se crea como una suscripción separada que comienza al día siguiente del
vencimiento de la última membresía vigente o futura. No se modifica ni cancela la anual. Se mantiene
la duración configurada en el plan con límites inclusivos: `endsAt = startsAt +
durationDays - 1`. Ejemplo ficticio: 30 días desde el 1 de abril terminan el 30 de abril.
Las suscripciones futuras usan el estado existente `active`; el acceso también
exige que haya llegado `startsAt`. Todas las creaciones del servicio adquieren una
fila `Users FOR UPDATE` antes de leer/calcular períodos, incluso si no hay membresías
anteriores. Para grupos, las filas de integrantes se bloquean por ID en orden estable.
La activación comprueba que la transacción utiliza `READ COMMITTED`; rechaza otros
aislamientos para evitar que un snapshot anterior al bloqueo oculte renovaciones
concurrentes. Para compras se utiliza `durationDaysSnapshot` del ítem cuando existe,
con la duración actual del plan como respaldo para registros legados.
Los períodos explícitos se rechazan si se superponen con suscripciones activas,
incluidas las programadas. No se recalculan ni recortan suscripciones existentes.

Los paquetes nuevos comparten el cálculo inclusivo y se programan después de la
membresía del titular; conceden acceso al aprobarse administrativamente. La
aprobación conserva las fechas de paquetes preexistentes, bloquea el pago antes
del grupo y comprueba conflictos de todos los integrantes bajo bloqueos por usuario.
Si otro integrante tiene un período superpuesto, la aprobación se rechaza y requiere
revisión administrativa: no se reemplaza su membresía ni se desplaza solo a ese miembro.

## Diagnósticos y pruebas

La política de entorno se valida sin ejecutar reconciliaciones:

```powershell
node --experimental-vm-modules --test tests/mercadoPagoReconciliationEnvironment.test.js
```

Estas pruebas cargan únicamente el módulo de autorización, con configuración ficticia
y modelos que rechazan cualquier operación. No importan el servicio de reconciliación,
no cargan `.env`, no usan credenciales, no consultan proveedores ni conectan a PostgreSQL.
Cubren aceptación y rechazo de sandbox, Checkout Pro con cuenta de prueba y producción,
modo booleano estricto, identidad del token, prueba de tipo de cuenta, destino y
configuraciones contradictorias.

Los errores originales se conservan como `cause`. Los logs del controlador y
`PaymentWebhookEvent.payload.errorDiagnostics` incluyen etapa, mensaje sanitizado,
código y estado del proveedor; nunca se imprime el objeto completo del SDK, sus
headers ni su configuración. El cliente recibe un mensaje genérico para errores 5xx.
Un fallo de proveedor devuelve 502; un fallo interno transaccional devuelve 500.

```powershell
node --experimental-vm-modules --test tests/mercadoPagoConfirmation.test.js
```

Estas pruebas cargan los servicios reales con modelos en memoria, el validador real
de Mercado Pago y dependencias externas simuladas. No cargan `.env`, no conectan
a PostgreSQL ni llaman a Mercado Pago. Las transacciones y bloqueos se simulan;
la entrega real desde Render requiere una validación adicional antes de producción.
El operador confirmó nueve escenarios PostgreSQL aprobados entre dos ejecuciones,
cinco restricciones únicas con SQLSTATE `23505`, cero fixtures restantes y registros
protegidos sin cambios en la rama aislada. Los detalles están en
`mercadopago-postgres-integration.md`; no se repitieron escrituras durante esta revisión.
Además de la cola simulada usada para verificar rollback, hay un escenario con
transacciones independientes y un mutex por fila de usuario, sin cola global. Esto
verifica el protocolo del servicio, no demuestra el comportamiento real de PostgreSQL.

## Validaciones pendientes antes de producción

- Confirmar manualmente proyecto/rama de Neon, política de vendedor y modo, sesión
  administrativa y huella del destino. No autorizar producción basándose en Git.
- Comprobar mediante lectura `pg_indexes` los índices de `Payments`, `Receipts`,
  `UserSubscriptions` y `SubscriptionGroups`; confirmar tipos reales de `startsAt`
  y `endsAt` frente a `DATEONLY`, sin modificar esquema ni registros.
- Mantener la evidencia de integración de concurrencia, rollback, idempotencia,
  períodos e índices aprobados en la rama aislada; no extrapolar esa verificación
  al esquema o configuración de una base productiva distinta.
- Probar aprobaciones grupales con varios usuarios, invitaciones pendientes,
  membresías futuras, fechas legadas y ejecuciones concurrentes; confirmar ausencia
  de períodos superpuestos y de bloqueos mutuos.
- Comprobar que PostgreSQL rechaza un intento de escritura y un `FOR UPDATE`
  dentro de la vista previa; verificar recepción firmada desde Render y cambios
  posteriores de estado sin efectuar cobros o reembolsos reales.

No se requiere una migración nueva para estos cambios: se usan filas, índices y
metadata existentes. Si faltan índices desplegados, se necesita revisión manual
y una migración específica autorizada; no debe sustituirse por `sync({ alter: true })`.

## Propuesta TLS, pendiente de validación

`config/sequelize.js` conserva las conexiones actuales. Declara
`rejectUnauthorized: false`; los parámetros SSL de la URL pueden reemplazar las
opciones del objeto y es necesario verificar la configuración efectiva del driver.
Para Neon desde Render, proponer verificación de certificado y hostname mediante
la CA pública confiable del runtime o la CA aprobada del proveedor, TLS mínimo 1.2,
y `rejectUnauthorized: true`. Neon recomienda `sslmode=verify-full`; con Sequelize/pg
hay que elegir y validar una sola fuente de opciones SSL para evitar sobrescrituras.

Antes de cambiar conexiones: validar una conexión de solo lectura en un entorno de
pruebas con las versiones instaladas de Node, Sequelize y pg, confirmar verificación
de hostname/cadena y que un certificado inválido sea rechazado; repetir la validación
desde Render. No copiar URL, contraseñas ni certificados privados a logs. No se ha
aplicado esta propuesta ni comprobado la conectividad real durante estos cambios.

Referencias oficiales:
- [Neon: conexión segura](https://neon.com/docs/connect/connect-securely)
- [node-postgres: SSL y sobrescritura por parámetros de URL](https://node-postgres.com/features/ssl)
- [PostgreSQL: bloqueos transaccionales y por filas](https://www.postgresql.org/docs/current/explicit-locking.html)

## Seguridad de proxy, plantillas y certificados locales

Express confía en un salto únicamente cuando `RENDER` es exactamente `true`.
Fuera de Render no confía en proxies. El helper de auditoría utiliza `req.ip`,
sin volver a interpretar `X-Forwarded-For`, `X-Real-IP` o `CF-Connecting-IP`.
La seguridad de la configuración de un salto requiere que el servicio sea
accesible por la ruta prevista y que el proxy sanee los encabezados de IP y
protocolo. Verificar esa topología en Render; no configurar `trust proxy: true`.

En producción, HTTPS se decide con `req.secure`, que utiliza TLS directo o
la confianza configurada en Express. Para solicitudes HTTP, la redirección
307 conserva método/cuerpo y utiliza el origen HTTPS de `BACKEND_PUBLIC_URL`,
nunca `Host` o `X-Forwarded-Host`. Si esa configuración falta, es inválida o
contiene credenciales, se rechaza la solicitud HTTP con 400. Las solicitudes
HTTPS válidas y el desarrollo local mantienen su funcionamiento. No se cambian
variables de entorno con este ajuste.

Las plantillas no deben incluir claves de API utilizables. Si alguno de los
valores retirados pudo ser real, su responsable debe revocarlo o rotarlo; vaciar
una plantilla no lo elimina del historial de Git.

`cert/localhost.key` y su certificado no se utilizan en el arranque actual del
backend. La regla `*.key` del `.gitignore` raíz protege nuevas claves privadas,
pero no retira archivos ya versionados. Retirar únicamente su seguimiento desde
el repositorio raíz conserva el archivo local. La clave quedará en el historial:
considerarla expuesta y generar un nuevo par local antes de volver a utilizarla
es la medida recomendada, aunque el certificado actual coincida y siga vigente.
No regenerar ni reemplazar certificados automáticamente sin revisar cómo se
configura HTTPS en las herramientas de desarrollo.

Pruebas locales de IP y HTTPS, sin servidor ni conexiones externas:

```powershell
node --test tests/proxySecurity.test.js
```
