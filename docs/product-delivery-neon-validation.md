# Validación de entregas en Neon: historial de preparación

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

**Actualización posterior:** el usuario identificó y autorizó `pagos-test`. La conexión real verificó el proyecto `noisy-flower-34676790`, rama `br-lively-math-akwgzcsr` y endpoint `ep-long-snow-akwnltba`. La migración y las pruebas reales terminaron con **27 escenarios aprobados, cero fallidos y cero fixtures restantes**. Véanse los [resultados finales](product-delivery-neon-results.md). Las secciones siguientes documentan la fase previa y sus bloqueos; ya no describen el estado final.

Fecha: 2 de noviembre de 2026. Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama Git `feature/product-delivery-system`.

## Resultado de esta etapa

**No se abrió ninguna conexión PostgreSQL real ni se ejecutaron migraciones, INSERT, UPDATE, DELETE o rollback en Neon.** La conexión disponible no pudo acreditarse como aislada. La solicitud exige detener las escrituras en esta situación.

Se inspeccionó `backend/.env` mediante un parser que solo emitió host, base, rol, modo y presencia de configuración. No se imprimieron URLs completas, contraseñas o tokens y no se modificó ningún `.env`.

| Variable | Endpoint | Base / rol |
|---|---|---|
| `DATABASE_URL_RUNTIME` | `ep-long-snow-akwnltba-pooler.c-3.us-west-2.aws.neon.tech` | `neondb` / `neondb_owner` |
| `DATABASE_URL_IMPORTER` | Mismo endpoint con pooler | Mismos base y rol |
| `DATABASE_URL_REPORTS` | Mismo endpoint con pooler | Mismos base y rol |
| `DATABASE_URL_ADMIN_DIRECT` | `ep-long-snow-akwnltba.c-3.us-west-2.aws.neon.tech` | Mismos base y rol |

`NODE_ENV=production`. Esto obliga a tratar el destino como protegido; no demuestra por sí solo cuál es el nombre o ID de su rama en Neon. Las URLs no prueban que una aplicación desplegada utilice o deje de utilizar un endpoint. No hay CLI de Neon instalada, API key en las variables revisadas, sesión local de CLI encontrada ni herramienta autenticada de Neon disponible en esta sesión. No se pudo crear o verificar una rama desde el plano de control.

La rama de Neon utilizada para las pruebas es, por tanto, **ninguna todavía**. La rama Git sí fue comprobada; son identidades diferentes.

### Confirmación posterior del usuario y revisión automática

El usuario confirmó que la rama disponible es de pruebas y autorizó utilizarla. Se solicitó entonces ejecutar una conexión TLS al endpoint directo actual para consultar únicamente identidad, SSL, esquema, permisos y migraciones, con `default_transaction_read_only=on` y `BEGIN READ ONLY`.

La revisión automática de permisos rechazó esa acción **antes de iniciar el proceso**: consideró que la confirmación general no acreditaba una rama aislada para el endpoint previamente identificado como potencialmente productivo. No se abrió conexión, no se usaron las credenciales para acceder al servidor y no se ejecutó SQL. No se reintentó por otra vía.

Queda solicitado el nombre e ID `br-...` de la rama que corresponde al hostname directo indicado arriba, la confirmación de que ningún despliegue de producción lo utiliza y la autorización expresa de las consultas de lectura a ese destino concreto. No se solicitan contraseñas ni URLs completas. Esta restricción proviene de la revisión automática, no de un fallo de PostgreSQL ni de la migración.

## Configuración y migraciones revisadas

- `backend/config/sequelize.js` carga `.env`, crea cuatro conexiones y configura SSL. No se importó ese módulo para comprobar la base disponible.
- Esa configuración heredada contiene `require: true` y `rejectUnauthorized: false`. No se cambió el comportamiento de producción. El preflight separado exige certificado verificado y no hereda esa excepción; revisar el endurecimiento global de TLS requiere una tarea y validación de certificados aparte.
- El runner `backend/scripts/migrate.js` usa preferentemente `sequelizeAdminDirect`. Sus comandos `up`, `down` **y `status`** invocan `ensureMetaTable()`, que puede crear el esquema o `SequelizeMeta`. No usar `migrate:status` como preflight de solo lectura.
- Varias migraciones históricas importan directamente la conexión runtime y declaran `useTransaction=false`, aunque abren su propia transacción. Cambiar solo la URL administrativa no garantiza el aislamiento de todo el runner. Una futura ejecución debe aislar todas las conexiones, sin cargar secretos de producción ni iniciar el backend y sus tareas de fondo.
- El runner registra `SequelizeMeta` después de ejecutar la migración, fuera de la transacción DDL de esta. Una interrupción entre ambas operaciones requiere revisar el esquema real y el registro antes de reintentar. No se cambió este comportamiento global en esta etapa.
- La migración de entregas es aditiva y acepta la transacción del runner. Agrega `Orders.shippingTotal` y crea `UserAddresses`, `ShippingRates`, `OrderFulfillments` y `FulfillmentEvents`, con FKs UUID, índices y restricciones. Su compatibilidad física sigue pendiente de ejecución sobre la rama aislada.
- `down` protege direcciones, tarifas, fulfillment e importes de envío existentes. El rollback puede probarse con savepoints o fixtures sintéticos acotados; **no debe vaciar tablas clonadas con datos existentes** para forzarlo. No se ejecutó rollback, ni se revirtió ninguna migración histórica.

## Crear la rama aislada desde Neon

1. Abrir la [consola de Neon](https://console.neon.tech), seleccionar el proyecto que contiene el endpoint actual y entrar a **Branches → New branch**.
2. Elegir como padre la rama de la aplicación y asignar el nombre **`test/product-delivery-system`**. Seleccionar **Current data** para conservar el esquema y permitir comprobar compatibilidad con órdenes y membresías previas. Las escrituras de una rama hija quedan aisladas de su padre, según la [documentación oficial de ramas](https://neon.com/docs/manage/branches).
3. Crear o activar el compute de lectura/escritura de la rama nueva. Registrar el ID real `br-...`, el ID de proyecto y el hostname del compute. No confundir el nombre visible de la rama con su ID.
4. En **Connect**, seleccionar expresamente esa rama, compute, base y rol. Desactivar el pooler para obtener el endpoint directo, sin `-pooler`. El diálogo selecciona rama, base y rol; consultar [cómo encontrar esos datos](https://neon.com/docs/connect/connect-from-any-app).
5. Usar credenciales propias de pruebas. Una rama puede heredar roles y contraseñas del padre: no reutilizar automáticamente la contraseña de producción. Establecer credenciales distintas **solo en la rama de pruebas**, con los permisos y propiedad necesarios para alterar `core.Orders`, crear tablas, índices y secuencias. No cambiar roles o contraseñas del padre. No compartir contraseñas en el chat.
6. Revisar las variables del backend desplegado y de tareas, importadores y servicios relacionados en su proveedor de hosting. Confirmar que ninguno apunta al endpoint nuevo. No modificar la configuración desplegada para hacer estas pruebas. Sin acceso al proveedor, esta comprobación requiere confirmación del operador.
7. Compartir para la revisión únicamente: proyecto, ID y nombre de rama, endpoint directo, base, rol y confirmación de que el endpoint no está en uso por despliegues. La URL privada se introduce mediante entrada segura local, como se explica debajo.

No se creó una rama automáticamente ni se solicitó cambiar la rama predeterminada, restaurar, eliminar o reiniciar ramas existentes.

## Preflight de solo lectura preparado

Se añadió `backend/scripts/preflightProductDeliveryNeon.js`. No modifica los verificadores previos, no importa `dotenv` ni la configuración de la aplicación, no acepta URLs de respaldo y no tiene modo de escritura o migración.

Antes de conectar exige:

- Entorno `test`, proyecto y rama identificados, nombre `test/product-delivery-system`.
- Verificación explícita del vínculo rama/endpoint y del aislamiento respecto de despliegues.
- Endpoint directo, base, rol y huella revisados; coincidencia de la URL privada con ese destino.
- Lista independiente de hosts de producción protegidos; bloquea también sus alias con pooler.
- TLS con certificado y hostname verificados, mínimo TLS 1.2. Pasa campos explícitos a `pg.Client`, evitando que `sslmode` de una URL sustituya la configuración TLS. Ver [node-postgres SSL](https://node-postgres.com/features/ssl).
- Sesión con `default_transaction_read_only=on`, seguida de `BEGIN READ ONLY`, límites locales y cierre con rollback.

El preflight consulta identidad, tablas, columnas, índices, restricciones, permisos y propietarios, y lee `SequelizeMeta` **solo si ya existe**. Informa las migraciones pendientes leyendo los nombres del repositorio. No crea la tabla de control, no llama a `up` ni `down`, y no consulta datos personales o financieros. Sus indicadores de verificación manual son condiciones de entrada; **no sustituyen la comprobación en Neon y hosting**.

Desde `backend`:

```powershell
# Ejecutado en esta etapa: no conecta.
node scripts/preflightProductDeliveryNeon.js --plan

# Preparación manual posterior, únicamente con metadatos ya verificados.
Copy-Item -LiteralPath tests/integration/productDeliveryNeon.target.example.json -Destination tests/integration/productDeliveryNeon.target.local
```

Editar el archivo `.local`, que queda ignorado por Git. Completar el destino **nuevo**, los hosts protegidos del destino actual y las dos verificaciones. No añadir URL, contraseña ni token al JSON. El ejemplo contiene valores ficticios y verificaciones falsas, por lo que falla antes de conectar.

Para obtener la huella del destino ya revisado, sin conectar, desde `backend`:

```powershell
@'
import { readFile } from 'node:fs/promises';
import { deliveryNeonFingerprint } from './scripts/preflightProductDeliveryNeon.js';
const target = JSON.parse(await readFile('tests/integration/productDeliveryNeon.target.local', 'utf8'));
console.log(deliveryNeonFingerprint(target));
'@ | node --input-type=module -
```

Copiar el hash en `expectedDatabaseId` después de cotejar host, base y rol con Neon. El hash identifica esos metadatos; no acredita aislamiento por sí mismo.

Entrada segura para el **preflight posterior**, sin poner la URL en historial ni en `.env`:

```powershell
$taskPreviousDeliveryUrl = [Environment]::GetEnvironmentVariable('DELIVERY_NEON_TEST_DATABASE_URL', 'Process')
$taskPrivateDeliveryUrl = Read-Host 'URL exclusiva de la rama de pruebas' -AsSecureString
try {
    $env:DELIVERY_NEON_TEST_DATABASE_URL = [Net.NetworkCredential]::new('', $taskPrivateDeliveryUrl).Password
    node scripts/preflightProductDeliveryNeon.js --preflight --target tests/integration/productDeliveryNeon.target.local
}
finally {
    [Environment]::SetEnvironmentVariable('DELIVERY_NEON_TEST_DATABASE_URL', $taskPreviousDeliveryUrl, 'Process')
    $taskPrivateDeliveryUrl.Dispose()
    $taskPreviousDeliveryUrl = $null
}
```

No ejecutar ese bloque con la URL actual de producción. No ejecutado durante esta etapa.

`backend/scripts/verifyProductDeliveryPostgres.js` conserva su allowlist de **loopback y base local vacía**. No se eliminó esa protección ni se intentó usarlo en Neon. El arnés previo de Mercado Pago también conserva su destino autorizado específico; no se reutilizó su aprobación para otra rama.

## Pruebas ejecutadas y pendientes

| Verificación ejecutada en esta etapa | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| Backend completo, proveedor y modelos aislados | 263 | 0 | 0 |
| Frontend, renderizado y adaptadores aislados | 10 | 0 | 0 |
| Seguridad del lanzador PowerShell, sin PostgreSQL | 30 | 0 | 0 |
| **Total local, sin duplicar** | **303** | **0** | **0** |

Las 263 del backend incluyen las 247 anteriores y **16 nuevas pruebas de seguridad del preflight**, todas sin conexión. Se comprobó el rechazo de producción, alias con pooler, identidad diferente, huella, rama y despliegues sin verificar, ausencia de URL privada, overrides, TLS no verificado y flags de escritura; además, la secuencia SQL de lectura con un cliente simulado. Un falso positivo en una aserción nueva se corrigió antes de la ejecución final. ESLint y `node --check` pasaron para los dos archivos JS nuevos, y `git diff --check` pasó. No se recompiló el frontend, que no cambió.

| Validación PostgreSQL real | Estado |
|---|---|
| Conexión e identidad de rama aislada | No ejecutada: falta destino verificado |
| Consulta real de permisos y migraciones pendientes | No ejecutada |
| Migración, cuatro tablas, FKs, índices y defaults | No ejecutada |
| Direcciones, tarifas, pickup, delivery e historial | No ejecutada |
| Concurrencia, idempotencia y rollback transaccional | No ejecutada |
| Reversión de la migración y reaplicación | No ejecutada |
| Preservación de órdenes, membresías y pagos existentes | Pendiente de comprobar en PostgreSQL |

**Cero pruebas reales de PostgreSQL ejecutadas: no se contabilizan como aprobadas, fallidas ni como omisiones de la suite local.** No hay problemas de integridad nuevos observados en una base real, porque no se accedió a ella. La compatibilidad previa sigue sustentada por las pruebas locales y la revisión de código.

Una vez verificado el destino: hacer preflight; revisar todas las pendientes; aplicar únicamente las necesarias mediante conexiones completamente aisladas; comprobar `SequelizeMeta` y esquema para evitar doble aplicación; tomar una referencia de los registros preexistentes; ejecutar casos con UUID sintéticos, servicios reales y proveedor externo bloqueado; limpiar solo fixtures de esa ejecución. Para concurrencia se requieren conexiones y PID distintos, observación de locks reales y aserciones sobre el resultado persistido. La reversión debe hacerse únicamente de la migración de entregas, con savepoints cuando sea posible y sin eliminar registros previos para sortear sus protecciones.

## Clasificación actual de npm audit

Se consultó npm audit en backend y frontend sin modificar manifiestos o lockfiles ni aplicar actualizaciones. Ambos reportes siguen devolviendo código 1 por hallazgos pendientes. Los conteos son paquetes afectados, no incidentes explotados; los avisos transitivos pueden compartir la misma causa.

Backend: **13 paquetes afectados: 3 altos, 10 moderados, cero críticos**.

| Dependencia / versión instalada | Gravedad | Posible solución que requiere revisión |
|---|---|---|
| `@louisbm/pgdump` 0.5.2 | Alta, por dependencia | Corregir o sustituir la cadena de extracción ZIP; comprobar respaldo y restauración. No aceptar automáticamente el downgrade a 0.4.0 propuesto por npm |
| `adm-zip` 0.5.18 | Alta | Buscar resolución fuera del rango afectado `<=0.6.0` y validar compatibilidad con su consumidor; cubre avisos de extracción, escritura y recursos de ZIP |
| `nodemailer` 7.0.13 | Alta | npm propone 10.3.1; migrar con pruebas de correo, destinatarios, TLS y opciones de transporte; no se aplicó el salto mayor |
| `archiver` 7.0.1 | Moderada, transitiva | Evaluar migración a 8.0.0 y pruebas de archivos y backups |
| `archiver-utils` 5.0.2 | Moderada, transitiva | Resolver junto con archiver/glob |
| `csv-parse` 6.2.1 | Moderada | Evaluar 7.0.3 y pruebas de importación, límites y errores de CSV |
| `glob` 10.5.0 | Moderada | Resolver versiones transitivas con archiver y evaluar su aviso de CLI |
| `minimatch` 3.1.5 / 5.1.9 / 9.0.9 | Moderada | Actualizar consumidores a una resolución compatible fuera del rango afectado `<11.0.1`; no forzar overrides de versiones mayores sin pruebas |
| `nodemon` 3.1.10 | Moderada, transitiva; desarrollo | Resolver minimatch con una versión compatible del consumidor. No aplicar el downgrade automático a 1.0.2 |
| `readdir-glob` 1.1.3 | Moderada, transitiva | Resolver la cadena de archiver/minimatch |
| `sequelize` 6.37.8 | Moderada, transitiva | Revisar corrección upstream de uuid y su alcanzabilidad; no retroceder a Sequelize 3.30.0 |
| `uuid` 8.3.2 | Moderada | Aviso sobre buffer explícito en v3/v5/v6; evaluar corrección upstream fuera del rango `<11.1.1` y probar API antes de cualquier override |
| `zip-stream` 6.0.1 | Moderada, transitiva | Resolver con la cadena de archiver |

Frontend: **14 paquetes afectados, todos moderados**.

| Dependencia / versión instalada | Gravedad | Posible solución que requiere revisión |
|---|---|---|
| `react-router` 6.30.6 | Moderada | npm propone la cadena 7.18.5; revisar navegación, enlaces y avisos de redirección/hidratación antes de migrar |
| `react-router-dom` 6.30.6 | Moderada, transitiva | Migración conjunta de React Router; pruebas de rutas protegidas y Checkout |
| `minimatch` 3.1.5 / 9.0.9 | Moderada | Actualizar la cadena de herramientas a una resolución compatible fuera del rango afectado; sin override mayor automático |
| `eslint` 9.38.0 | Moderada, transitiva; desarrollo | Resolver junto con typescript-eslint y minimatch; conservar configuración y reglas |
| `@eslint-community/eslint-utils` 4.9.0 | Moderada, transitiva; desarrollo | Resolver la cadena de ESLint |
| `@eslint/config-array` 0.21.1 | Moderada, transitiva; desarrollo | Resolver la cadena de ESLint/minimatch |
| `@eslint/eslintrc` 3.3.1 | Moderada, transitiva; desarrollo | Resolver la cadena de ESLint/minimatch |
| `@typescript-eslint/eslint-plugin` 8.46.2 | Moderada, transitiva; desarrollo | Actualizar el conjunto de herramientas compatible |
| `@typescript-eslint/parser` 8.46.2 | Moderada, transitiva; desarrollo | Actualizar el conjunto de herramientas compatible |
| `@typescript-eslint/type-utils` 8.46.2 | Moderada, transitiva; desarrollo | Actualizar el conjunto de herramientas compatible |
| `@typescript-eslint/typescript-estree` 8.46.2 | Moderada, transitiva; desarrollo | Resolver minimatch con actualización upstream |
| `@typescript-eslint/utils` 8.46.2 | Moderada, transitiva; desarrollo | Actualizar el conjunto de herramientas compatible |
| `typescript-eslint` 8.46.2 | Moderada, transitiva; desarrollo | No aplicar automáticamente el retroceso a 8.36.0 que propone npm |
| `eslint-plugin-react-refresh` 0.4.24 | Moderada, transitiva; desarrollo | npm no ofrece una corrección automática; revisar resolución upstream de ESLint y mantener la regla de Fast Refresh |

No se ejecutó `npm audit fix --force`. No se certificó alcanzabilidad o explotación de cada aviso; su mitigación y las pruebas reales siguen pendientes antes de aprobar despliegue.

## Archivos de esta etapa

```text
backend/scripts/preflightProductDeliveryNeon.js
backend/tests/productDeliveryNeonSafety.test.js
backend/tests/integration/productDeliveryNeon.target.example.json
docs/product-delivery-neon-validation.md
```

No cambiaron los archivos `.env`, configuración de producción, migraciones, servicios de negocio, dependencias ni arneses con destinos autorizados previamente. No hubo commit, push, merge o cambio de rama. No se arrancó el backend ni se realizaron pagos, correos o notificaciones reales.
