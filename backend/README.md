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
