# Revisión del sistema de entregas

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

**Estado más reciente:** la revisión de navegador y configuración se documenta en [product-delivery-browser-results.md](product-delivery-browser-results.md). Incluye las correcciones posteriores del carrito, configuración de recogida y dependencias. Las cifras de pruebas y audit de este documento describen la revisión local anterior.

**Actualización posterior a esta revisión local:** se ejecutaron las pruebas en Neon `pagos-test`, con migración, rollback y concurrencia reales: 27 escenarios aprobados y cero fallidos en la ejecución final. El [informe de PostgreSQL real](product-delivery-neon-results.md) contiene los resultados actuales; este documento conserva la evidencia de la revisión local anterior.

Fecha: 2 de noviembre de 2026. Revisión local sobre `D:\Escritorio\pry_TinaniumSportGymWeb`.

Repositorio verificado: `https://github.com/CASTROMJRM/pry_TinaniumSportGymWeb.git`.
Rama verificada: `feature/product-delivery-system`.
HEAD: `edac327524df0551a0f36321fa9655ec46bb488d`.

Se revisaron los 39 archivos del traslado: 17 modificados y 22 nuevos, incluido el helper de pruebas. Se revisaron también los contratos actuales de modelos, rutas, autenticación, inventario, promociones, pagos, membresías y migraciones que usan esos archivos.

## Errores corregidos

1. **Idempotencia al renovar cotizaciones.** El frontend incluía el JWT completo en la identidad del intento y el backend comparaba ese token literalmente. Una nueva firma del mismo contenido cambiaba la clave del navegador o producía un 409 con la clave original. Ahora ambos usan el digest del contenido cotizado. El backend sigue validando algoritmo, firma, audiencia y propietario. Solo al recuperar una operación existente acepta que el token esté vencido; crear una orden nueva sigue requiriendo una cotización vigente. Cambiar productos, dirección, tarifa o importe conserva la protección de conflicto.
2. **Fechas de incidencias.** Regresar al estado anterior sobrescribía la fecha real de preparación, empaquetado o expedición. Resolver la incidencia conserva esa fecha. Reexpedir después de una entrega fallida actualiza la fecha y la guía; cancelar desde una incidencia registra su fecha de cancelación.
3. **Protección de rollback.** `down` comprobaba datos en las tablas nuevas, pero no importes de envío en órdenes que pudieran existir sin fulfillment. Ahora también protege esos importes y bloquea las tablas antes de verificar, evitando una carrera con escrituras concurrentes. El verificador local incorpora escenarios de rollback vacío y protección de importes. Estos escenarios SQL están preparados, pero no se ejecutaron sin PostgreSQL local.
4. **ESLint del backend.** Se corrigieron dos variables sin uso y se expresó el rechazo de caracteres de control sin la expresión regular señalada por ESLint, conservando su comportamiento.
5. **Dependencias con avisos de seguridad.** Se actualizaron ambos lockfiles con correcciones dentro de los rangos actuales mediante `npm audit fix --ignore-scripts`, sin `--force`. No cambiaron los rangos de dependencias de los manifiestos.
6. **Documentación trasladada.** Se corrigieron las rutas que todavía apuntaban a `D:\Escritorio\prueba` y se sustituyeron los resultados anteriores por los de esta revisión.

## Pruebas y comprobaciones ejecutadas

Entorno: Node.js `24.21.0`, PowerShell en Windows. Instalación reproducida con `npm.cmd ci` en ambos proyectos. Se usaron certificados confiables del sistema para las consultas a npm, sin desactivar TLS. No se modificaron archivos `.env`.

| Comprobación | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| Backend: `npm.cmd test` | 247 | 0 | 0 |
| Frontend: `npm.cmd test` | 10 | 0 | 0 |
| PowerShell: `mercadoPagoPostgresLauncherSafety.test.ps1` | 30 | 0 | 0 |
| **Total de casos distintos** | **287** | **0** | **0** |

Las **36 pruebas de entregas están incluidas en las 247 del backend**. Su ejecución específica con cobertura también pasó; no se suman de nuevo. La matriz de transiciones central pasó 141 comprobaciones adicionales: 46 transiciones válidas, 83 inválidas y 12 casos explícitos; tampoco se incluyen como pruebas unitarias adicionales.

La ejecución inicial de las 239 pruebas trasladadas pasó. Durante el trabajo se corrigieron además dos aserciones nuevas y un bloqueo de procesos del sandbox antes de obtener los resultados finales anteriores. Las cifras finales no acreditan PostgreSQL real ni pagos externos.

| Comprobación adicional | Resultado |
|---|---|
| ESLint frontend: `npm.cmd run lint` | Sin errores ni advertencias |
| ESLint backend | Sin errores ni advertencias en los 24 archivos JS trasladados, usando reglas recomendadas y globals de Node en una configuración temporal |
| TypeScript: `node node_modules/typescript/bin/tsc -b` | Aprobado |
| Frontend: `npm.cmd run build` | Aprobado; advertencia por chunk mayor de 500 kB. Bundle principal aproximado: 1.677 kB, 469 kB gzip |
| Sintaxis: `node --check` | Aprobada en los 24 archivos JS trasladados |
| Resolución estática de importaciones | 1.341 importaciones comprobadas; ninguna faltante en backend o frontend/src |
| `npm.cmd ls --depth=0` | Aprobado en backend y frontend |
| Asociaciones Sequelize | Modelos reales cargados sin conexión; validados propietarios, fulfillment único por orden, actores, tarifas e historial con `separate: true` |
| `git diff --check` | Aprobado |
| Plan de integración PostgreSQL | Solo se consultó `--plan`; nueve escenarios preparados, cero conexiones y cero escrituras |

Las pruebas nuevas usan servicios reales sobre un adaptador de modelos aislado, HTTP local con Express y middleware real, definiciones reales de Sequelize y renderizado estático de TSX con React. No certifican aislamiento ni bloqueos PostgreSQL. El adaptador serializa transacciones; la prueba de checkout concurrente ejercita el conflicto de clave única simulado, sin acreditar concurrencia real de la base.

Cobertura de líneas medida con `--experimental-test-coverage` para el módulo de entregas: controlador, direcciones, fulfillment, tarifas y validación alcanzan el 100 %. La cobertura de ramas varía entre el 77,42 % y el 92,86 % en esos archivos. La cobertura de definiciones de modelos o de la función que emite SQL **no significa que ese SQL se haya ejecutado**. El script de PostgreSQL permanece pendiente en su parte de conexión y DDL. El renderizado estático tampoco sustituye interacciones de navegador.

## Mercado Pago y membresías

- Se conserva Checkout Pro con `mercadopago@3.2.0`. La preferencia incluye envío separado mediante `shipments.cost` y `mode=not_specified`, conforme a la [documentación oficial](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-settings/shipping-cost).
- Las pruebas verifican igualdad en centavos entre productos con descuento, envío, orden, pago y preferencia; envío gratuito explícito; cobertura inclusiva, más específica o ambigua; y rechazo de importes, moneda o activación inválidos.
- Se prueban firmas de webhook, notificaciones duplicadas, pago rechazado, rollback al fallar el recibo, reservas, venta única y transición logística única después de confirmar pago.
- Las membresías conservan `/api/checkout/mercadopago`; no requieren dirección, cotización ni fulfillment. Se verificaron el renderizado de su página, el adaptador frontend y la activación backend. Los productos del frontend usan `/api/checkout/products/mercadopago`.
- La ruta antigua de productos sigue admitiendo clientes existentes sin entrega, tal como documentaba el traslado. La nueva ruta web exige entrega cotizada. Los pedidos históricos conservan envío cero y fulfillment nulo.
- La página de retorno continúa consultando el estado en el servidor; los parámetros de la URL no confirman un pago. Los reembolsos y las cancelaciones logísticas conservan flujos separados.

**Compatibilidad verificada mediante pruebas locales y revisión del contrato. No se creó una preferencia remota, no hubo compras o pagos reales y no se ejecutó un recorrido completo con cuentas de prueba del proveedor.** Los scripts históricos que importan la configuración de la aplicación y escriben fixtures en la base configurada no se ejecutaron.

## Estado de la migración

`20261102000100-create-product-delivery-system.js` es estructuralmente compatible con las definiciones existentes: esquema `core`, claves UUID de `Users` y `Orders`, importes DECIMAL(12,2), timestamps y ejecución transaccional mediante el runner actual. La columna nueva deja envío cero en órdenes históricas; no reescribe pagos ni migraciones previas. Incluye claves foráneas, índice parcial de dirección predeterminada, orden único por fulfillment, secuencia estable de eventos y restricciones por método y estado.

**No se ejecutó ninguna migración ni se conectó a Neon o producción.** No se encontró PostgreSQL local y Docker no tiene un daemon activo. No se certificaron restricciones, permisos, locks, rollback ni compatibilidad con el estado físico de una base real. El verificador exige loopback literal, base dedicada `titanium_delivery_test`, flags explícitos y ausencia de esquema `core`; termina con rollback. Su rechazo de destinos inseguros está probado.

Aplicar la migración de desarrollo antes de iniciar el backend nuevo. Los listados y la confirmación de pagos ya usan las tablas nuevas; omitir este paso rompería esas consultas. Revisar permisos runtime sobre las cuatro tablas y `USAGE` de la secuencia de eventos. Mantener desactivado `SEQUELIZE_SYNC_ON_START` en bases compartidas. Tras usar el módulo, revertir código conservando el esquema y la auditoría.

## Seguridad pendiente

| Auditoría npm | Antes | Después |
|---|---|---|
| Backend | 35 paquetes afectados: 1 crítico, 18 altos, 15 moderados, 1 bajo | 13: 3 altos, 10 moderados; cero críticos |
| Frontend | 21: 16 altos, 4 moderados, 1 bajo | 14 moderados; cero altos o críticos |

La auditoría final de npm sigue devolviendo código 1 por estos avisos; **no está aprobada**. Los tres altos del backend corresponden a `@louisbm/pgdump`, su dependencia `adm-zip` y `nodemailer`. También quedan avisos en archivado, CSV, UUID/Sequelize y herramientas de desarrollo. En frontend quedan React Router y la cadena de ESLint/minimatch. Son dependencias anteriores al traslado: el módulo no agregó paquetes de producción.

Las propuestas automáticas restantes incluyen cambios incompatibles, y algunas sugieren retroceder Sequelize a 3.x o nodemon a 1.x. No se aplicaron: requieren una solución revisada y pruebas de las funciones existentes de respaldo, correo, importación, ORM y navegación. El conteo representa paquetes afectados según npm, no incidentes explotados ni un análisis de alcanzabilidad. **No aprobar producción hasta resolver o justificar estos hallazgos y ejecutar la integración pendiente.**

La revisión del código nuevo verificó autorización administrativa, pertenencia de direcciones y pedidos, sesiones, cálculo de importes en servidor, snapshots, firmas y caducidad de cotizaciones, transacciones e idempotencia. Las nuevas pruebas comprueban esos límites. No se observó una vía directa nueva para modificar tarifas como cliente, consultar domicilios ajenos o marcar entregas sin pago completo.

## Archivos modificados durante esta revisión

Estos 17 archivos recibieron cambios en esta revisión; los demás archivos del traslado se revisaron sin editarse:

```text
backend/migrations/20261102000100-create-product-delivery-system.js
backend/package-lock.json
backend/scripts/verifyProductDeliveryPostgres.js
backend/services/fulfillmentService.js
backend/services/mercadoPagoCheckoutService.js
backend/services/shippingService.js
backend/tests/mercadoPagoConfirmation.test.js
backend/tests/productDelivery.test.js
backend/utils/deliveryValidation.js
frontend/package-lock.json
frontend/package.json
frontend/src/pages/CheckoutPage.tsx
frontend/src/utils/productCheckoutAttempt.ts
frontend/tests/deliveryViews.test.mjs
frontend/tests/productCheckoutAttempt.test.mjs
docs/product-delivery-system.md
docs/product-delivery-review.md
```

Los cuatro archivos nuevos de esta revisión son el helper frontend, sus dos archivos de pruebas y este informe. Además se modificaron dos lockfiles y frontend/package.json que no estaban entre los 39 iniciales. En total quedan 46 archivos nuevos o modificados respecto de HEAD. No hubo commit, push, merge, cambio de rama, modificación del repositorio anterior ni edición de `.env`.

## Pendiente para desarrollo y despliegue

1. Preparar PostgreSQL aislado de desarrollo, partiendo del esquema base existente; el runner histórico no crea todas las tablas base desde cero. Ejecutar primero el verificador de esquema en una base local vacía dedicada y después el flujo de negocio completo en una base de desarrollo. No usar Neon o producción para esta revisión.
2. Comprobar migración, permisos y secuencia en esa base; probar índices únicos y concurrencia real de checkout, webhooks, direcciones predeterminadas, cancelación y actualizaciones administrativas.
3. Configurar dirección y teléfono reales de recogida y tarifas/cobertura. Usar credenciales y cuentas de prueba de Mercado Pago, frontend/backend de desarrollo y un webhook HTTPS alcanzable. No realizar pagos reales.
4. Recorrer en navegador recogida, envío, direcciones guardadas, cotización renovada/vencida, fallo y reintento de pago, estados, incidencia y reexpedición. Probar membresías individuales y grupales, pedidos antiguos y reembolsos incluyendo envío. La lógica existente se revisó, pero el reembolso remoto de una orden con envío sigue pendiente de prueba.
5. Resolver los avisos de seguridad pendientes con una actualización revisada. Repetir pruebas, lint, TypeScript y build después de esos cambios.
6. En un despliegue posterior autorizado: respaldo, migración antes del backend, backend antes del frontend, verificación del webhook y monitoreo. Conservar el esquema aditivo si se revierte el código. Esta revisión no realiza ese despliegue.
