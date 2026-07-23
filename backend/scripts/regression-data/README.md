# Datos historicos para regresion mensual de productos

## Objetivo

Estos scripts preparan datos historicos simulados, pero coherentes, de ventas y vistas para todos los productos activos reales de `core."Products"`. La finalidad es construir despues un dataset academico de regresion para predecir cuantas unidades de cada producto se venderan el siguiente mes.

No se crean productos, categorias, marcas ni campos nuevos. Las ventas se insertan como `Orders`, `OrderItems` y `Payments`; las vistas se insertan como `BehaviorEvents`.

## Periodo

Se generan 48 meses consecutivos:

- Inicio: `2022-07`
- Fin: `2026-06`

Cada producto activo debe tener una fila mensual de ventas y una fila mensual de vistas. Si hay 30 productos activos, cada CSV mensual debe contener `30 * 48 = 1440` filas de datos.

## Archivos

- `exportActiveProducts.js`: exporta productos activos reales.
- `generateHistoricalProductRegressionData.js`: genera CSV mensuales de ventas y vistas.
- `importHistoricalProductRegressionData.js`: valida, inserta o limpia el seed.
- `exportProductRegressionDataset.js`: exporta el dataset derivado final.
- `productRegressionValidation.sql`: consultas manuales de verificacion.
- `output/`: carpeta local para CSV generados.

Los CSV de `output/` no deben subirse al repositorio.

## Datos originales vs dataset derivado

Los datos originales son los registros historicos insertados en las tablas reales:

- `core."Orders"`
- `core."OrderItems"`
- `core."Payments"`
- `core."BehaviorEvents"`

El dataset derivado `product_regression_dataset.csv` no se inserta en la base. Se calcula despues con SQL a partir de esos datos originales.

## Convencion temporal

Una fila del dataset con `mes_corte = 2025-06` significa:

- `ventas_mes_anterior`: ventas de junio de 2025.
- `promedio_movil_ventas_3_meses`: abril, mayo y junio de 2025.
- `promedio_movil_ventas_6_meses`: enero a junio de 2025.
- `promedio_movil_ventas_12_meses`: julio de 2024 a junio de 2025.
- `vistas_producto_mes_anterior`: vistas de junio de 2025.
- `promedio_movil_vistas_3_meses`: abril, mayo y junio de 2025.
- `ventas_mes_siguiente`: ventas de julio de 2025.

Las variables predictoras no usan meses posteriores al `mes_corte`. Para evitar fuga de informacion, se excluyen filas sin 12 meses completos de historial y filas sin mes siguiente conocido. Con 48 meses, se esperan 36 filas finales por producto.

## Comandos

Desde `backend`:

```bash
node scripts/regression-data/exportActiveProducts.js
node scripts/regression-data/generateHistoricalProductRegressionData.js
node scripts/regression-data/importHistoricalProductRegressionData.js
node scripts/regression-data/importHistoricalProductRegressionData.js --apply
node scripts/regression-data/exportProductRegressionDataset.js
```

Para una simulacion rapida con pocos productos:

```bash
node scripts/regression-data/importHistoricalProductRegressionData.js --limit-products=2
```

`--limit-products` solo esta permitido sin `--apply`.

## Limpieza exclusiva del seed

```bash
node scripts/regression-data/importHistoricalProductRegressionData.js --clean
```

La limpieza usa identificadores del seed:

- `Orders.metadata.seedName = product_regression_48_months`
- `Payments.metadata.seedName = product_regression_48_months`
- `BehaviorEvents.source = historical_regression_seed`
- correos `historical.regression.0001@titanium-seed.local`
- prefijo de orden `REG48-`

No elimina datos reales ni registros que no tengan esos marcadores.

## Validaciones del importador

Sin argumentos, el importador no modifica la base. Valida:

- existencia de los CSV;
- productos activos reales;
- 48 meses por producto;
- meses duplicados o faltantes;
- valores enteros no negativos;
- consistencia entre productos del CSV y `core."Products"`;
- conflictos con datos seed existentes;
- conteos estimados de ordenes, items, pagos y vistas.

Con `--apply`, la insercion se ejecuta en una transaccion de Sequelize. Si falla una validacion o una FK, se hace rollback. Se usan lotes para `bulkCreate`.

## Usuarios historicos

Como `Orders.userId` es obligatorio, el importador crea usuarios historicos controlados con fecha `2022-06-01`, antes del periodo inicial. Los correos siguen el patron:

```text
historical.regression.0001@titanium-seed.local
```

No se usan usuarios actuales con fechas incompatibles.

## Ventas

Las ventas mensuales se distribuyen en varias ordenes durante el mes. Cada orden puede contener uno o varios productos y cada `OrderItem` usa:

- `itemType = product`
- `productId = Products.id_producto`
- snapshot de nombre, categoria, marca y tipo de producto
- precio real del producto como snapshot

No se mezclan membresias.

No se insertan movimientos de inventario para no modificar el stock actual de productos reales. El esquema no exige `InventoryMovements` para que existan ventas historicas; por eso las ventas quedan representadas por ordenes, items y pagos pagados.

## Vistas

Las vistas se insertan como:

```text
eventType = product_view
entityType = product
entityId = Products.id_producto como texto
source = historical_regression_seed
userId = null
sessionId = null
```

El `metadata` incluye `visitorId`, `platform = historical_seed`, `seed` y `month`.

## Metricas moviles

Las metricas moviles se calculan sobre la serie completa producto-mes:

- meses sin ventas: `0`
- meses sin vistas: `0`
- promedio de 3 meses: dos meses previos mas mes de corte
- promedio de 6 meses: cinco meses previos mas mes de corte
- promedio de 12 meses: once meses previos mas mes de corte

No se generan filas finales cuando no existen 12 meses completos de historial.

## Validacion SQL

Usa `productRegressionValidation.sql` para revisar:

- productos activos;
- cobertura de 48 meses;
- meses faltantes;
- comparacion CSV vs base;
- ordenes antes del registro de usuario;
- ordenes pagadas sin pago;
- pagos con monto distinto;
- ventas y vistas mensuales;
- promedios moviles;
- dataset final.

## Riesgos y limitaciones

Estos datos son simulados para fines academicos. Sirven para practicar regresion y pipelines de datos, pero no deben interpretarse como comportamiento real de clientes ni como evidencia de demanda historica real.
