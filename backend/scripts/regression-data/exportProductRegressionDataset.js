import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/sequelize.js";
import {
  DATASET_FILE,
  DATASET_HEADERS,
  displayPath,
  END_MONTH,
  SEED_NAME,
  SEED_SOURCE,
  START_MONTH,
  writeCsv,
} from "./common.js";

async function assertSeedExists() {
  const rows = await sequelize.query(
    `
    SELECT
      (SELECT COUNT(*)::int
       FROM core."Orders"
       WHERE "metadata"->>'seedName' = :seedName) AS "orders",
      (SELECT COUNT(*)::int
       FROM core."BehaviorEvents"
       WHERE "source" = :source
         AND "eventType" = 'product_view'
         AND "entityType" = 'product') AS "views";
    `,
    {
      replacements: { seedName: SEED_NAME, source: SEED_SOURCE },
      type: QueryTypes.SELECT,
    }
  );

  const state = rows[0];

  if (Number(state.orders) === 0 && Number(state.views) === 0) {
    throw new Error(
      "No hay datos historicos del seed. Ejecuta primero importHistoricalProductRegressionData.js --apply."
    );
  }
}

async function loadDatasetRows() {
  return sequelize.query(
    `
    WITH months AS (
      SELECT generate_series(
        CAST(:startMonth || '-01' AS date),
        CAST(:endMonth || '-01' AS date),
        INTERVAL '1 month'
      )::date AS month_start
    ),
    active_products AS (
      SELECT
        p."id_producto" AS product_id,
        p."name" AS producto
      FROM core."Products" p
      WHERE p."status" = 'Activo'
        AND p."id_producto" IS NOT NULL
      ORDER BY p."id_producto"
    ),
    sales AS (
      SELECT
        oi."productId" AS product_id,
        date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date AS month_start,
        SUM(oi."quantity")::int AS units_sold
      FROM core."OrderItems" oi
      JOIN core."Orders" o ON o."id" = oi."orderId"
      WHERE o."metadata"->>'seedName' = :seedName
        AND o."status" = 'paid'
        AND oi."itemType" = 'product'
      GROUP BY
        oi."productId",
        date_trunc('month', COALESCE(o."paidAt", o."createdAt"))::date
    ),
    views AS (
      SELECT
        be."entityId"::int AS product_id,
        date_trunc('month', be."createdAt")::date AS month_start,
        COUNT(*)::int AS product_views
      FROM core."BehaviorEvents" be
      WHERE be."source" = :source
        AND be."eventType" = 'product_view'
        AND be."entityType" = 'product'
        AND be."entityId" ~ '^[0-9]+$'
      GROUP BY
        be."entityId"::int,
        date_trunc('month', be."createdAt")::date
    ),
    complete_series AS (
      SELECT
        p.product_id,
        p.producto,
        m.month_start,
        COALESCE(s.units_sold, 0)::int AS units_sold,
        COALESCE(v.product_views, 0)::int AS product_views
      FROM active_products p
      CROSS JOIN months m
      LEFT JOIN sales s
        ON s.product_id = p.product_id
       AND s.month_start = m.month_start
      LEFT JOIN views v
        ON v.product_id = p.product_id
       AND v.month_start = m.month_start
    ),
    features AS (
      SELECT
        product_id,
        producto,
        month_start,
        units_sold,
        product_views,
        COUNT(*) OVER (
          PARTITION BY product_id
          ORDER BY month_start
          ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
        ) AS history_months_12,
        AVG(units_sold) OVER (
          PARTITION BY product_id
          ORDER BY month_start
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) AS avg_sales_3,
        AVG(units_sold) OVER (
          PARTITION BY product_id
          ORDER BY month_start
          ROWS BETWEEN 5 PRECEDING AND CURRENT ROW
        ) AS avg_sales_6,
        AVG(units_sold) OVER (
          PARTITION BY product_id
          ORDER BY month_start
          ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
        ) AS avg_sales_12,
        AVG(product_views) OVER (
          PARTITION BY product_id
          ORDER BY month_start
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) AS avg_views_3,
        LEAD(units_sold) OVER (
          PARTITION BY product_id
          ORDER BY month_start
        ) AS next_month_units
      FROM complete_series
    )
    SELECT
      product_id,
      producto,
      to_char(month_start, 'YYYY-MM') AS mes_corte,
      units_sold::int AS ventas_mes_anterior,
      ROUND(avg_sales_3::numeric, 2) AS promedio_movil_ventas_3_meses,
      ROUND(avg_sales_6::numeric, 2) AS promedio_movil_ventas_6_meses,
      ROUND(avg_sales_12::numeric, 2) AS promedio_movil_ventas_12_meses,
      product_views::int AS vistas_producto_mes_anterior,
      ROUND(avg_views_3::numeric, 2) AS promedio_movil_vistas_3_meses,
      next_month_units::int AS ventas_mes_siguiente
    FROM features
    WHERE history_months_12 = 12
      AND next_month_units IS NOT NULL
    ORDER BY product_id, month_start;
    `,
    {
      replacements: {
        startMonth: START_MONTH,
        endMonth: END_MONTH,
        seedName: SEED_NAME,
        source: SEED_SOURCE,
      },
      type: QueryTypes.SELECT,
    }
  );
}

function normalizeDatasetRow(row) {
  return {
    producto: row.producto,
    mes_corte: row.mes_corte,
    ventas_mes_anterior: row.ventas_mes_anterior,
    promedio_movil_ventas_3_meses: Number(
      row.promedio_movil_ventas_3_meses
    ).toFixed(2),
    promedio_movil_ventas_6_meses: Number(
      row.promedio_movil_ventas_6_meses
    ).toFixed(2),
    promedio_movil_ventas_12_meses: Number(
      row.promedio_movil_ventas_12_meses
    ).toFixed(2),
    vistas_producto_mes_anterior: row.vistas_producto_mes_anterior,
    promedio_movil_vistas_3_meses: Number(
      row.promedio_movil_vistas_3_meses
    ).toFixed(2),
    ventas_mes_siguiente: row.ventas_mes_siguiente,
  };
}

async function main() {
  try {
    await sequelize.authenticate();
    await assertSeedExists();

    const rows = await loadDatasetRows();
    const normalizedRows = rows.map(normalizeDatasetRow);

    await writeCsv(DATASET_FILE, DATASET_HEADERS, normalizedRows);

    const productCount = new Set(rows.map((row) => row.product_id)).size;

    console.log("Dataset de regresion exportado");
    console.log(`Filas: ${normalizedRows.length}`);
    console.log(`Productos en dataset: ${productCount}`);
    console.log(`Archivo: ${displayPath(DATASET_FILE)}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en exportProductRegressionDataset:", error);
  process.exit(1);
});
