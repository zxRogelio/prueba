# Entregas: configuración, navegador y seguridad

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

**Validación posterior completada:** el [informe de Mercado Pago remoto con HTTPS](product-delivery-mercadopago-https-results.md) acredita pagos auténticos de prueba, firmas válidas, OXXO pendiente y la corrección del desglose monetario observada en el proveedor real. Las secciones siguientes conservan la fase anterior con proveedor simulado.

Fecha: 2 de noviembre de 2026. Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama `feature/product-delivery-system`.

## Resultado y alcance

La recogida dispone de configuración administrativa completa. Las tarifas existentes permiten administrar cobertura y precios. Se verificaron recorridos reales de Chrome contra controladores, autenticación, servicios y Sequelize conectados al PostgreSQL real de `pagos-test`.

**Los pagos del recorrido de navegador usan un proveedor simulado, anunciado en la página y en los nombres de las pruebas. No equivalen a una compra remota con Mercado Pago.** La consulta remota de identidad del vendedor sí se ejecutó: HTTP 200, vendedor esperado y etiqueta `test_user`. El usuario confirmó que tiene vendedor y comprador de prueba, pero no webhook HTTPS dedicado. El extremo a extremo remoto queda pendiente por ese motivo; no se crearon preferencias ni pagos en Mercado Pago.

## Configuración administrable

En `/admin/pedidos` → **Configuración de recogida en gimnasio** se pueden guardar nombre, dirección completa, municipio, estado, CP, teléfono, horarios e instrucciones; también se puede desactivar la recogida. GET/PUT `/api/admin/pickup-settings` requieren sesión y rol administrador.

Los datos se guardan en `core.AboutPages.pickupSettings`, normalmente en `slug=main`. El backend valida campos, longitudes, teléfono y CP de cinco dígitos, normaliza la entrada y registra actor y fecha. Un bloqueo transaccional serializa la primera creación y las ediciones. El formulario no sustituye los campos de marketing `ctaAddress`/`ctaPhone`. Antes de completar la configuración sigue disponible el contacto antiguo real, si existe; no se inventan municipio, horarios ni direcciones.

El checkout muestra la ubicación y las instrucciones. Cada pedido conserva su snapshot para que las ediciones posteriores no cambien lo acordado. Ningún dato sintético se guardó en la configuración real: el navegador utilizó una fila `AboutPages` con slug propio, eliminada al finalizar. **El administrador debe introducir los datos auténticos antes de ofrecer el servicio con la información completa.**

La pantalla existente de **Tarifas y cobertura de envíos** se reutiliza para crear/editar nombre, importe MXN, CP inicial/final y estado activo. Una tarifa inactiva no permite cotizar; fuera de cobertura se rechaza el pago. El servidor conserva la prioridad del rango más específico y bloquea ambigüedades. No se sembraron tarifas para uso real.

## Migraciones y preservación de datos

`20261102000100-create-product-delivery-system.js` permanece aplicada en `pagos-test` y conserva su validación SQL anterior. Se agregó `20261102000200-add-pickup-settings-to-about-pages.js`: una columna JSONB nullable, sin alterar los contactos históricos ni cargar ubicaciones.

La nueva migración se probó en PostgreSQL real mediante `up → down → up`, con registro de `SequelizeMeta` en la misma transacción. Evidencia inicial: `backend/storage/test-reports/product-delivery-neon/0c079e88-9b78-4b31-a1f1-828007d66459.json`. Ese intento aplicó y verificó la migración; después falló la inicialización del servidor de navegador por una dependencia del arnés. La limpieza y los hashes de registros originales pasaron. No se presenta ese intento como una prueba de navegador exitosa.

También se probó el rechazo de `down` con configuración sintética guardada: SQLSTATE `P0001`, rollback y columna conservada. La migración queda aplicada. Para revertir código con configuración existente se debe conservar la columna; no se debe borrar información para forzar un rollback.

Todas las conexiones comprobaron TLS y la identidad SQL de la rama `br-lively-math-akwgzcsr`, endpoint `ep-long-snow-akwnltba`. Los fixtures se registran antes de insertar; las escrituras del arnés rechazan identificadores ajenos y la limpieza exige ID exacto y fecha de creación de esta ejecución. Se compararon hashes de las 42 tablas originales y los bytes de ambos `.env`. Permanecieron intactos, entre otros, 1.143 usuarios, 17.212 órdenes, 9.463 pagos y 1.113 suscripciones.

## Pruebas ejecutadas

| Comprobación | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| Backend `npm.cmd test` | 279 | 0 | 0 |
| Frontend `npm.cmd test` | 12 | 0 | 0 |
| Launcher PowerShell | 30 | 0 | 0 |
| Chrome + PostgreSQL, última ejecución | 8 | 0 | 0 |
| Regresión PostgreSQL/concurrencia de esta revisión | 27 | 0 | 0 |

Las pruebas de seguridad del ejecutor, las cuatro de configuración de recogida y la extracción real de un archivo de prueba con la dependencia de respaldos están incluidas en las 279 backend. Las dos regresiones del carrito están incluidas en las 12 frontend. Las repeticiones para corregir errores no se suman como casos adicionales. La regresión SQL quedó registrada en `backend/storage/test-reports/product-delivery-neon/0b41bcd4-926d-4e78-b87f-c0eb4332a977.json`: cuatro carreras con dos procesos PostgreSQL bloqueados antes de liberar el acceso, cero fixtures restantes y registros originales intactos.

La pasada de navegador comprende ocho casos:

1. Login administrativo real y guardado de los ocho campos de recogida.
2. Crear/editar/desactivar/reactivar tarifa y rechazo real de cotización inactiva y acceso administrativo desde cliente.
3. Login de cliente, producto añadido desde catálogo, carrito conservado al recargar, recogida gratuita, total confirmado, checkout simulado aprobado y webhook duplicado firmado.
4. Administrador: preparación → listo → recogido; cliente: pedido, ubicación e historial.
5. Domicilio: dirección nueva, rechazo sin cobertura, envío $75, producto $100, total $175, dirección guardada y aprobación simulada.
6. Preparación → empaquetado → enviado con guía obligatoria → entregado; seguimiento visible en el cliente y actualización manual.
7. Rechazo simulado: pago fallido y preparación bloqueada en UI y API.
8. Membresía: formulario y solicitud sin domicilio/entrega, preferencia simulada de $300 y cero fulfillment.

Los importes anteriores son exclusivamente fixtures, no tarifas propuestas para Titanium. Se revisan en centavos los productos más `shipments.cost` antes de aceptar cada preferencia simulada. Después del navegador se comprueba que las dos compras aprobadas tienen dos recibos y dos movimientos de venta, stock final 98 desde 100, y que el webhook duplicado no incrementa esos registros.

Ejecución final: `21e20061-60a9-4160-806f-30b528436986`, 8/8 en 82 segundos, sin reintentos, omitidas ni resultados inestables. El manifiesto confirma protección del rollback de recogida, cuatro preferencias simuladas, cero fulfillment de membresía, cero fixtures y hashes originales intactos. La pasada anterior `8e708986-67f8-453f-90f7-207d2f786f90` también pasó 8/8; no se suma de nuevo.

- [Manifiesto final del navegador](../backend/storage/test-reports/product-delivery-neon/21e20061-60a9-4160-806f-30b528436986.json).
- [Informe HTML de Playwright](../backend/storage/test-reports/product-delivery-neon/browser-21e20061-60a9-4160-806f-30b528436986/html/index.html).
- [Resultados JSON de Playwright](../backend/storage/test-reports/product-delivery-neon/browser-21e20061-60a9-4160-806f-30b528436986/results.json).
- Capturas de configuración, cotización, recogida e historial de entrega: subdirectorio `artifacts` de esa ejecución.

Se ejecuta Chrome instalado, headless, con perfiles nuevos, dos contextos separados y sin sesiones personales. El frontend se sirve con Vite y la API local monta las rutas/controladores reales; el entrypoint de producción no se arranca porque activa trabajos automáticos sobre registros existentes. No se ejecutan correos, subidas a Cloudinary ni llamadas remotas de pago. El navegador bloquea destinos externos. Recomendaciones ML y páginas ajenas a los recorridos no se acreditan como probadas: en este arnés el servicio ML no está disponible y su petición falla sin bloquear la compra. Se conservaron sus implementaciones.

### Verificaciones de código

| Comprobación | Resultado |
|---|---|
| ESLint frontend completo | Sin errores ni advertencias |
| ESLint backend, 39 JS modificados/nuevos | Sin errores ni advertencias; reglas recomendadas, globals Node y argumentos `_` permitidos |
| TypeScript aplicación y configuración Vite | Aprobado con `tsc -b` |
| TypeScript configuración y pruebas Playwright | Aprobado con comprobación estricta explícita |
| Compilación frontend | Aprobada; chunk principal 1.680,39 kB, 469,75 kB gzip; advertencia por superar 500 kB |
| Árbol de dependencias backend y frontend | `npm.cmd ls --depth=0` sin dependencias faltantes |

## Errores corregidos

- Faltaba una configuración específica de horarios, municipio, CP e instrucciones de recogida: se agregó formulario, servicio, API y migración aditiva.
- Chrome detectó que la recarga podía vaciar el carrito con el montaje repetido de React en desarrollo. La lectura de localStorage ahora inicializa el estado antes del efecto de persistencia; se agregó regresión de render inicial y el recorrido Chrome recarga la página después de añadir el producto.
- Se corrigieron los tres avisos altos del árbol de npm mediante la dependencia ZIP corregida y la retirada de correo sin uso activo; véanse los límites sobre los CLI empaquetados más abajo.
- En la preparación del arnés se corrigieron el alias de `crypto`, la identidad estable de eventos duplicados, los selectores de controles y el total mostrado por el proveedor simulado incluyendo el envío. Los intentos fallidos se conservaron en informes locales; no se acreditaron como aprobados.

Antes del cierre hubo cuatro pasadas de Chrome fallidas: 2/1/5, 2/1/5, 3/1/4 y 7/1/0 (aprobadas/fallidas/omitidas). La primera encontró el defecto del carrito; las otras correspondieron al arnés. La inicialización fallida por `crypto` no llegó a ejecutar Chrome. Todos esos intentos terminaron con cero fixtures y preservación de registros originales. La tabla anterior corresponde únicamente a las ejecuciones finales.

## Mercado Pago remoto

Se añadió `npm.cmd run verify:mercadopago-test-seller -- --check-test-seller --use-authorized-env`. Solo consulta `GET https://api.mercadopago.com/users/me`, sin guardar la respuesta personal ni imprimir credenciales. Evidencia: `backend/storage/test-reports/mercadopago-test-seller.json`: HTTP 200, identidad coincidente y vendedor `test_user`, preferencias creadas 0, pagos creados 0.

No se cambiaron automáticamente `sandbox=false` ni `live_mode=true`: esas banderas no sustituyen la verificación del propietario de las credenciales. El usuario confirmó la cuenta de prueba y la API confirmó su etiqueta. El SDK, la validación real de firmas y los servicios actuales siguen funcionando en las pruebas locales/SQL; la prueba remota integral **no fue ejecutada**.

Para completarla:

1. Disponer de un backend de desarrollo dedicado y sin tareas automáticas que puedan modificar registros ajenos. Conectarlo exclusivamente a la rama de pruebas verificada, con credenciales de vendedor de prueba. No publicar el servidor `__test` de esta suite: su proveedor es simulado.
2. Asignarle un origen HTTPS de desarrollo mediante hosting separado o túnel. Registrar en la aplicación de prueba del proveedor la URL `https://<origen-de-pruebas>/api/webhooks/mercadopago`, eventos de pagos y su secreto de firma. La URL no debe apuntar al Render publicado actual.
3. Inyectar `BACKEND_PUBLIC_URL`, `FRONTEND_URL`, `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` en ese proceso aislado, mediante entorno o almacén seguro de pruebas. No editar ni reutilizar secretos o URLs de producción. El proveedor genera la firma: no deshabilitar su validación ni usar el secreto efímero de esta suite.
4. Acceder al checkout real desde una sesión separada del comprador de prueba que el usuario ya tiene. Usar las tarjetas y escenarios actuales del proveedor (`APRO` y `OTHE`), sin tarjetas ni dinero reales. Seguir la [guía oficial de compras de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases).
5. Verificar preferencia remota con productos y envío exactos, redirección, webhook firmado con respuesta 200, pago/orden y logística confirmados transaccionalmente, un recibo y venta por orden, notificación repetida sin duplicados, rechazo sin preparación y membresía sin domicilio. Conservar evidencia sanitizada de IDs y estados. La [configuración oficial de notificaciones](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/payment-notifications) describe la entrega y autenticación de webhooks.

## Seguridad de dependencias

| Proyecto | Críticas | Altas | Moderadas | Bajas |
|---|---:|---:|---:|---:|
| Backend, auditoría actual | 0 | 0 | 10 | 0 |
| Frontend, auditoría actual | 0 | 0 | 14 | 0 |

Las dos auditorías se consultaron en el registro npm con TLS verificado. Los informes JSON están en `backend/storage/test-reports/backend-audit-browser-review.json` y `frontend-audit-browser-review.json`. Una primera consulta falló por el certificado del proxy; la repetición usó el almacén de certificados del sistema, sin desactivar TLS. npm sigue reportando avisos: no se declara aprobada la auditoría.

### Tres altos anteriores

| Dependencia | Uso y corrección |
|---|---|
| `adm-zip` 0.5.x | Dependencia transitiva del instalador de binarios `@louisbm/pgdump`, no del checkout. Override limitado a esa cadena: `^0.6.1`, instalado 0.6.1. Se verificó la extracción real mediante `handleUnzipFolder`, incluida la distribución de archivos del binario y borrado del ZIP. No se ejecutó un respaldo/restauración real. |
| `@louisbm/pgdump` 0.5.2 | Era un aviso heredado por depender de ZIP vulnerable. Se conserva el aprovisionamiento de respaldos y su versión, con dependencia corregida. Las rutas del sistema invocan el ejecutable nativo, no los CLI Node del paquete. |
| `nodemailer` 7.0.13 | La única referencia fuente estaba dentro de un bloque comentado en `utils/sendOTP.js`; no existía importación activa. Se retiró la dependencia directa. Los envíos activos de Brevo/Resend se conservan. |

**Limitación adicional que npm audit no refleja:** los ejecutables empaquetados `@louisbm/pgdump/bin/pgdump.cjs` y `pgdump-fetch-binary.cjs` contienen una copia interna de adm-zip 0.5.16 que el override no recompila. Ni el instalador `dist/scripts/fetch-binary.js` probado ni las rutas de respaldo actuales usan esa copia. Se debe evitar invocar esos CLI empaquetados y solicitar/validar una versión que los regenere, o sustituir el aprovisionamiento por PostgreSQL nativo antes de utilizarlos. El resultado de cero altos del árbol npm no significa que esa copia interna se haya reparado.

### Moderadas pendientes

| Dependencias afectadas | Alcance observado | Posible solución evaluable |
|---|---|---|
| Backend: `csv-parse` | Ruta administrativa de importación CSV usa `columns:true`; la alerta de prototipos es pertinente a esa entrada. No interviene en entregas. | Evaluar 7.0.3 y regresión de columnas/importación; opcionalmente endurecer nombres de encabezados. No cambiar una versión mayor sin esas pruebas. |
| Backend: `sequelize` → `uuid` | Sequelize usa v1/v4; el aviso describe v3/v5/v6 con buffer proporcionado, sin llamada equivalente encontrada en los flujos revisados. Es dependencia de runtime, no se ignora la alerta. | Esperar cadena corregida o validar actualización/override compatible con CJS y sus pruebas. No aplicar la degradación de Sequelize que propone audit. |
| Backend: `archiver`, `archiver-utils`, `glob`, `readdir-glob`, `zip-stream`, `minimatch` | Cadena de archivado instalada. No se encontró importación activa de archiver en las rutas JS de la aplicación; los respaldos actuales invocan pg_dump. Puede afectar herramientas que incorporen patrones de archivo. | Evaluar archiver 8 y sus API antes de migrar; no forzar minimatch mayor sobre consumidores anteriores. |
| Backend: `nodemon` → `minimatch` | Herramienta de desarrollo; no se usa en `npm start`. | Actualizar cuando su cadena sea compatible y probar el watcher. No aplicar el downgrade sugerido automáticamente. |
| Frontend: `react-router`, `react-router-dom` | Runtime: redirección abierta con barras invertidas e inyección en hidratación SSR de errores. La app usa BrowserRouter en cliente, sin SSR de React Router; los recorridos revisados usan rutas internas. No se acredita una auditoría completa de cada destino dinámico. | Evaluar React Router 7.18.5 y regresión de autenticación, redirecciones y rutas protegidas. |
| Frontend: cadena ESLint/typescript-eslint y `minimatch` | Herramientas de desarrollo/build; no forman parte del bundle del cliente. Los patrones observados son configuración del repositorio. | Actualizar herramientas en conjunto con compatibilidad y lint/tsc. No aplicar cambios mayores o degradaciones propuestas por audit sin revisión. |

Los 10 y 14 son paquetes señalados por npm, incluyendo propagación por dependencias; no equivalen a 24 fallos distintos de negocio. No se ejecutó `npm audit fix --force` ni se hicieron actualizaciones mayores automáticas.

## Archivos de esta revisión

Se editaron/crearon los siguientes archivos en esta etapa; no se atribuyen a ella todos los cambios previos que ya tenía el árbol de trabajo:

```text
backend/models/AboutPage.js
backend/migrations/20261102000200-add-pickup-settings-to-about-pages.js
backend/services/pickupLocationService.js
backend/services/shippingService.js
backend/controllers/deliveryController.js
backend/routes/deliveryRoutes.js
backend/package.json
backend/package-lock.json
backend/scripts/verifyProductDeliveryBrowser.js
backend/scripts/preflightMercadoPagoTestAccount.js
backend/tests/integration/productDeliveryBrowserServer.js
backend/tests/integration/productDeliveryNeonSupport.js
backend/tests/pickupSettings.test.js
backend/tests/backupDependencyCompatibility.test.js
backend/tests/productDeliveryBrowserSafety.test.js
frontend/package.json
frontend/package-lock.json
frontend/playwright.delivery.config.ts
frontend/e2e/delivery.spec.ts
frontend/src/services/deliveryService.ts
frontend/src/components/cart/PickupLocationDetails.tsx
frontend/src/components/cart/PickupSettingsForm.tsx
frontend/src/components/cart/OrderDetails.tsx
frontend/src/pages/CheckoutPage.tsx
frontend/src/pages/admin/AdminOrdersPage.tsx
frontend/src/context/CartContext.tsx
frontend/tests/deliveryViews.test.mjs
docs/product-delivery-browser-results.md
docs/product-delivery-system.md
docs/product-delivery-review.md
docs/product-delivery-neon-results.md
```

Los informes HTML/JSON, capturas y `dist` son artefactos locales ignorados. No se modificaron `.env`, no se cambió de rama y no se hizo commit, push, merge ni despliegue.

## Reproducción y pendientes de despliegue

Desde `backend`, `npm.cmd run verify:delivery-browser` solo muestra el plan. Para ejecutar contra el destino autorizado:

```powershell
node --use-system-ca --experimental-vm-modules scripts/verifyProductDeliveryBrowser.js --run --use-authorized-env --confirm-database b9f1e49df2b08b5b3b98ac926fbd12073a8782b668d5ff0240c6f489b6716323 --confirm-branch br-lively-math-akwgzcsr
```

Requiere dependencias instaladas, Chrome y puertos locales 5178/5510 libres. No descarga navegador ni lee perfiles personales. Las opciones y reintentos se definen en [playwright.delivery.config.ts](../frontend/playwright.delivery.config.ts), siguiendo la [configuración oficial de Playwright](https://playwright.dev/docs/test-configuration).

Antes de desplegar faltan: completar el extremo a extremo remoto con HTTPS de pruebas; registrar datos auténticos de recogida y tarifas autorizadas; revisar las moderadas y la copia ZIP de los CLI; verificar SMTP/correo, recomendaciones y respaldos en su entorno específico; aprobar y aplicar las dos migraciones mediante el procedimiento de despliegue con respaldo y ventana de operación. No ejecutar migraciones automáticamente sobre producción ni usar estos fixtures como configuración comercial. La advertencia del tamaño del bundle queda pendiente de optimización.
