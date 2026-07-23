-- Validaciones para el seed product_regression_48_months.
-- Si usas psql desde backend/scripts/regression-data:
-- \set seed_name 'product_regression_48_months'
-- \set source_name 'historical_regression_seed'

-- 1. Contar productos activos.
SELECT COUNT(*)::int AS productos_activos
FROM core."Products"
WHERE "status" = 'Activo'
  AND "id_producto" IS NOT NULL;

-- Base de 48 meses usada por las validaciones siguientes.
WITH meses AS (
  SELECT generate_series(
    DATE '2022-07-01',
    DATE '2026-06-01',
    INTERVAL '1 month'
  )::date AS mes
)
SELECT COUNT(*)::int AS meses_esperados
FROM meses;

-- 2. Verificar los 48 meses por producto en ventas insertadas.
WITH ventas AS (
  SELECT
    oi."productId" AS producto_id,
    date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date AS mes,
    SUM(oi."quantity")::int AS unidades
  FROM core."OrderItems" oi
  JOIN core."Orders" o ON o."id" = oi."orderId"
  WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
    AND oi."itemType" = 'product'
  GROUP BY oi."productId", date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date
)
SELECT
  p."id_producto" AS producto_id,
  p."name" AS producto,
  COUNT(v.mes)::int AS meses_con_ventas
FROM core."Products" p
LEFT JOIN ventas v ON v.producto_id = p."id_producto"
WHERE p."status" = 'Activo'
GROUP BY p."id_producto", p."name"
ORDER BY p."id_producto";

-- 3. Detectar meses faltantes por producto.
WITH meses AS (
  SELECT generate_series(DATE '2022-07-01', DATE '2026-06-01', INTERVAL '1 month')::date AS mes
),
productos AS (
  SELECT "id_producto" AS producto_id, "name" AS producto
  FROM core."Products"
  WHERE "status" = 'Activo'
),
ventas AS (
  SELECT
    oi."productId" AS producto_id,
    date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date AS mes
  FROM core."OrderItems" oi
  JOIN core."Orders" o ON o."id" = oi."orderId"
  WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
    AND oi."itemType" = 'product'
  GROUP BY oi."productId", date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date
)
SELECT p.producto_id, p.producto, to_char(m.mes, 'YYYY-MM') AS mes_faltante
FROM productos p
CROSS JOIN meses m
LEFT JOIN ventas v ON v.producto_id = p.producto_id AND v.mes = m.mes
WHERE v.producto_id IS NULL
ORDER BY p.producto_id, m.mes;

-- 4. Comparar ventas del CSV con OrderItems.
-- Cargar primero el CSV en psql:
-- DROP TABLE IF EXISTS regression_expected_sales;
-- CREATE TEMP TABLE regression_expected_sales (
--   product_pk integer,
--   id_producto integer,
--   producto text,
--   mes text,
--   unidades_vendidas integer
-- );
-- \copy regression_expected_sales FROM 'output/ventas_mensuales_48_meses.csv' WITH (FORMAT csv, HEADER true)
WITH actual AS (
  SELECT
    oi."productId" AS id_producto,
    to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")), 'YYYY-MM') AS mes,
    SUM(oi."quantity")::int AS unidades_vendidas
  FROM core."OrderItems" oi
  JOIN core."Orders" o ON o."id" = oi."orderId"
  WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
    AND oi."itemType" = 'product'
  GROUP BY oi."productId", to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")), 'YYYY-MM')
)
SELECT
  COALESCE(e.id_producto, a.id_producto) AS id_producto,
  COALESCE(e.mes, a.mes) AS mes,
  COALESCE(e.unidades_vendidas, 0) AS csv_unidades,
  COALESCE(a.unidades_vendidas, 0) AS db_unidades
FROM regression_expected_sales e
FULL JOIN actual a USING (id_producto, mes)
WHERE COALESCE(e.unidades_vendidas, -1) <> COALESCE(a.unidades_vendidas, -1)
ORDER BY id_producto, mes;

-- 5. Comparar vistas del CSV con BehaviorEvents.
-- Cargar primero el CSV en psql:
-- DROP TABLE IF EXISTS regression_expected_views;
-- CREATE TEMP TABLE regression_expected_views (
--   product_pk integer,
--   id_producto integer,
--   producto text,
--   mes text,
--   vistas_producto integer
-- );
-- \copy regression_expected_views FROM 'output/vistas_mensuales_48_meses.csv' WITH (FORMAT csv, HEADER true)
WITH actual AS (
  SELECT
    be."entityId"::int AS id_producto,
    to_char(date_trunc('month', be."createdAt"), 'YYYY-MM') AS mes,
    COUNT(*)::int AS vistas_producto
  FROM core."BehaviorEvents" be
  WHERE be."source" = 'historical_regression_seed'
    AND be."eventType" = 'product_view'
    AND be."entityType" = 'product'
    AND be."entityId" ~ '^[0-9]+$'
  GROUP BY be."entityId"::int, to_char(date_trunc('month', be."createdAt"), 'YYYY-MM')
)
SELECT
  COALESCE(e.id_producto, a.id_producto) AS id_producto,
  COALESCE(e.mes, a.mes) AS mes,
  COALESCE(e.vistas_producto, 0) AS csv_vistas,
  COALESCE(a.vistas_producto, 0) AS db_vistas
FROM regression_expected_views e
FULL JOIN actual a USING (id_producto, mes)
WHERE COALESCE(e.vistas_producto, -1) <> COALESCE(a.vistas_producto, -1)
ORDER BY id_producto, mes;

-- 6. Detectar ordenes anteriores al registro del usuario.
SELECT
  o."orderNumber",
  o."createdAt" AS orden_creada,
  u."email",
  u."createdAt" AS usuario_creado
FROM core."Orders" o
JOIN core."Users" u ON u."id" = o."userId"
WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
  AND o."createdAt" < u."createdAt"
ORDER BY o."createdAt";

-- 7. Detectar ordenes pagadas sin exactamente un pago pagado.
SELECT
  o."id",
  o."orderNumber",
  COUNT(p."id")::int AS pagos_paid
FROM core."Orders" o
LEFT JOIN core."Payments" p
  ON p."orderId" = o."id"
 AND p."status" = 'paid'
WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
  AND o."status" = 'paid'
GROUP BY o."id", o."orderNumber"
HAVING COUNT(p."id") <> 1
ORDER BY o."orderNumber";

-- 8. Detectar pagos cuyo monto no coincide con la orden.
SELECT
  o."orderNumber",
  o."total" AS order_total,
  p."amount" AS payment_amount,
  p."id" AS payment_id
FROM core."Orders" o
JOIN core."Payments" p ON p."orderId" = o."id"
WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
  AND p."metadata"->>'seedName' = 'product_regression_48_months'
  AND p."status" = 'paid'
  AND ROUND(o."total"::numeric, 2) <> ROUND(p."amount"::numeric, 2)
ORDER BY o."orderNumber";

-- 9. Mostrar ventas mensuales por producto.
SELECT
  oi."productId" AS producto_id,
  p."name" AS producto,
  to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")), 'YYYY-MM') AS mes,
  SUM(oi."quantity")::int AS unidades_vendidas
FROM core."OrderItems" oi
JOIN core."Orders" o ON o."id" = oi."orderId"
JOIN core."Products" p ON p."id_producto" = oi."productId"
WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
  AND oi."itemType" = 'product'
GROUP BY oi."productId", p."name", to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")), 'YYYY-MM')
ORDER BY oi."productId", mes;

-- 10. Mostrar vistas mensuales por producto.
SELECT
  be."entityId"::int AS producto_id,
  p."name" AS producto,
  to_char(date_trunc('month', be."createdAt"), 'YYYY-MM') AS mes,
  COUNT(*)::int AS vistas_producto
FROM core."BehaviorEvents" be
JOIN core."Products" p ON p."id_producto" = be."entityId"::int
WHERE be."source" = 'historical_regression_seed'
  AND be."eventType" = 'product_view'
  AND be."entityType" = 'product'
  AND be."entityId" ~ '^[0-9]+$'
GROUP BY be."entityId"::int, p."name", to_char(date_trunc('month', be."createdAt"), 'YYYY-MM')
ORDER BY be."entityId"::int, mes;

-- 11. Calcular promedios moviles de ventas.
WITH ventas AS (
  SELECT
    oi."productId" AS producto_id,
    date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date AS mes,
    SUM(oi."quantity")::int AS unidades_vendidas
  FROM core."OrderItems" oi
  JOIN core."Orders" o ON o."id" = oi."orderId"
  WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
    AND oi."itemType" = 'product'
  GROUP BY oi."productId", date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date
)
SELECT
  producto_id,
  to_char(mes, 'YYYY-MM') AS mes,
  unidades_vendidas,
  ROUND(AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS promedio_3,
  ROUND(AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 5 PRECEDING AND CURRENT ROW), 2) AS promedio_6,
  ROUND(AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 11 PRECEDING AND CURRENT ROW), 2) AS promedio_12
FROM ventas
ORDER BY producto_id, mes;

-- 12. Calcular promedio movil de vistas de tres meses.
WITH vistas AS (
  SELECT
    be."entityId"::int AS producto_id,
    date_trunc('month', be."createdAt")::date AS mes,
    COUNT(*)::int AS vistas_producto
  FROM core."BehaviorEvents" be
  WHERE be."source" = 'historical_regression_seed'
    AND be."eventType" = 'product_view'
    AND be."entityType" = 'product'
    AND be."entityId" ~ '^[0-9]+$'
  GROUP BY be."entityId"::int, date_trunc('month', be."createdAt")::date
)
SELECT
  producto_id,
  to_char(mes, 'YYYY-MM') AS mes,
  vistas_producto,
  ROUND(AVG(vistas_producto) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS promedio_movil_vistas_3_meses
FROM vistas
ORDER BY producto_id, mes;

-- 13. Mostrar el dataset final de regresion.
WITH meses AS (
  SELECT generate_series(DATE '2022-07-01', DATE '2026-06-01', INTERVAL '1 month')::date AS mes
),
productos AS (
  SELECT "id_producto" AS producto_id, "name" AS producto
  FROM core."Products"
  WHERE "status" = 'Activo'
),
ventas AS (
  SELECT
    oi."productId" AS producto_id,
    date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date AS mes,
    SUM(oi."quantity")::int AS unidades_vendidas
  FROM core."OrderItems" oi
  JOIN core."Orders" o ON o."id" = oi."orderId"
  WHERE o."metadata"->>'seedName' = 'product_regression_48_months'
    AND oi."itemType" = 'product'
  GROUP BY oi."productId", date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date
),
vistas AS (
  SELECT
    be."entityId"::int AS producto_id,
    date_trunc('month', be."createdAt")::date AS mes,
    COUNT(*)::int AS vistas_producto
  FROM core."BehaviorEvents" be
  WHERE be."source" = 'historical_regression_seed'
    AND be."eventType" = 'product_view'
    AND be."entityType" = 'product'
    AND be."entityId" ~ '^[0-9]+$'
  GROUP BY be."entityId"::int, date_trunc('month', be."createdAt")::date
),
serie AS (
  SELECT
    p.producto_id,
    p.producto,
    m.mes,
    COALESCE(v.unidades_vendidas, 0)::int AS unidades_vendidas,
    COALESCE(vi.vistas_producto, 0)::int AS vistas_producto
  FROM productos p
  CROSS JOIN meses m
  LEFT JOIN ventas v ON v.producto_id = p.producto_id AND v.mes = m.mes
  LEFT JOIN vistas vi ON vi.producto_id = p.producto_id AND vi.mes = m.mes
),
features AS (
  SELECT
    *,
    COUNT(*) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS historial_12,
    AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_v_3,
    AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 5 PRECEDING AND CURRENT ROW) AS avg_v_6,
    AVG(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS avg_v_12,
    AVG(vistas_producto) OVER (PARTITION BY producto_id ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_views_3,
    LEAD(unidades_vendidas) OVER (PARTITION BY producto_id ORDER BY mes) AS ventas_siguiente
  FROM serie
)
SELECT
  producto,
  to_char(mes, 'YYYY-MM') AS mes_corte,
  unidades_vendidas AS ventas_mes_anterior,
  ROUND(avg_v_3::numeric, 2) AS promedio_movil_ventas_3_meses,
  ROUND(avg_v_6::numeric, 2) AS promedio_movil_ventas_6_meses,
  ROUND(avg_v_12::numeric, 2) AS promedio_movil_ventas_12_meses,
  vistas_producto AS vistas_producto_mes_anterior,
  ROUND(avg_views_3::numeric, 2) AS promedio_movil_vistas_3_meses,
  ventas_siguiente AS ventas_mes_siguiente
FROM features
WHERE historial_12 = 12
  AND ventas_siguiente IS NOT NULL
ORDER BY producto_id, mes;
