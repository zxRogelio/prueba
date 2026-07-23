-- Vistas mensuales por producto registradas en BehaviorEvents.
WITH vistas_mensuales AS (
  SELECT
    be."entityId"::integer AS producto_id,
    date_trunc('month', be."createdAt")::date AS mes,
    COUNT(*)::integer AS vistas_producto
  FROM core."BehaviorEvents" be
  WHERE be."eventType" = 'product_view'
    AND be."entityType" = 'product'
    AND be."entityId" ~ '^[0-9]+$'
  GROUP BY
    be."entityId"::integer,
    date_trunc('month', be."createdAt")::date
)
SELECT
  vm.producto_id,
  p."name" AS producto,
  to_char(vm.mes, 'YYYY-MM') AS mes,
  vm.vistas_producto
FROM vistas_mensuales vm
JOIN core."Products" p
  ON p."id_producto" = vm.producto_id
ORDER BY
  vm.producto_id,
  vm.mes;

-- Promedio movil estadistico de vistas de producto en una ventana de tres meses.
WITH vistas_mensuales AS (
  SELECT
    be."entityId"::integer AS producto_id,
    date_trunc('month', be."createdAt")::date AS mes,
    COUNT(*)::integer AS vistas_producto_mes
  FROM core."BehaviorEvents" be
  WHERE be."eventType" = 'product_view'
    AND be."entityType" = 'product'
    AND be."entityId" ~ '^[0-9]+$'
  GROUP BY
    be."entityId"::integer,
    date_trunc('month', be."createdAt")::date
),
vistas_con_producto AS (
  SELECT
    vm.producto_id,
    p."name" AS producto,
    vm.mes,
    vm.vistas_producto_mes
  FROM vistas_mensuales vm
  JOIN core."Products" p
    ON p."id_producto" = vm.producto_id
)
SELECT
  producto_id,
  producto,
  to_char(mes, 'YYYY-MM') AS mes,
  vistas_producto_mes,
  ROUND(
    AVG(vistas_producto_mes) OVER (
      PARTITION BY producto_id
      ORDER BY mes
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS promedio_movil_vistas_3_meses
FROM vistas_con_producto
ORDER BY
  producto_id,
  mes;
