# Resultados reales de entregas en Neon — pagos-test

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

**Continuación:** el [informe de navegador y seguridad](product-delivery-browser-results.md) registra la configuración administrable, la segunda migración aditiva, pruebas Chrome y auditorías actualizadas. Las secciones siguientes conservan el detalle de validación de la migración original.

**Mercado Pago remoto:** la [validación final con HTTPS](product-delivery-mercadopago-https-results.md) añadió pagos auténticos, OXXO pendiente, conservación de evidencias y la corrección del desglose `transaction_amount`/`shipping_amount` encontrada al consultar al proveedor real.

Fecha: 2 de noviembre de 2026. Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama Git `feature/product-delivery-system`.

**Resultado: 27 escenarios aprobados, cero fallidos en la ejecución final contra PostgreSQL real. La migración queda aplicada en pagos-test, sin fixtures restantes y con todos los registros preexistentes preservados.**

## Destino y conexión comprobados

| Dato | Valor |
|---|---|
| Nombre de rama confirmado por el usuario | `pagos-test` |
| Proyecto identificado por PostgreSQL | `noisy-flower-34676790` |
| Rama identificada por PostgreSQL | `br-lively-math-akwgzcsr` |
| Endpoint identificado por PostgreSQL | `ep-long-snow-akwnltba` |
| Host directo | `ep-long-snow-akwnltba.c-3.us-west-2.aws.neon.tech` |
| Base / rol | `neondb` / `neondb_owner` |
| PostgreSQL | `17.11` |
| Transporte del cliente | TLS 1.3, certificado verificado |
| Huella del destino autorizado | `b9f1e49df2b08b5b3b98ac926fbd12073a8782b668d5ff0240c6f489b6716323` |

La conexión se habilitó después de la confirmación expresa del usuario de que las variables actuales pertenecen a su rama de pruebas `pagos-test`. La primera conexión ejecutó únicamente consultas de lectura. El servidor devolvió proyecto, ID de rama y endpoint mediante sus parámetros `neon.*`, y las conexiones posteriores comprobaron esa identidad antes de escribir.

El nombre visible de rama procede del usuario; no se consultó la API del plano de control ni las variables del hosting desplegado. No se afirma haber auditado independientemente esos despliegues. El acceso se limitó al endpoint de pruebas confirmado. Los flags y la allowlist del ejecutor rechazan cualquier otro host, base, rol, rama o endpoint.

Se leyó `backend/.env` únicamente mediante `dotenv.parse`, bajo el flag explícito `--use-authorized-env`. No se llamó a `dotenv.config()` para arrancar la aplicación, no se cambió `process.env` con secretos de la aplicación y no se imprimieron URLs completas, tokens o contraseñas. Se compararon los bytes del `.env` antes y después: sin cambios. No se modificó `frontend/.env`.

La configuración global de Sequelize conserva su comportamiento previo. El arnés exige `rejectUnauthorized: true`, hostname verificado y TLS mínimo 1.2 en sus propias conexiones. `pg_stat_ssl` del backend de Neon informó `ssl=false`; no se usó ese valor para inferir el transporte externo: el socket real del cliente confirmó cifrado, certificado autorizado y TLS 1.3. No se desactivó SSL para conectar.

## Migración aplicada y reversión real

Se revisaron el runner, sus conexiones y el catálogo real. Las migraciones históricas ya registradas no se reejecutaron ni revirtieron. Se aplicó únicamente:

`20261102000100-create-product-delivery-system.js`

En la primera ejecución se comprobó sobre PostgreSQL real, dentro de una transacción:

1. `up`: creación de la columna y de las cuatro tablas.
2. `down`: reversión con las tablas nuevas vacías; se comprobó que desapareció `Orders.shippingTotal` y que las tablas antiguas permanecieron.
3. `up`: reaplicación del esquema.
4. Registro de `SequelizeMeta` en **la misma transacción** que el DDL y commit final.

Las ejecuciones siguientes comprobaron que había una sola entrada de la migración y cuatro tablas presentes, y no volvieron a aplicar el DDL. No se cambió el runner global; el arnés específico hace atómico el registro de esta migración para evitar la ventana existente entre DDL y metadatos del runner habitual.

| Objeto | Resultado real |
|---|---|
| `core.UserAddresses` | Creada; FK de usuario, índice de usuario y unicidad parcial de predeterminada comprobados |
| `core.ShippingRates` | Creada; cobertura, importes no negativos, rangos, moneda e índice comprobados |
| `core.OrderFulfillments` | Creada; orden única, FKs, método, estado y consistencia de recogida comprobados |
| `core.FulfillmentEvents` | Creada; FKs, secuencia incremental e historial comprobados |
| `core.Orders.shippingTotal` | `NUMERIC(12,2) NOT NULL DEFAULT 0`; importes negativos rechazados |
| FKs de las tablas nuevas | Seis, comprobadas en el catálogo; violaciones reales SQLSTATE `23503` |
| Índices nuevos | Once índices presentes y válidos; violaciones de unicidad reales `23505` |
| Restricciones CHECK | Violaciones esperadas `23514` |
| `down` con datos de entrega | Rechazado con `P0001`; rollback conservó el esquema y los datos |
| `down` con envío distinto de cero y sin fulfillment | Rechazado con `P0001`; usuario y orden sintéticos se revirtieron íntegramente |

El último caso exigió primero que las tablas de entrega estuvieran vacías, creó un usuario y una orden sintéticos dentro de una transacción Sequelize real y comprobó la protección de `shippingTotal`. No vació tablas ajenas para forzar el rollback. La prueba con datos de entrega también se cerró con rollback. **La migración queda aplicada al terminar.**

## Operaciones y concurrencia probadas

- Direcciones: alta, consulta, edición, predeterminada, rechazo de dirección ajena, eliminación y snapshot de una compra inmune a esa eliminación.
- Tarifas: datos sintéticos, cobertura válida/inválida, costo calculado en servidor y rechazo de una cotización cuando cambia la tarifa.
- Recogida: costo cero; pago pendiente bloquea preparación; confirmación de pago, preparación, listo y recogido con fechas y responsable.
- Envío: snapshot, importe de envío separado del inventario, preparación, empaquetado, guía y paquetería obligatorias, expedición, incidencia, resolución y entrega.
- Incidencias: resolver una incidencia conserva la fecha de expedición original; el historial mantiene secuencias ordenadas incluso con horas próximas.
- Autorización: un cliente no puede invocar la transición administrativa; rechazos reales de la capa de servicios con 403/404/409/422 según el caso.
- Pagos: notificaciones repetidas producen un solo recibo, venta, reserva consumida y confirmación logística. El proveedor es simulado; la firma de webhook se verifica con el SDK real y un secreto efímero de pruebas.
- Cancelación pendiente: pago, reserva y fulfillment se cancelan/liberan juntos.
- Fallo transaccional: se inyectó un error después de insertar un recibo real. PostgreSQL revirtió pago, stock, movimiento y logística. El reintento confirmó correctamente.
- Membresías individuales y grupales: checkout y confirmación sin dirección ni fulfillment; la individual activa su suscripción y su historial, y la grupal conserva su flujo de grupo.
- Descuentos: productos, pago, orden y preferencia coinciden en centavos, incluido un descuento de 25,01 y envío de 75,00 que dan total 249,99.
- Órdenes anteriores: consulta con la asociación real de Sequelize, envío cero y fulfillment nulo.

En **cuatro carreras** se usaron dos instancias de Sequelize con pools independientes y una tercera conexión que retuvo el bloqueo. El monitor observó dos PID distintos bloqueados mediante `pg_stat_activity` y `pg_blocking_pids` **antes** de liberarlo:

| Carrera | Resultado |
|---|---|
| Dos direcciones predeterminadas del mismo usuario | Ambas operaciones terminan; queda una sola predeterminada |
| Dos checkouts con la misma clave | Una orden, un pago, una preferencia simulada, un fulfillment y una reserva |
| Dos webhooks del mismo pago | Un recibo y una confirmación logística |
| Dos transiciones administrativas con el mismo estado esperado | Un ganador y un conflicto 409; un solo evento |

Estas carreras no usaron el adaptador de modelos en memoria ni una cola que simule concurrencia. Los bloqueos y las restricciones se observaron en Neon.

## Protección y limpieza de datos existentes

El arnés persistió un manifiesto local **antes de cada INSERT**, con los identificadores asignados a los fixtures. La limpieza requiere el mismo destino, una lista de tablas revisada, IDs exactos y fechas posteriores al inicio de la ejecución; se realiza en una transacción. Se rechazan registros anteriores al manifiesto. No se ejecutó `TRUNCATE`, eliminación de esquemas completos ni limpieza por prefijos amplios.

Antes de probar se tomaron conteos y hashes de **42 tablas preexistentes**. Tras la limpieza coincidieron todos. Para comparar `Orders` se excluyó únicamente la columna nueva `shippingTotal`; para `SequelizeMeta`, únicamente la entrada nueva de esta migración. Las filas originales y sus demás campos permanecieron iguales.

Ejemplos de conteos preservados:

| Tabla | Filas originales conservadas |
|---|---:|
| `Users` | 1.143 |
| `Orders` | 17.212 |
| `Payments` | 9.463 |
| `UserSubscriptions` | 1.113 |
| `OrderNumberCounters` | 1 |

**`remainingFixtures: 0` y `existingRecordsUnchanged: true`.** Los productos sintéticos usaron IDs explícitos para no avanzar las secuencias históricas del catálogo. La numeración comercial de órdenes se sustituyó por números `PGDEL-...` en el arnés para no alterar `OrderNumberCounters`. Los modelos, asociaciones, SQL, transacciones y servicios de negocio se ejecutaron contra PostgreSQL real.

Un postflight adicional de solo lectura confirmó que **las cuatro tablas nuevas completas estaban vacías**, no solo los IDs del manifiesto, que las 17.212 órdenes conservadas tenían envío cero y que seguía existiendo una sola entrada de la migración. No se añade ese postflight al conteo de 27 escenarios.

No se arrancó el backend, cron, correo o notificaciones. Los constructores de acceso remoto de Mercado Pago están bloqueados en el contexto del arnés. No se crearon preferencias remotas, compras, pagos ni reembolsos reales.

## Resultados exactos y errores corregidos

Ejecución final contra Neon: **27 escenarios aprobados, 0 fallidos**. Inicio `2026-11-02T22:50:59.651Z`; final `2026-11-02T22:53:08.568Z` (UTC). Son grupos de comprobaciones reales de SQL y servicios; no se suman como pruebas unitarias del proveedor.

Durante la preparación hubo **dos fallos anteriores del arnés**, corregidos antes de la ejecución final:

1. El conteo esperado de FKs era siete; la migración define seis. Se corrigió la aserción, sin cambiar el esquema.
2. La allowlist de limpieza omitía `PaymentWebhookEvents`. La protección detuvo la limpieza antes de borrar. Se incluyó la tabla, se agregó una prueba de regresión y se recuperó la ejecución con su manifiesto. La recuperación confirmó cero fixtures y hashes originales intactos.

No se detectó un error funcional nuevo del sistema de entregas que exigiera modificar servicios o la migración en esta etapa.

| Suite local, sin PostgreSQL remoto | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| Backend completo | 271 | 0 | 0 |
| Frontend | 10 | 0 | 0 |
| PowerShell | 30 | 0 | 0 |
| **Total local, sin duplicar repeticiones** | **311** | **0** | **0** |

Las 271 del backend incluyen ocho pruebas nuevas de autorización, TLS, identidad, flags y limpieza del arnés real, además de las pruebas existentes. ESLint del frontend y de los JS nuevos, TypeScript y sintaxis JS pasaron. `git diff --check` pasó. La compilación frontend no se repitió en esta etapa; su resultado anterior no se contabiliza como una ejecución nueva.

### Evidencias locales

- [Manifiesto final: 27/0 y limpieza](../backend/storage/test-reports/product-delivery-neon/5ef651c9-3840-4b34-8e6a-573ba433800a.json).
- [Primera aplicación, down y reaplicación reales](../backend/storage/test-reports/product-delivery-neon/42dfc5a7-b1eb-4987-8e05-773908136fa4.json). Contiene el primer error de conteo posterior al DDL; no se borró la evidencia.
- [Ejecución anterior y recuperación de limpieza](../backend/storage/test-reports/product-delivery-neon/52c4b170-42ee-4f37-8a84-a46c9f03a5f2.json).
- [Postflight final de solo lectura](../backend/storage/test-reports/product-delivery-neon/postflight-5ef651c9-3840-4b34-8e6a-573ba433800a.json).

Los manifiestos permanecen en disco y se ignoran en Git. No contienen URL, contraseña ni secretos del proveedor. Sí contienen IDs de fixtures y hashes/conteos de tablas para poder verificar y recuperar una ejecución.

## npm audit y pendientes de despliegue

Se volvió a ejecutar `npm audit` en ambos proyectos sin aplicar actualizaciones:

| Proyecto | Críticos | Altos | Moderados | Total |
|---|---:|---:|---:|---:|
| Backend | 0 | 3 | 10 | 13 |
| Frontend | 0 | 0 | 14 | 14 |

La auditoría sigue fallando con código 1. Los altos corresponden a `@louisbm/pgdump`, su dependencia `adm-zip` y `nodemailer`. La clasificación detallada por versión, cadena y solución posible permanece en [la preparación de Neon](product-delivery-neon-validation.md#clasificación-actual-de-npm-audit). No se aplicó `npm audit fix --force`, downgrades ni saltos incompatibles.

Antes de desplegar:

1. Resolver o justificar los avisos de seguridad y verificar las actualizaciones con pruebas de correo, backups, importaciones, ORM y navegación.
2. Completar el recorrido visual y los pagos con cuentas de prueba de Mercado Pago en el entorno de desarrollo; el proveedor remoto no se ejercitó aquí. El reembolso remoto de una orden con envío también sigue pendiente.
3. Validar permisos del rol runtime **del destino de despliegue**, incluidas las tablas nuevas y la secuencia de eventos; el rol probado aquí fue `neondb_owner`. No se inspeccionó ni modificó el hosting de producción.
4. Configurar tarifas y datos de recogida adecuados al entorno. Los datos sintéticos se eliminaron; la migración no siembra tarifas reales.
5. En un despliegue posterior autorizado, aplicar el esquema antes de iniciar el backend nuevo y después desplegar frontend. Conservar el esquema y auditoría si se revierte código tras utilizar entregas.

## Ejecutar y revisar el arnés

Desde `backend`, el modo predeterminado es un plan sin conexión:

```powershell
npm.cmd run verify:delivery-neon
```

Una ejecución con escritura exige los flags explícitos y la misma rama autorizada. No reutilizar este comando en otra rama o cuando el endpoint esté compartido con producción:

```powershell
node --use-system-ca --experimental-vm-modules scripts/verifyProductDeliveryNeon.js --run --use-authorized-env --confirm-database b9f1e49df2b08b5b3b98ac926fbd12073a8782b668d5ff0240c6f489b6716323 --confirm-branch br-lively-math-akwgzcsr
```

El caso aislado de rollback exige las tablas nuevas vacías. El arnés se detiene si existen datos que deban conservarse; no los elimina para hacer pasar la prueba. Un nuevo destino requiere revisión y autorización propia. El verificador local `verifyProductDeliveryPostgres.js` y el arnés histórico de Mercado Pago conservan sus allowlists originales; no se aflojaron para permitir Neon.

### Archivos cambiados en la ejecución real

```text
backend/.gitignore
backend/package.json
backend/scripts/verifyProductDeliveryNeon.js
backend/tests/integration/productDeliveryNeonSupport.js
backend/tests/integration/productDeliveryNeonScenarios.js
backend/tests/productDeliveryNeonIntegrationSafety.test.js
docs/product-delivery-neon-results.md
docs/product-delivery-neon-validation.md
docs/product-delivery-system.md
docs/product-delivery-review.md
```

No se cambiaron `.env`, migraciones históricas, servicios de negocio, dependencias o el repositorio anterior. No hubo commit, push, merge ni cambio de rama.
