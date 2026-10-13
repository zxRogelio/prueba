# Plan de integración de Mercado Pago con PostgreSQL real

Estado confirmado por el operador: nueve escenarios aprobados entre la ejecución
inicial y la repetición selectiva, cinco restricciones únicas con SQLSTATE `23505`,
`remainingFixtures: 0` y `protectedRecordsUnchanged: true`. El preflight verificó
61 índices válidos y columnas de fechas PostgreSQL `DATE` en la rama aislada.
Durante esta revisión de seguridad solo se ejecutan pruebas locales sin conexión.

## Alcance y autorización de cada nueva ejecución

Las ejecuciones autorizadas verificaron los índices de Payments, Receipts,
UserSubscriptions, SubscriptionGroups y SubscriptionGroupMembers y las fechas
`DATE`. La vista previa y la verificación del manifiesto original terminaron sin
escrituras. Los resultados proceden del operador; no se abre una conexión ni se
repiten escenarios durante la revisión previa al commit.

Antes de cualquier ejecución con escritura, incluidos fixtures y limpieza, Codex
debe mostrar el destino verificado y solicitar autorización explícita del usuario.
La autorización debe abarcar la rama/host, base, rol, huella y los casos que se
ejecutarán, incluidos INSERT, UPDATE, DELETE temporales y bloqueos. Los flags del
arnés registran esa intención; no sustituyen la autorización humana previa.
Una ejecución aprobada no autoriza automáticamente repetirla ni cambiar de destino.

No se ejecuta el script administrativo con `--apply`. El caso de carrera invoca
`reconcileMercadoPagoPayment({dryRun:false})` exclusivamente para IDs nuevos de
fixtures y con una sesión administrativa temporal propia. Esa invocación sí escribe
y requiere autorización explícita para esa ejecución. El webhook utiliza el validador real
de firmas del SDK con un secreto efímero de prueba. No se desactiva ningún control.

## Archivos

- `scripts/verifyMercadoPagoPostgresIntegration.js`: modos plan, preflight, run y cleanup.
- `tests/integration/mercadoPagoPostgresSupport.js`: validación del destino,
  conexión TLS, preflight y carga de servicios reales sin `.env`.
- `tests/integration/mercadoPagoPostgresFixtures.js`: manifiesto durable,
  fixtures con modelos Sequelize reales y limpieza acotada por IDs.
- `tests/integration/mercadoPagoPostgresWorker.js`: un proceso y pool de una
  conexión por operación, con servicios y modelos reales.
- `tests/integration/mercadoPagoPostgresScenarios.js`: coordinación,
  observación de bloqueos en PostgreSQL y aserciones sobre filas reales.
- `tests/integration/mercadoPagoPostgres.target.example.json`: ejemplo que falla
  cerrado hasta configurar un destino verificado; no contiene URL ni credenciales.
- `tests/mercadoPagoPostgresSafety.test.js`: pruebas locales sin conexiones.

## Secuencia de ejecución propuesta

1. Revisar código y casos; mantener una rama dedicada de Neon sin tareas de fondo
   que procesen estos fixtures. No ejecutar contra una rama productiva o compartida
   con operaciones reales. Mantener intactos el backend desplegado y sus credenciales.
2. Crear una copia local del ejemplo, por ejemplo `target.local`, corroborando en
   Neon el `branchId`, el **endpoint directo** de esa rama, base y rol. El hostname
   identifica el endpoint; SQL por sí solo no acredita a qué rama de Neon pertenece.
   `branchVerifiedInNeon` registra la revisión manual, no una consulta a la API de Neon.
3. Fijar en esa configuración la huella independiente del destino. El algoritmo es
   SHA-256 de `JSON.stringify({host:host.toLowerCase(),port:5432,database,username,schema:"core"})`.
   No copiar una huella del destino actual sin cotejarlo con Neon. La URL dedicada
   se suministra al proceso mediante `TITANIUM_PG_TEST_DATABASE_URL` desde una fuente
   privada, sin argumentos de consola, historial ni archivos versionados. No se
   usa `DATABASE_URL_RUNTIME` ni se cargan los `.env` existentes.
4. Ejecutar **solo el preflight de lectura**, revisar su salida y solicitar la
   autorización humana para escrituras temporales. El preflight comprueba la
   coincidencia host/base/rol/huella, `BEGIN READ ONLY`, aislamiento por defecto
   `READ COMMITTED`, las cuatro columnas DATE,
   índices válidos únicos y TLS con certificado verificado. También comprueba
   los índices de historial y eventos de webhook utilizados por estos servicios;
   no exige que el número total de índices permanezca exactamente en 61.
5. Después de la autorización, ejecutar el arnés. Persiste el manifiesto antes
   del primer INSERT, toma una huella de las entidades protegidas y crea todos
   los fixtures en una transacción. No utiliza secuencias de órdenes comerciales:
   sus números tienen prefijo `PGIT-` y sus entidades tienen UUID nuevos.
6. Ejecutar los casos en serie; dentro de cada carrera iniciar dos procesos con
   conexiones independientes. Una tercera conexión retiene el bloqueo de usuario
   o el advisory lock de la operación ficticia. El monitor debe observar **ambos
   PID distintos esperando el bloqueo**, directamente o por su cadena de espera,
   antes de liberarlo. Una ejecución secuencial disfrazada de concurrencia falla.
7. Verificar resultados, restricciones únicas reales, preservación de registros
   y limpieza. Limpiar automáticamente los fixtures aunque falle una aserción.
   Ante un corte abrupto, recuperar únicamente el manifiesto de esa ejecución,
   con el mismo destino y una autorización de limpieza.

Ejemplos desde `backend`; sustituir marcadores por datos revisados privadamente:

```powershell
# No conecta, no escribe y no necesita configuración.
node scripts/verifyMercadoPagoPostgresIntegration.js --plan

# Conecta únicamente para leer; requiere el destino local revisado y la URL privada.
node scripts/verifyMercadoPagoPostgresIntegration.js --preflight --target target.local

# SOLO después de autorización humana del destino y escrituras temporales.
node scripts/verifyMercadoPagoPostgresIntegration.js --run --target target.local --authorize-temporary-writes --confirm-database HUELLA_APROBADA

# Recuperación, igualmente autorizada y después de detener la ejecución anterior.
node scripts/verifyMercadoPagoPostgresIntegration.js --cleanup RUTA_MANIFIESTO --target target.local --authorize-temporary-writes --confirm-database HUELLA_APROBADA
```

## Diagnosticar argumentos y destino sin conexión

`--preflight` requiere `--target target.local`. Si falta ese argumento, la
aserción ocurre en `parseIntegrationArgs()` antes de leer configuración,
comparar huellas o conectar. Que `--plan` funcione no valida el destino:
ese modo deliberadamente no necesita configuración ni abre conexiones.

Copiar el ejemplo no basta para habilitarlo. Revisar todos sus campos:
`environment: "test"`, `neonBranchId` como ID de recurso `br-...` (no el
nombre visible de la rama), `branchVerifiedInNeon: true` solo después de
corroborar el endpoint en Neon, host **directo** sin `-pooler`, puerto,
base, rol y `expectedDatabaseId`. El ejemplo conserva valores ficticios
y `branchVerifiedInNeon: false` para impedir su uso accidental.

Una nueva rama requiere un destino revisado y su propia huella aprobada.
No reutilizar el JSON de la rama anterior sin revisarlo. La huella incluye
el hostname, por lo que una huella del endpoint con pooler puede diferir
de la del endpoint directo, incluso para la misma rama. No sustituir una
huella simplemente por la que produjo una conexión todavía no verificada.

La URL dedicada se obtiene de una fuente privada y se inyecta en el entorno
del proceso como `TITANIUM_PG_TEST_DATABASE_URL`. Cambiar
`DATABASE_URL_RUNTIME` dentro de `.env` no configura este ejecutor. No
incorporar credenciales al JSON ni a comandos, logs o documentación.

Los fallos incluyen `stage`, mensaje interno seguro, `field` cuando procede
y `location` con archivo relativo y línea. Los errores de configuración no
publican valores actuales/esperados. Los errores externos muestran un mensaje
fijo y un código seguro; no publican su mensaje original ni su stack completo.
Si no se puede atribuir una ubicación a un archivo del ejecutor, es `null`.

Antes de repetir un preflight en esta revisión se requiere autorización.
Realizará `BEGIN READ ONLY`, tres consultas de lectura (identidad/aislamiento,
columnas en `information_schema` e índices en los catálogos de PostgreSQL),
y `COMMIT` o `ROLLBACK`. No crea fixtures ni consulta Mercado Pago. La
autorización del preflight no autoriza `--run`, limpieza ni reconciliaciones.

## Lanzador privado desde PowerShell para la rama autorizada

El lanzador está restringido a la rama aislada autorizada `titanium-integracion-test`.
El Branch ID, host directo y huella concretos se cotejan con las protecciones del
arnés y `target.local`, que no se versiona. Los marcadores de esta documentación
no sustituyen esa comprobación ni permiten autorizar otro destino. La conexión
real se verifica en el preflight incorporado en `--run`, antes de cualquier escritura.

Desde `backend`, ejecutar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\runMercadoPagoPostgresIntegration.ps1 -Run -AuthorizeTemporaryWrites
```

Sin parámetros, el lanzador rechaza la ejecución antes de solicitar conexión.
`-Run` y `-Selective` necesitan además `-AuthorizeTemporaryWrites`; el modo
de lectura rechaza esa autorización. La opción de política afecta únicamente al nuevo proceso de PowerShell; no
modifica la política permanente. La URL se escribe en el prompt oculto de
`Read-Host -AsSecureString`. No pegarla como argumento ni guardarla en archivos.

El lanzador rechaza un `target.local` distinto de los valores autorizados antes
de solicitar la URL. Después reutiliza `validateTarget()` para cotejar host,
puerto, base, rol, huella y opciones de la URL. Invoca `main()` del ejecutor
existente con los argumentos mostrados en la terminal. No utiliza una sesión
persistente de usuario ni configura variables de entorno de usuario/sistema.

El lanzador proporciona `TITANIUM_PG_TEST_DATABASE_URL` únicamente en el
entorno del nuevo proceso; el arnés la reutiliza internamente para sus conexiones.
Se elimina en `finally` tanto en Node como en PowerShell; también se libera y
limpia el BSTR utilizado para convertir la entrada segura. No se imprime la
entrada ni se interpola en código, argumentos, manifiestos o logs. Una variable
homónima previamente heredada en ese proceso se descarta, no se restaura.

Se ejecuta la misma suite de nueve escenarios, con sus comprobaciones de
restricciones únicas y rollback. Los informes incluyen duración por escenario,
conteos eliminados por tabla y cero fixtures restantes. Solo se informa
`phase: "complete"` después de completar los nueve escenarios, la limpieza y
la comprobación final de registros protegidos. Un error detiene los escenarios
restantes; se intenta únicamente la limpieza acotada que ya documenta el arnés.
No hay reintentos automáticos ni llamadas reales a Mercado Pago.

Validaciones locales del lanzador (Node sustituido, ninguna conexión):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\mercadoPagoPostgresLauncherSafety.test.ps1
```

## Casos y escrituras temporales

Todos requieren fixtures persistidos para que las conexiones independientes puedan
verlos: no se pueden envolver en una única transacción externa con rollback final.
La limpieza usa DELETE limitado al manifiesto al terminar.

| Caso | Comprobación | Escrituras temporales previstas |
| --- | --- | --- |
| Compras simultáneas | Dos órdenes y planes distintos, mismo usuario sin suscripciones; dos períodos consecutivos con duración inclusiva exacta. | Pagos/órdenes, dos membresías, recibos, eventos e historiales. |
| Límite inclusivo | Inicio en el último día de la anual se rechaza con 409 y rollback; inicio al día siguiente se acepta. | Membresía e historial del caso aceptado. |
| Webhooks duplicados | Misma operación, notificaciones distintas, dos transacciones bloqueadas; un pago, recibo y membresía. | Dos eventos válidos de webhook y una confirmación efectiva. |
| Webhook y reconciliación | Carrera por advisory lock compartido; ambos terminan sin duplicados. | Evento firmado y un intento de reconciliación; una activación/recibo. |
| Reconciliaciones duplicadas | Dos operadores/sesiones distintos para no serializar por la misma sesión; dos intentos registrados, una membresía y recibo. | Dos entradas de historial en metadata, una confirmación efectiva. |
| Fallo de activación | Hook de prueba lanza después del INSERT real de UserSubscription; pago/orden y alta vuelven al estado previo. | Cambios revertidos, evento de webhook fallido fuera de la transacción y reintento exitoso. |
| Fallo de recibo | Hook lanza después del INSERT real de Receipt, cuando ya existen membresía, eventos e historial dentro de la transacción. | Todo el negocio se revierte; evento fallido se conserva y el reintento confirma una sola vez. |
| Anual y membresía futura | Dos compras nuevas se programan después de la última futura, sin cambiar fechas, estado ni atributos de las existentes. | Dos períodos nuevos y sus recibos/historiales. |
| Paquete grupal | Fallo de recibo revierte grupo, integrantes y vínculo del pago; reintentos dejan un grupo y dos integrantes. | Grupo pendiente de aprobación e integrantes; no concede acceso individual antes de aprobar. |
| Índices únicos reales | Intentos de insertar otro pago con la operación existente, otro recibo del pago, otra membresía/grupo del orderItem y otro integrante con el mismo correo en el grupo. | INSERT que debe fallar con `23505` por el índice previsto; transacción siempre revertida. |

Se comprueba además una vista previa de un fixture comparando todas sus filas antes
y después. Esta vista previa no escribe; la preparación y limpieza del fixture sí.
Se insertan usuarios de prueba, administradores y sesiones temporales para probar la
autorización existente. Sus JWT usan un secreto nuevo en memoria por ejecución;
no se reutiliza ni modifica ninguna credencial real. El manifiesto no guarda tokens.

## Aislamiento y limpieza

La orden protegida, su pago y la operación del proveedor nunca se usan como
fixtures ni argumentos de los workers. Los UUID conocidos también están bloqueados.
Los IDs del proveedor son cadenas numéricas sintéticas de un espacio reservado por
el arnés, previamente comprobadas como inexistentes. Cada worker verifica que los
metadatos, usuario, pago y número de orden pertenecen al `runId` antes de confirmar.
Las consultas al proveedor son un objeto de prueba suministrado al servicio; los
modelos, transacciones, índices, bloqueos, recibos y membresías usan PostgreSQL real.
Se bloquea HTTP/HTTPS/fetch en los procesos que cargan servicios para impedir
compras, cobros o reembolsos accidentales. No se inicia Express ni tareas programadas.

La configuración de conexión de la aplicación permanece intacta. Solo los procesos
del arnés usan TLS verificado, un pool de una conexión y límites de espera. Se usa
el API interno `connectionManager.initPools()` de Sequelize 6 instalado para fijar
ese tamaño antes de abrir conexiones; deberá revisarse al actualizar Sequelize.
No se hace `sync`, ALTER, migración, trigger ni modificación de esquema.
Los hooks de fallo se instalan en el worker sobre los modelos reales y se retiran
al terminar; no se incorporan a servicios ni al backend desplegado.

El manifiesto se guarda en una carpeta temporal local antes de sembrar filas, y su
ruta se informa para recuperación. La limpieza valida propiedad de usuarios, planes,
órdenes y pagos, y revisa FKs para rechazar referencias fuera del conjunto permitido.
No usa `TRUNCATE`, `CASCADE`, borrado por prefijos ni búsquedas de producción. Un
advisory lock de ejecución impide que otro proceso limpie un run activo. Si faltan
permisos, hay FKs no compatibles, referencias externas, un corte de conexión o una
huella protegida distinta, falla y exige revisión manual; no amplía el borrado.

La huella protegida cubre orden, pagos, recibos, suscripciones actuales/futuras y
grupos e integrantes del usuario real. Se calcula sin publicar filas ni secretos.
La salida contiene casos, PID/bloqueos, SQLSTATE seguro, conteos y ruta del manifiesto;
los errores no incluyen SQL, parámetros, URLs, contraseñas ni JWT.

## Validaciones locales y pendientes

### Diagnóstico de la ejecución con ocho escenarios aprobados

El operador informó que `group-receipt-rollback` falló y que la limpieza terminó
con cero fixtures. Se reprodujo localmente un defecto de los fixtures v1 usando
la definición y validación reales de `SubscriptionGroupMember`, sin PostgreSQL:
`pgit-<UUID run>-<UUID usuario>` tiene 78 caracteres antes de `@`. El validador
`isEmail` rechaza ese correo. Tanto titular como invitado reciben ese formato.

El servicio crea primero el grupo y sus integrantes dentro de la transacción,
y después el recibo. Por tanto, el correo del titular produce
`SequelizeValidationError` (`invitedEmail`, `isEmail`, código `null`) antes del
hook de fallo del recibo. La aserción original esperaba
`failed.error.code === "PGIT_INJECTED_FAILURE"`. No se llegó al INSERT del
recibo: esa ejecución no acredita el rollback grupal después de dicho INSERT.

Los manifiestos nuevos son v2 y generan partes locales de 54 caracteres, con
el UUID completo del usuario sin guiones. La lectura y limpieza de los
manifiestos v1 siguen disponibles; no se alteran sus datos ni se permite
sembrarlos de nuevo. Las expectativas siguen exigiendo dos integrantes,
un solo grupo/recibo, aprobación administrativa pendiente y ningún acceso
individual antes de aprobar. El servicio grupal no se modificó.

Los errores del worker ahora preservan únicamente campo y tipo de validación,
sin valores de correos, mensajes originales o parámetros. La aserción de fallo
inyectado informa causa, esperado/obtenido seguro y ubicación. Fallos de cierre,
limpieza o comprobación protegida se informan por separado, conservando el error
original del escenario. La comprobación protegida emite su propio informe aun
si la suite falla. El lanzador solo considera completada una limpieza exitosa.

La ausencia del antiguo resultado `phase: "complete"` no demuestra una
modificación de registros protegidos: ese resultado solo se emitía si la suite
entera resolvía correctamente. La limpieza con cero filas tampoco certifica
por sí sola su conservación. El manifiesto guardado antes del primer INSERT
contiene `protectedFingerprint` para cotejar el estado final.

El modo de verificación exclusivamente de lectura fue aprobado por el operador
sobre el manifiesto original; no se repite en esta revisión. Requiere la URL temporal dedicada del proceso y el mismo
destino revisado:

```powershell
node scripts/verifyMercadoPagoPostgresIntegration.js --verify-run RUTA_MANIFIESTO_ORIGINAL --target target.local
```

Para revisar la ejecución original con entrada privada y eliminación de la
variable incluso ante errores, ejecutar desde `backend`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\runMercadoPagoPostgresIntegration.ps1 -VerifyRun "RUTA_MANIFIESTO_ORIGINAL"
```

`-VerifyRun` selecciona exclusivamente el modo de lectura. No se pasa ninguna
autorización de escritura. Si falla, termina sin cambiar al modo `--run` ni
intentar limpiar. La URL se introduce en `Read-Host -AsSecureString`; se coteja
el destino y se verifica TLS, base y rol con el preflight habitual. No se
imprime ni se guarda la conexión. Este comando no se ha ejecutado en esta revisión.

El manifiesto original v1 fue validado localmente: conserva el baseline y
corresponde a la huella autorizada. No se modifica ni se reutiliza para sembrar
fixtures. La respuesta esperada es `phase: "verify-run", status: "passed"`,
`protectedRecordsUnchanged: true`, `remainingFixtures: 0`, `writes: 0`.

Ese modo hace el preflight, compara la huella protegida y comprueba que las
filas de ese manifiesto estén ausentes, mediante SELECT y transacciones READ
ONLY. Devuelve `writes: 0`; rechaza flags de escritura, no carga servicios de
confirmación y no invoca limpieza. Una comparación distinta falla; una lectura
fallida deja el resultado protegido desconocido (`null`), nunca lo da por cierto.
La comparación acredita el estado final frente al baseline, no un historial de
posibles cambios intermedios.

El cotejo del manifiesto original, el noveno escenario con correos corregidos y
las cinco violaciones únicas `23505` ya fueron aprobados según el operador. El
fallo inicial se conserva como diagnóstico histórico, no como prueba pendiente.
Cualquier repetición requiere revisar nuevamente destino, alcance y autorización.

### Ejecución selectiva aprobada: escenario grupal y cinco índices únicos

El operador informó que el `--verify-run` original terminó con `status: passed`,
`protectedRecordsUnchanged: true`, `remainingFixtures: 0`, `writes: 0` y 61
índices verificados. Posteriormente confirmó la repetición parcial aprobada y
las cinco restricciones únicas. No se ejecutó contra Neon durante esta revisión.
La comprobación anterior no autoriza por sí misma nuevas
escrituras: el comando selectivo exige autorización explícita.

Desde `backend`, después de revisar el alcance, ejecutar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\runMercadoPagoPostgresIntegration.ps1 -Selective -AuthorizeTemporaryWrites
```

La URL directa se introduce de forma privada con `Read-Host -AsSecureString`.
El lanzador la mantiene solo en el proceso y la elimina en `finally` aunque
falle. No la imprime, persiste ni interpola en argumentos. `-Selective` sin
`-AuthorizeTemporaryWrites` falla antes de solicitarla. No se puede combinar
con `-VerifyRun`. El comando interno equivalente es:

```powershell
node scripts/verifyMercadoPagoPostgresIntegration.js --run --selective --target target.local --authorize-temporary-writes --confirm-database HUELLA_APROBADA
```

El destino está fijado tanto en el lanzador como en el ejecutor selectivo:
la rama aislada autorizada, su Branch ID, host directo y huella aprobada. El
marcador `HUELLA_APROBADA` debe sustituirse privadamente por la huella revisada;
no se obtiene copiando automáticamente el destino actual.
Se coteja la URL con el JSON (puerto, base y rol), se verifica TLS y
se repite el preflight de lectura antes de cualquier escritura. No se consulta
la API de Neon; el vínculo Branch ID/endpoint procede de la revisión previa en Neon.

El manifiesto v3 tiene un alcance fijo y validado: `group-receipt-rollback` y
un conjunto auxiliar `unique-constraints-fixtures`. Solo genera tres usuarios
(titular e invitado del grupo, y titular individual), tres planes y tres
órdenes/items/pagos nuevos: un grupo, una compra individual que se confirmará
y otra individual pendiente. No crea administradores, sesiones, planes anuales
ni suscripciones previas. No ejecuta los ocho escenarios aprobados ni llama a
reconciliación. Los manifiestos v1/v2 conservan verificación y limpieza; el
manifiesto original no se modifica ni se reutiliza para sembrar.

1. Persistir manifiesto/baseline antes de sembrar, comprobar IDs de proveedor
   sintéticos libres y crear los fixtures en una transacción.
2. Ejecutar el escenario grupal: fallo después del INSERT de Receipt, rollback
   de entidades de negocio, evento fallido, reintento y notificación duplicada.
   Cada operación usa un worker nuevo con modelos, servicios y conexión
   PostgreSQL reales; no crea compras en Mercado Pago.
3. Confirmar la compra individual auxiliar en otro worker independiente.
4. Comprobar exactamente cinco índices: operación del proveedor en Payments,
   paymentId en Receipts, orderItemId en UserSubscriptions y SubscriptionGroups,
   y groupId/invitedEmail en SubscriptionGroupMembers. Cada INSERT debe fallar
   con `23505` por el índice válido previsto, en su propia transacción con
   ROLLBACK. Se compara la instantánea de filas antes/después de los cinco.
5. Limpiar por IDs del manifiesto con las protecciones de propiedad y FKs;
   comprobar cero fixtures y comparar el estado final protegido con el baseline.

Un error detiene el escenario o los índices restantes. Solo se intenta la
finalización y limpieza acotada existente; no hay reintentos automáticos. Un
fallo de limpieza o de registros protegidos termina con error y sin informe de
éxito completo. Cada índice tiene informe individual y duración; el resultado
satisfactorio final contiene:

```json
{
  "phase": "complete",
  "status": "passed",
  "scenariosPassed": 1,
  "selection": "group-receipt-rollback-and-unique-constraints",
  "uniqueChecksPassed": 5,
  "remainingFixtures": 0,
  "protectedRecordsUnchanged": true
}
```

El plan selectivo se puede consultar sin URL, conexión ni escrituras:

```powershell
node scripts/verifyMercadoPagoPostgresIntegration.js --plan --selective
```

Las pruebas locales del modo selectivo verifican alcance, manifiestos,
autorización, siembra mínima, interrupción ante fallos, cinco rechazos/rollback,
limpieza y selección del lanzador. Sustituyen solo dependencias de prueba:
no sustituyen la evidencia de las pruebas reales ya aprobadas por el operador.

```powershell
node --experimental-vm-modules --test tests/mercadoPagoPostgresSelective.test.js
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\mercadoPagoPostgresLauncherSafety.test.ps1
```

Pruebas locales adicionales:

```powershell
node --experimental-vm-modules --test tests/mercadoPagoPostgresDiagnostics.test.js tests/mercadoPagoConfirmation.test.js
```

```powershell
node --test tests/mercadoPagoPostgresSafety.test.js
```

Estas pruebas son locales; no certifican concurrencia, índices o rollback real.
Ya se aprobaron preflight, nueve escenarios entre ambas ejecuciones, cinco
restricciones `23505`, limpieza sin fixtures y conservación de registros protegidos
en la rama aislada. Sigue pendiente probar la entrega real del webhook desde Render
y la aprobación de integrantes de un paquete grupal; este arnés cubre su creación,
rollback e idempotencia, no la aprobación administrativa del paquete.
