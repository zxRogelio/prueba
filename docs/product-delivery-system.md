# Entregas de productos — Titanium Sport Gym

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

Implementación local del 2 de noviembre de 2026. Rama: `feature/product-delivery-system`.

Actualización: véase el [informe de configuración, navegador y seguridad](product-delivery-browser-results.md) para los recorridos Chrome, la migración de recogida y el pendiente de webhook HTTPS de Mercado Pago de prueba.

Ese pendiente quedó resuelto en la [validación remota con HTTPS](product-delivery-mercadopago-https-results.md): tres aprobados y un OXXO pendiente auténticos, con firma e idempotencia verificadas. El backend valida `transaction_amount + shipping_amount` y el envío por separado contra los importes locales.

## Funcionalidad

- Recogida gratuita configurable desde `/admin/pedidos`: nombre, dirección completa, municipio, estado, CP, teléfono, horarios e instrucciones en `AboutPages.pickupSettings`, registro activo `slug=main`. Conserva el contacto antiguo real `ctaAddress` / `ctaPhone` como respaldo hasta completar la configuración. Sin ubicación disponible no se ofrece una recogida pagable.
- Envío a domicilio con dirección completa, cobertura y tarifas reales administradas desde `/admin/pedidos`. La migración no carga tarifas de ejemplo.
- Direcciones personales con alta, edición, eliminación y selección de predeterminada en `/cliente/direcciones`. Cada operación comprueba propiedad; un bloqueo del usuario serializa cambios de predeterminada.
- Snapshot del domicilio, contacto, tarifa y ubicación de recogida en cada pedido. Editar o eliminar una dirección guardada no modifica compras anteriores.
- Cotización de productos, descuentos y envío calculados en el servidor, válida durante 15 minutos y firmada con el `JWT_SECRET` existente. El token contiene un hash, sin dirección ni teléfono.
- Renovar la firma de una cotización idéntica conserva el intento de pago. El backend verifica la firma y compara el contenido firmado; una orden ya creada conserva su snapshot incluso si vence la cotización original.
- Checkout web exige consultar y confirmar el importe. El servidor recalcula todo y rechaza cotizaciones alteradas, vencidas o con cambios de precios, carrito, dirección o tarifa.
- Costo de envío en `Orders.shippingTotal`, incluido en `Orders.total` y `Payments.amount`. Mercado Pago recibe el envío en `shipments.cost` con `mode=not_specified`, separado de los productos del inventario. Los renglones con descuentos se reparten en centavos exactos para evitar diferencias por redondeo.
- Pago y logística separados. La confirmación del pago, el movimiento de inventario y el evento logístico participan en la misma transacción. Se conservan las validaciones de firma, importe, moneda, referencias e idempotencia existentes.
- Administración de pedidos con filtros, productos/cantidades, pago, contacto/domicilio, paquetería, guía, observaciones, fechas y responsable de entrega.
- Cliente con pedidos y seguimiento real, historial, importes y guía en `/cliente/pedidos`; actualización cada 30 segundos cuando la pestaña es visible y botón manual.

La página de retorno de Mercado Pago sigue consultando al backend. Los parámetros de éxito de la URL no confirman pagos.

## Compatibilidad

El checkout web de productos usa la nueva ruta obligatoria `/api/checkout/products/mercadopago`. La ruta anterior `/api/checkout/mercadopago` conserva su contrato para membresías y consumidores existentes, incluido el móvil: si una compra antigua no envía `fulfillment`, se crea sin seguimiento y con envío cero. Esa ruta no representa una solicitud de envío a domicilio. Si envía `fulfillment`, también debe enviar una cotización válida.

Las membresías no solicitan dirección ni generan fulfillment. Las órdenes históricas conservan sus importes y se muestran con `fulfillment=null`. No se han modificado archivos de la aplicación móvil.

Una cancelación logística de una compra pagada no ejecuta un reembolso. Los reembolsos conservan su flujo actual en Pagos. Órdenes en disputa, reembolso o contracargo bloquean cambios logísticos hasta su revisión administrativa.

## Migración

La configuración de recogida requiere también `20261102000200-add-pickup-settings-to-about-pages.js`, aditiva y nullable. Su rollback rechaza descartar ubicaciones configuradas. Ambas migraciones se aplicaron únicamente en `pagos-test`; véase el informe actual.

`backend/migrations/20261102000100-create-product-delivery-system.js`, compatible con el runner existente y su transacción:

- Agrega `core.Orders.shippingTotal DECIMAL(12,2) NOT NULL DEFAULT 0`.
- Crea `core.UserAddresses`, con índice de usuario y unicidad parcial de dirección predeterminada.
- Crea `core.ShippingRates`, con rangos postales, importe MXN, activación y usuario modificador.
- Crea `core.OrderFulfillments`, relación única con orden, snapshots y fechas logísticas.
- Crea `core.FulfillmentEvents`, con estado previo/nuevo, actor, notas, guía/paquetería de cada expedición y secuencia estable para ordenar eventos incluso si comparten hora.
- Agrega claves foráneas, índices y restricciones de consistencia de método, costo y estado.

No modifica migraciones históricas ni pagos. `down` se niega a eliminar el esquema nuevo cuando existen direcciones, tarifas, entregas o importes de envío distintos de cero. Bloquea las tablas antes de comprobarlo para impedir escrituras concurrentes entre la validación y la eliminación. Después de usarlo, un rollback debe revertir el código y conservar las tablas y la auditoría.

**Actualización:** la migración se ejecutó y quedó aplicada en la rama Neon de pruebas `pagos-test` (`br-lively-math-akwgzcsr`), después de la autorización del usuario y de verificar su identidad por SQL. La reversión vacía, reaplicación y protecciones con datos se probaron sobre PostgreSQL real. No se ejecutó en producción. Véanse los [resultados y evidencias](product-delivery-neon-results.md).

## API

Todas las rutas siguientes usan el prefijo `/api`, JWT, sesión vigente y blacklist existentes.

| Método | Ruta | Acceso / comportamiento |
|---|---|---|
| GET | `/delivery/options` | Cliente/admin: ubicación configurada para recogida |
| POST | `/checkout/product-quote` | Cliente/admin: cotizar `items` o `cartId` y `fulfillment`; sin crear órdenes ni reservas |
| POST | `/checkout/products/mercadopago` | Cliente/admin: productos con entrega y cotización obligatorias |
| GET, POST | `/addresses/me` | Cliente: consultar / guardar sus direcciones |
| PUT, DELETE | `/addresses/me/:addressId` | Cliente propietario: editar / eliminar |
| GET, POST | `/admin/shipping-rates` | Admin: consultar / crear tarifas |
| PATCH | `/admin/shipping-rates/:rateId` | Admin: editar importe, cobertura y activación |
| PATCH | `/admin/orders/:orderId/fulfillment` | Admin: transición logística auditada |

Rutas ampliadas:

- `POST /checkout/mercadopago`: acepta entrega opcional para conservar clientes existentes; la entrega explícita siempre requiere cotización. Membresías conservan su contrato.
- `GET /orders/me`, `GET /admin/orders`, `GET /orders/:orderId`: agregan `shippingTotal`, `fulfillment` e historial. Los listados aceptan `deliveryMethod=pickup|delivery`, `fulfillmentStatus` y `productOnly=true`, además de la paginación/filtros anteriores.
- `POST /orders/:orderId/cancel`: reutiliza `cancelPendingOrder`, que libera reservas y registra cancelación logística en la misma transacción.
- `POST /webhooks/mercadopago`: conserva su contrato. El servicio central de confirmación actualiza también la logística de órdenes que tengan entrega.

Ejemplo de recogida (datos ficticios, únicamente ilustrativos):

```json
{
  "items": [{ "productId": 101, "quantity": 2 }],
  "fulfillment": {
    "method": "pickup",
    "recipientName": "Nombre del cliente",
    "phone": "5555555555"
  }
}
```

Enviar a `/checkout/product-quote`; revisar `subtotal`, `discountTotal`, `shippingTotal`, `total`, `items`, `expiresAt` y `quoteToken`. Para pagar, enviar el mismo cuerpo a `/checkout/products/mercadopago` con `quoteToken` e `idempotencyKey`.

Para domicilio, `fulfillment` acepta `{ "method": "delivery", "addressId": "UUID-propio" }` o un objeto `address` con `recipientName`, `phone`, `postalCode`, `state`, `municipality`, `neighborhood`, `street`, `exteriorNumber`, `interiorNumber` opcional y `references`. Precios y costos enviados por React no se usan para calcular el cobro.

Para actualizar entrega:

```json
{
  "expectedStatus": "packed",
  "status": "shipped",
  "carrier": "Paquetería contratada",
  "trackingNumber": "Guía real",
  "notes": "Observación visible para el cliente"
}
```

`expectedStatus` evita que una pantalla obsoleta sobrescriba otro cambio. El actor se obtiene del usuario autenticado. Un estado duplicado o salto inválido devuelve 409.

## Estados

```text
awaiting_payment → payment_confirmed → preparing → ready_for_pickup → picked_up
                                               ↘ packed → shipped → delivered
```

La primera transición es del servidor al confirmar el pago. Solo la secuencia correspondiente al método está disponible para administradores. No se permite preparar pedidos sin pago completo confirmado.

`incident` requiere observaciones y solo permite volver al estado previo o cancelar. `delivery_failed` se admite después de `shipped` y permite reexpedición, incidencia o cancelación. Cada expedición conserva su guía en el historial. `picked_up`, `delivered` y `cancelled` son terminales. Las cancelaciones logísticas requieren observaciones; el cliente no puede invocar estas operaciones.

Resolver una incidencia conserva la fecha original de preparación, empaquetado, recogida lista o expedición. Una reexpedición posterior a `delivery_failed` registra una fecha nueva; cancelar desde una incidencia registra su propia fecha de cancelación.

## Tarifas

La primera versión consulta `ShippingRates`, sin integraciones automáticas con paqueterías. Los rangos postales son inclusivos y conservan los ceros iniciales. Si coinciden varios, gana el de menor amplitud. Dos rangos coincidentes de igual amplitud bloquean la cotización por ambigüedad. Una tarifa explícita de cero permite envío gratuito; la ausencia de tarifa bloquea el envío con 422.

La función `quoteShipping` es el punto de sustitución para un proveedor futuro. Cambiar una tarifa invalida nuevas creaciones con cotizaciones previas; un reintento de una orden ya creada conserva su importe definitivo y su preferencia.

## Verificación local y límites

Resultados actuales y antecedentes de la revisión local. El [informe de Neon pagos-test](product-delivery-neon-results.md) contiene las ejecuciones finales y el [informe local anterior](product-delivery-review.md) conserva la revisión inicial:

| Verificación | Resultado |
|---|---|
| `backend: npm.cmd test` | 271 pruebas aprobadas, cero fallos y cero omitidas; incluye 36 de entregas y 24 de seguridad de los arneses Neon |
| `frontend: npm.cmd test` | 10 pruebas aprobadas, cero fallos y cero omitidas; renderizado estático, rutas de checkout e identidad de reintentos |
| PowerShell: `mercadoPagoPostgresLauncherSafety.test.ps1` | 30 casos aprobados sin conectar a PostgreSQL |
| `backend: npm.cmd run verify:state-transitions` | Matrices centrales de pagos, órdenes y reembolsos aprobadas |
| `frontend: npm.cmd run lint` | Aprobado |
| ESLint recomendado sobre los 24 archivos JavaScript del backend trasladados | Aprobado con configuración temporal, sin agregar configuración global al backend |
| `frontend: npm.cmd run build` | Aprobado en la revisión local anterior, con advertencia de bundle mayor a 500 kB; no se repitió en la etapa Neon |
| `node --check` de archivos JavaScript cambiados/nuevos | Aprobado |
| `git diff --check` | Aprobado |
| Auditoría npm después de correcciones compatibles | Backend: 13 dependencias afectadas (3 altas, 10 moderadas). Frontend: 14 moderadas. Pendiente de resolver antes de aprobar producción |
| PostgreSQL real / migración aplicada en Neon pagos-test | 27 escenarios aprobados, cero fallidos; proveedor simulado; datos anteriores intactos y cero fixtures restantes |
| Compra real en Mercado Pago | No ejecutada |

Desde PowerShell, usar `npm.cmd` si la política del sistema impide ejecutar `npm.ps1`:

```powershell
Set-Location D:\Escritorio\pry_TinaniumSportGymWeb\backend
npm.cmd test
npm.cmd run test:delivery
npm.cmd run verify:state-transitions

Set-Location ..\frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Las pruebas nuevas ejecutan servicios reales de checkout, pagos, reservas, inventario, promociones, membresías y entregas sobre un adaptador de modelos en memoria. También ejercitan Express mediante HTTP local y middleware JWT/sesiones reales. No leen `.env` ni contactan Mercado Pago o bases remotas. Sus transacciones simuladas verifican rollback e idempotencia del flujo, pero no certifican bloqueos, aislamiento o restricciones reales de PostgreSQL.

Incluyen recogida/envío, tarifa inexistente/inactiva/ambigua, dirección incompleta/ajena, cotización alterada/vencida, cambios de importe y dirección, pago aprobado/rechazado, importe incorrecto, webhooks duplicados, rollback de confirmación, autorización, transiciones, cancelación pendiente, reexpedición, membresías, órdenes antiguas y centavos con descuentos.

El verificador opcional de esquema real no usa la configuración de la aplicación. Exige una base **vacía**, llamada `titanium_delivery_test`, en `127.0.0.1` o `::1`; rechaza cualquier destino remoto. Crea una base mínima del esquema anterior dentro de una transacción, aplica la migración, comprueba restricciones y hace rollback de todo. No reemplaza una prueba completa del negocio sobre PostgreSQL.

```powershell
# Con PostgreSQL local disponible y una base vacía creada por ti:
$env:DELIVERY_TEST_DATABASE_URL = 'postgresql://USUARIO:CLAVE@127.0.0.1:5432/titanium_delivery_test'
Set-Location D:\Escritorio\pry_TinaniumSportGymWeb\backend
npm.cmd run verify:delivery-postgres -- --run --allow-local-ddl
```

No se ejecutó este verificador local: conserva su allowlist de loopback y base vacía. Se añadió y ejecutó un arnés separado para la rama Neon de pruebas autorizada, con SQL y modelos Sequelize reales, sin aflojar las protecciones de los arneses anteriores. Los scripts históricos que escriben fixtures conservan sus destinos originales y no se ejecutaron en otra rama. La prueba visual interactiva, el recorrido remoto con cuentas de prueba de Mercado Pago y la resolución de avisos de seguridad siguen pendientes. Vite informó una advertencia de tamaño del bundle en la compilación anterior.

## Arranque local

1. Usar una base aislada de desarrollo con el esquema base existente. Las migraciones históricas asumen que ciertas tablas base, como `Users`, ya existen; no inicializar una base vacía con el runner esperando que cree toda la aplicación.
2. Revisar fuera del historial del chat las cuatro URLs de base de datos de desarrollo existentes (`DATABASE_URL_RUNTIME`, `DATABASE_URL_IMPORTER`, `DATABASE_URL_REPORTS`, `DATABASE_URL_ADMIN_DIRECT`) y confirmar que ninguna apunta a producción antes de ejecutar comandos de migración o arrancar el servidor.
3. Aplicar la migración en esa base de desarrollo mediante el runner existente:

```powershell
Set-Location D:\Escritorio\pry_TinaniumSportGymWeb\backend
npm.cmd run migrate:status
npm.cmd run migrate
npm.cmd run dev
```

En otra terminal:

```powershell
Set-Location D:\Escritorio\pry_TinaniumSportGymWeb\frontend
npm.cmd run dev
```

4. Como administrador, completar la dirección y teléfono reales en About / Nosotros, y configurar tarifas reales en Pedidos y entregas.
5. Como cliente, comprar un producto, cotizar, confirmar el total y pagar con cuentas de prueba de Mercado Pago. Su webhook debe alcanzar `BACKEND_PUBLIC_URL` por HTTPS.
6. Verificar el pedido en `/cliente/pedidos` y procesarlo en `/admin/pedidos`. Repetir para recogida y domicilio, y comprobar membresías y pedidos anteriores.

## Despliegue seguro

1. Revisar el diff y respaldar la base mediante el procedimiento habitual. No se hizo push, merge ni despliegue en este trabajo.
2. Probar primero la migración y el flujo completo en staging con credenciales de prueba. Verificar igualdad entre orden, pago y preferencia incluyendo envío y descuento.
3. Revisar permisos del rol runtime sobre las cuatro tablas nuevas y `USAGE` de la secuencia de `FulfillmentEvents`. Los nombres de roles varían por entorno; no se inventan grants en la migración.
4. En una ventana de mantenimiento administrada por el responsable de despliegue, aplicar las migraciones pendientes con el runner existente **antes** de levantar el backend nuevo. Revisar todas las pendientes; no ejecutar a ciegas contra Neon de producción.
5. Desplegar backend y después frontend. Mantener `SEQUELIZE_SYNC_ON_START` desactivado en bases compartidas. No se requieren paquetes ni secretos nuevos; se reutiliza `JWT_SECRET`.
6. Configurar/verificar ubicación y tarifas reales antes de habilitar compras. Revisar webhook, permisos, historial y una orden anterior.
7. Si hay que revertir el código, conservar el esquema aditivo y los datos. No usar `migrate:down` después de registrar entregas, direcciones o tarifas.

## Archivos

Creados:

```text
backend/controllers/deliveryController.js
backend/migrations/20261102000100-create-product-delivery-system.js
backend/models/FulfillmentEvent.js
backend/models/OrderFulfillment.js
backend/models/ShippingRate.js
backend/models/UserAddress.js
backend/routes/deliveryRoutes.js
backend/scripts/verifyProductDeliveryPostgres.js
backend/services/addressService.js
backend/services/fulfillmentService.js
backend/services/shippingService.js
backend/tests/helpers/productDeliveryFixture.js
backend/tests/productDelivery.test.js
backend/utils/deliveryValidation.js
frontend/src/components/cart/AddressFields.tsx
frontend/src/components/cart/OrderDetails.tsx
frontend/src/pages/admin/AdminOrdersPage.tsx
frontend/src/pages/client/ClientAddressesPage.tsx
frontend/src/pages/client/ClientOrdersPage.tsx
frontend/src/services/deliveryService.ts
frontend/src/styles/delivery.css
docs/product-delivery-system.md
```

Modificados:

```text
backend/controllers/checkoutController.js
backend/controllers/orderController.js
backend/index.js
backend/models/Order.js
backend/models/index.js
backend/package.json
backend/routes/checkoutRoutes.js
backend/services/mercadoPagoCheckoutService.js
backend/services/orderService.js
backend/services/paymentService.js
backend/tests/mercadoPagoConfirmation.test.js
frontend/src/App.tsx
frontend/src/components/layout/admin/AdminSidebar/AdminSidebar.tsx
frontend/src/components/layout/client/clientPortalNavigation.ts
frontend/src/pages/CheckoutPage.tsx
frontend/src/pages/PagoResultadoPage.tsx
frontend/src/services/checkoutService.ts
```

La lista no incluye artefactos ignorados de compilación. Todos los cambios de esta implementación quedan pendientes de commit. `.env` y las variables de producción no se modificaron.

Referencia para la preferencia: [documentación oficial de Mercado Pago sobre costos de envío](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-settings/shipping-cost).
