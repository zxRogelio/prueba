# Backend

## Migraciones

El proyecto usa un runner propio compatible con Sequelize y modulos ES.
Las migraciones viven en `backend/migrations` y exportan funciones `up` y
`down`.

Comandos:

```bash
npm run migrate:status
npm run migrate
npm run migrate:up
npm run migrate:down
```

`npm run migrate` y `npm run migrate:up` aplican todas las migraciones
pendientes. `npm run migrate:down` revierte solo la ultima migracion aplicada.

### Desarrollo

Desde `backend`, verifica que el archivo `.env` local tenga las variables
`DATABASE_URL_RUNTIME`, `DATABASE_URL_IMPORTER`, `DATABASE_URL_REPORTS` y
`DATABASE_URL_ADMIN_DIRECT` configuradas. Luego ejecuta:

```bash
npm run migrate:status
npm run migrate
```

### Produccion

Antes de desplegar una version nueva, ejecuta las migraciones contra la base de
produccion con las mismas variables de entorno que usa el backend:

```bash
npm run migrate:status
npm run migrate
```

No uses `sequelize.sync({ alter: true })` como sustituto de migraciones en
produccion. Si una migracion falla, revisa el error, corrige la migracion o el
estado de datos, y vuelve a ejecutar el comando. Para revertir el ultimo cambio:

```bash
npm run migrate:down
```

El arranque normal no ejecuta `sequelize.sync()` para evitar DDL con el usuario
runtime. Si necesitas habilitarlo en un entorno local controlado, define
`SEQUELIZE_SYNC_ON_START=true`; en bases compartidas usa migraciones.

## Mercado Pago Checkout Pro

El pago en linea usa Checkout Pro con redireccion. Titanium Sport Gym no captura
ni guarda numero de tarjeta, CVV, fecha de vencimiento ni token de tarjeta.

### 1. Crear la aplicacion

1. Entra al panel de desarrolladores de Mercado Pago.
2. Crea una aplicacion para Checkout Pro.
3. Activa credenciales de prueba para desarrollo.
4. Copia el Access Token de prueba en el `.env` del backend.
5. Configura la URL de notificaciones webhook apuntando a:

```bash
https://TU-BACKEND-PUBLICO/api/webhooks/mercadopago
```

### 2. Variables necesarias

Backend:

```env
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MERCADOPAGO_USE_SANDBOX=true
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

`MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` son secretos y nunca
deben subirse a Git. `BACKEND_PUBLIC_URL` debe ser una URL publica HTTPS del
backend desplegado, por ejemplo Render, Railway o un tunel HTTPS para pruebas.

### 3. Credenciales y comprador de prueba

Desde el panel de Mercado Pago crea usuarios de prueba vendedor y comprador.
Usa el Access Token del vendedor en el backend. Inicia Checkout Pro como cliente
de Titanium y paga con el comprador de prueba.

### 4. Compra de prueba

1. Configura `.env` del backend con `MERCADOPAGO_USE_SANDBOX=true`.
2. Configura `BACKEND_PUBLIC_URL` con una URL HTTPS accesible desde Mercado Pago.
3. Ejecuta migraciones:

```bash
npm run migrate
```

4. Inicia backend y frontend.
5. Agrega productos al carrito o elige una membresia.
6. El frontend llama `POST /api/checkout/mercadopago`.
7. Mercado Pago redirige a `/pago/resultado`.
8. La pantalla consulta `GET /api/orders/:orderId/payment-status`.

### 5. Cambiar a produccion

1. Reemplaza el Access Token de prueba por el de produccion.
2. Actualiza `MERCADOPAGO_WEBHOOK_SECRET`.
3. Define `MERCADOPAGO_USE_SANDBOX=false`.
4. Mantiene `BACKEND_PUBLIC_URL` como HTTPS publico.
5. Verifica que el webhook de produccion apunte al backend desplegado.

### 6. Verificacion despues de comprar

Despues de una compra aprobada revisa:

- `Orders`: la orden debe quedar `paid`.
- `Payments`: el pago debe quedar `paid`, con `provider = mercadopago_checkout`.
- `Receipts`: debe existir un recibo emitido para el pago.
- `UserSubscriptions` o `SubscriptionGroups`: debe existir la membresia o el
  paquete relacionado cuando la orden incluya membresias.
- `InventoryMovements`: debe existir un movimiento `sale` por cada producto.

No confirmes una orden desde la URL de retorno. La confirmacion real sucede en
el webhook despues de consultar el pago directamente con la API de Mercado Pago.

## Backfill de pagos legacy

La conversion de pagos legacy de membresia a `Order`/`OrderItem` se ejecuta
con un script idempotente. Por defecto corre en modo simulacion y revierte los
cambios al final de cada pago procesado:

```bash
npm run backfill:legacy-membership-orders
```

Para probar el flujo completo escribiendo dentro de una transaccion y
revirtiendo al final:

```bash
npm run backfill:legacy-membership-orders:rollback-test
```

Para aplicar cambios permanentes:

```bash
npm run backfill:legacy-membership-orders:apply
```

Opciones utiles:

```bash
node scripts/backfillLegacyMembershipOrders.js --limit=10
node scripts/backfillLegacyMembershipOrders.js --payment-id=<uuid>
node scripts/backfillLegacyMembershipOrders.js --apply --payment-id=<uuid>
```

El reporte final incluye registros convertidos, ignorados, errores y pagos con
plan o relacion legacy faltante. El script no borra campos legacy.
