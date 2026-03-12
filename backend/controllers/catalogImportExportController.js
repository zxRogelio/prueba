import { sequelizeImporter, sequelizeReports } from "../config/sequelize.js";
import { parse } from "csv-parse/sync";
import { Parser } from "json2csv";
import crypto from "crypto";

const EXPORTABLE_FIELDS = [
  "id_producto",
  "name",
  "brandId",
  "brandName",
  "categoryId",
  "categoryName",
  "price",
  "stock",
  "status",
  "productType",
  "description",
  "features",
  "imageUrl",
  "supplementFlavor",
  "supplementPresentation",
  "supplementServings",
  "apparelSize",
  "apparelColor",
  "apparelMaterial",
  "createdAt",
  "updatedAt",
];

const TEMPLATE_FIELDS = [
  "name",
  "brandId",
  "brandName",
  "categoryId",
  "categoryName",
  "price",
  "stock",
  "status",
  "productType",
  "description",
  "features",
  "imageUrl",
  "supplementFlavor",
  "supplementPresentation",
  "supplementServings",
  "apparelSize",
  "apparelColor",
  "apparelMaterial",
];

const resolveRequestedFields = (rawFields, fallbackFields) => {
  if (!rawFields) return fallbackFields;

  const requested = String(rawFields)
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const valid = requested.filter((f) => EXPORTABLE_FIELDS.includes(f));
  return valid.length ? valid : fallbackFields;
};

/* =========================================================
   EXPORTAR CATÁLOGO A CSV CON CAMPOS SELECCIONABLES
========================================================= */
export const exportProductsCsv = async (req, res) => {
  try {
    const fields = resolveRequestedFields(req.query.fields, EXPORTABLE_FIELDS);

    const [rows] = await sequelizeReports.query(`
      SELECT
        p.id_producto,
        p.name,
        p."brandId",
        b.name AS "brandName",
        p."categoryId",
        c.name AS "categoryName",
        p.price,
        p.stock,
        p.status,
        p."productType",
        p.description,
        p.features,
        p."imageUrl",
        p."supplementFlavor",
        p."supplementPresentation",
        p."supplementServings",
        p."apparelSize",
        p."apparelColor",
        p."apparelMaterial",
        p."createdAt",
        p."updatedAt"
      FROM core."Products" p
      LEFT JOIN core."Brands" b
        ON p."brandId" = b.id_marca
      LEFT JOIN core."Categories" c
        ON p."categoryId" = c.id_categoria
      ORDER BY p.id_producto ASC;
    `);

    const normalized = rows.map((row) => ({
      ...row,
      features: row.features ?? "[]",
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(normalized);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="catalogo_productos.csv"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportProductsCsv error:", error);
    return res.status(500).json({
      error: "Error exportando catálogo",
      details: error.message,
    });
  }
};

/* =========================================================
   EXPORTAR PLANTILLA DE IMPORTACIÓN CON CAMPOS SELECCIONABLES
========================================================= */
export const exportProductsImportTemplateCsv = async (req, res) => {
  try {
    const fields = resolveRequestedFields(req.query.fields, TEMPLATE_FIELDS);

    const [rows] = await sequelizeReports.query(`
      SELECT
        p.name,
        p."brandId",
        b.name AS "brandName",
        p."categoryId",
        c.name AS "categoryName",
        p.price,
        p.stock,
        p.status,
        p."productType",
        p.description,
        p.features,
        p."imageUrl",
        p."supplementFlavor",
        p."supplementPresentation",
        p."supplementServings",
        p."apparelSize",
        p."apparelColor",
        p."apparelMaterial"
      FROM core."Products" p
      LEFT JOIN core."Brands" b
        ON p."brandId" = b.id_marca
      LEFT JOIN core."Categories" c
        ON p."categoryId" = c.id_categoria
      ORDER BY p.name ASC;
    `);

    const normalized = rows.map((row) => ({
      ...row,
      features: row.features ?? "[]",
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(normalized);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="plantilla_importacion_productos.csv"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportProductsImportTemplateCsv error:", error);
    return res.status(500).json({
      error: "Error exportando plantilla de importación",
      details: error.message,
    });
  }
};

/* =========================================================
   SUBIR CSV A STAGING
========================================================= */
export const uploadProductsCsv = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Debes enviar un archivo CSV" });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      return res.status(400).json({ error: "El archivo CSV está vacío" });
    }

    const batchId = crypto.randomUUID();

    await sequelizeImporter.query(
      `DELETE FROM staging.import_errors WHERE batch_id = :batchId`,
      { replacements: { batchId } }
    );

    const rows = records.map((row, index) => ({
      batch_id: batchId,
      row_num: index + 2,
      id_producto:
        row.id_producto !== undefined && row.id_producto !== ""
          ? Number(row.id_producto)
          : null,
      name: row.name || null,
      brandId:
        row.brandId !== undefined && row.brandId !== ""
          ? Number(row.brandId)
          : null,
      categoryId:
        row.categoryId !== undefined && row.categoryId !== ""
          ? Number(row.categoryId)
          : null,
      price:
        row.price !== undefined && row.price !== ""
          ? Number(row.price)
          : null,
      stock:
        row.stock !== undefined && row.stock !== ""
          ? Number(row.stock)
          : null,
      status: row.status || null,
      productType: row.productType || null,
      imageUrl: row.imageUrl || null,
      description: row.description || null,
      features: row.features || "[]",
      supplementFlavor: row.supplementFlavor || null,
      supplementPresentation: row.supplementPresentation || null,
      supplementServings: row.supplementServings || null,
      apparelSize: row.apparelSize || null,
      apparelColor: row.apparelColor || null,
      apparelMaterial: row.apparelMaterial || null,
    }));

    const transaction = await sequelizeImporter.transaction();

    try {
      for (const row of rows) {
        await sequelizeImporter.query(
          `
          INSERT INTO staging.products_import (
            batch_id,
            row_num,
            id_producto,
            name,
            "brandId",
            "categoryId",
            price,
            stock,
            status,
            "productType",
            "imageUrl",
            description,
            features,
            "supplementFlavor",
            "supplementPresentation",
            "supplementServings",
            "apparelSize",
            "apparelColor",
            "apparelMaterial"
          )
          VALUES (
            :batch_id,
            :row_num,
            :id_producto,
            :name,
            :brandId,
            :categoryId,
            :price,
            :stock,
            :status,
            :productType,
            :imageUrl,
            :description,
            :features,
            :supplementFlavor,
            :supplementPresentation,
            :supplementServings,
            :apparelSize,
            :apparelColor,
            :apparelMaterial
          )
          `,
          {
            transaction,
            replacements: row,
          }
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return res.status(201).json({
      message: "Archivo cargado a staging correctamente",
      batchId,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("uploadProductsCsv error:", error);
    return res.status(500).json({
      error: "Error subiendo CSV",
      details: error.message,
    });
  }
};

/* =========================================================
   VALIDAR LOTE
========================================================= */
export const validateProductsImport = async (req, res) => {
  try {
    const { batchId } = req.params;

    await sequelizeImporter.query(
      `DELETE FROM staging.import_errors WHERE batch_id = :batchId`,
      { replacements: { batchId } }
    );

    // obligatorios
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'name', 'Nombre obligatorio'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND (name IS NULL OR btrim(name) = '');
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'brandId', 'Marca obligatoria'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND "brandId" IS NULL;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'categoryId', 'Categoría obligatoria'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND "categoryId" IS NULL;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'price', 'Precio obligatorio'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND price IS NULL;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'stock', 'Stock obligatorio'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND stock IS NULL;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'productType', 'Tipo de producto obligatorio'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND "productType" IS NULL;
      `,
      { replacements: { batchId } }
    );

    // rangos
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'price', 'Precio inválido'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND price < 0;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'stock', 'Stock inválido'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND stock < 0;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'status', 'Status inválido'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND status IS NOT NULL
        AND status NOT IN ('Activo', 'Inactivo');
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT batch_id, row_num, 'productType', 'Tipo de producto inválido'
      FROM staging.products_import
      WHERE batch_id = :batchId
        AND "productType" NOT IN ('Suplementación', 'Ropa');
      `,
      { replacements: { batchId } }
    );

    // duplicado por id dentro del CSV
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT p.batch_id, p.row_num, 'id_producto', 'id_producto duplicado en el archivo'
      FROM staging.products_import p
      INNER JOIN (
        SELECT batch_id, id_producto
        FROM staging.products_import
        WHERE batch_id = :batchId
          AND id_producto IS NOT NULL
        GROUP BY batch_id, id_producto
        HAVING COUNT(*) > 1
      ) d
      ON p.batch_id = d.batch_id
      AND p.id_producto = d.id_producto;
      `,
      { replacements: { batchId } }
    );

    // duplicado lógico dentro del CSV
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT
        p.batch_id,
        p.row_num,
        'name',
        'Producto duplicado en el archivo (mismo nombre + marca + categoría)'
      FROM staging.products_import p
      INNER JOIN (
        SELECT
          batch_id,
          lower(btrim(name)) AS norm_name,
          "brandId",
          "categoryId"
        FROM staging.products_import
        WHERE batch_id = :batchId
          AND name IS NOT NULL
          AND "brandId" IS NOT NULL
          AND "categoryId" IS NOT NULL
        GROUP BY batch_id, lower(btrim(name)), "brandId", "categoryId"
        HAVING COUNT(*) > 1
      ) d
      ON p.batch_id = d.batch_id
      AND lower(btrim(p.name)) = d.norm_name
      AND p."brandId" = d."brandId"
      AND p."categoryId" = d."categoryId";
      `,
      { replacements: { batchId } }
    );

    // duplicado lógico contra catálogo real
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT
        p.batch_id,
        p.row_num,
        'name',
        'Ya existe un producto en catálogo con el mismo nombre + marca + categoría'
      FROM staging.products_import p
      INNER JOIN core."Products" cp
        ON lower(btrim(cp.name)) = lower(btrim(p.name))
       AND cp."brandId" = p."brandId"
       AND cp."categoryId" = p."categoryId"
      WHERE p.batch_id = :batchId;
      `,
      { replacements: { batchId } }
    );

    // FKs
    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT p.batch_id, p.row_num, 'brandId', 'Marca no existe'
      FROM staging.products_import p
      LEFT JOIN core."Brands" b
        ON p."brandId" = b.id_marca
      WHERE p.batch_id = :batchId
        AND p."brandId" IS NOT NULL
        AND b.id_marca IS NULL;
      `,
      { replacements: { batchId } }
    );

    await sequelizeImporter.query(
      `
      INSERT INTO staging.import_errors (batch_id, row_num, field_name, error_message)
      SELECT p.batch_id, p.row_num, 'categoryId', 'Categoría no existe'
      FROM staging.products_import p
      LEFT JOIN core."Categories" c
        ON p."categoryId" = c.id_categoria
      WHERE p.batch_id = :batchId
        AND p."categoryId" IS NOT NULL
        AND c.id_categoria IS NULL;
      `,
      { replacements: { batchId } }
    );

    const [errors] = await sequelizeImporter.query(
      `
      SELECT *
      FROM staging.import_errors
      WHERE batch_id = :batchId
      ORDER BY row_num ASC, error_id ASC;
      `,
      { replacements: { batchId } }
    );

    const [[summary]] = await sequelizeImporter.query(
      `
      SELECT COUNT(*)::int AS total_rows
      FROM staging.products_import
      WHERE batch_id = :batchId;
      `,
      { replacements: { batchId } }
    );

    return res.json({
      batchId,
      totalRows: Number(summary.total_rows || 0),
      errorsCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("validateProductsImport error:", error);
    return res.status(500).json({
      error: "Error validando importación",
      details: error.message,
    });
  }
};

/* =========================================================
   PREVIEW / COMPARACIÓN DEL LOTE
========================================================= */
export const previewProductsImport = async (req, res) => {
  try {
    const { batchId } = req.params;

    const [[summary]] = await sequelizeImporter.query(
      `
      WITH staged AS (
        SELECT
          p.*,
          lower(btrim(p.name)) AS norm_name
        FROM staging.products_import p
        WHERE p.batch_id = :batchId
      ),
      matched AS (
        SELECT
          s.row_num,
          s.id_producto,
          s.name,
          s."brandId",
          s."categoryId",
          s.price,
          s.stock,
          s.status,
          s."productType",
          cp.id_producto AS core_match_by_id,
          cp2.id_producto AS core_match_by_logic
        FROM staged s
        LEFT JOIN core."Products" cp
          ON s.id_producto IS NOT NULL
         AND cp.id_producto = s.id_producto
        LEFT JOIN core."Products" cp2
          ON lower(btrim(cp2.name)) = s.norm_name
         AND cp2."brandId" = s."brandId"
         AND cp2."categoryId" = s."categoryId"
      )
      SELECT
        COUNT(*)::int AS total_rows,
        COUNT(*) FILTER (
          WHERE core_match_by_id IS NULL AND core_match_by_logic IS NULL
        )::int AS new_rows,
        COUNT(*) FILTER (
          WHERE core_match_by_id IS NOT NULL
             OR (core_match_by_id IS NULL AND core_match_by_logic IS NOT NULL)
        )::int AS matched_existing_rows,
        COUNT(*) FILTER (
          WHERE core_match_by_id IS NULL AND core_match_by_logic IS NOT NULL
        )::int AS duplicate_by_name_brand_category
      FROM matched;
      `,
      { replacements: { batchId } }
    );

    const [comparisonRows] = await sequelizeImporter.query(
      `
      WITH staged AS (
        SELECT
          p.*,
          lower(btrim(p.name)) AS norm_name
        FROM staging.products_import p
        WHERE p.batch_id = :batchId
      )
      SELECT
        s.row_num,
        s.id_producto,
        s.name,
        s."brandId",
        b.name AS "brandName",
        s."categoryId",
        c.name AS "categoryName",
        s.price,
        s.stock,
        s.status,
        s."productType",
        coreById.id_producto AS core_id_match,
        coreByLogic.id_producto AS core_logic_match,
        coreByLogic.name AS core_logic_name,
        CASE
          WHEN coreById.id_producto IS NOT NULL THEN 'UPDATE_BY_ID'
          WHEN coreById.id_producto IS NULL AND coreByLogic.id_producto IS NOT NULL THEN 'DUPLICATE_LOGICAL'
          ELSE 'NEW'
        END AS action
      FROM staged s
      LEFT JOIN core."Brands" b
        ON s."brandId" = b.id_marca
      LEFT JOIN core."Categories" c
        ON s."categoryId" = c.id_categoria
      LEFT JOIN core."Products" coreById
        ON s.id_producto IS NOT NULL
       AND coreById.id_producto = s.id_producto
      LEFT JOIN core."Products" coreByLogic
        ON lower(btrim(coreByLogic.name)) = s.norm_name
       AND coreByLogic."brandId" = s."brandId"
       AND coreByLogic."categoryId" = s."categoryId"
      ORDER BY s.row_num ASC;
      `,
      { replacements: { batchId } }
    );

    const [errorRows] = await sequelizeImporter.query(
      `
      SELECT *
      FROM staging.import_errors
      WHERE batch_id = :batchId
      ORDER BY row_num ASC, error_id ASC;
      `,
      { replacements: { batchId } }
    );

    return res.json({
      batchId,
      summary: {
        totalRows: Number(summary.total_rows || 0),
        newRows: Number(summary.new_rows || 0),
        matchedExistingRows: Number(summary.matched_existing_rows || 0),
        duplicateByNameBrandCategory: Number(
          summary.duplicate_by_name_brand_category || 0
        ),
        errorsCount: errorRows.length,
      },
      comparison: comparisonRows,
      errors: errorRows,
    });
  } catch (error) {
    console.error("previewProductsImport error:", error);
    return res.status(500).json({
      error: "Error generando preview del lote",
      details: error.message,
    });
  }
};

/* =========================================================
   CONSULTAR ERRORES DEL LOTE
========================================================= */
export const getImportErrors = async (req, res) => {
  try {
    const { batchId } = req.params;

    const [errors] = await sequelizeImporter.query(
      `
      SELECT *
      FROM staging.import_errors
      WHERE batch_id = :batchId
      ORDER BY row_num ASC, error_id ASC;
      `,
      { replacements: { batchId } }
    );

    return res.json({
      batchId,
      errorsCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("getImportErrors error:", error);
    return res.status(500).json({
      error: "Error obteniendo errores",
      details: error.message,
    });
  }
};

/* =========================================================
   COMMIT FINAL A core.Products
========================================================= */
export const commitProductsImport = async (req, res) => {
  const transaction = await sequelizeImporter.transaction();

  try {
    const { batchId } = req.params;

    const [[errorsSummary]] = await sequelizeImporter.query(
      `
      SELECT COUNT(*)::int AS total_errors
      FROM staging.import_errors
      WHERE batch_id = :batchId
      `,
      {
        replacements: { batchId },
        transaction,
      }
    );

    if (Number(errorsSummary.total_errors) > 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: "No se puede aplicar la importación porque existen errores",
        totalErrors: Number(errorsSummary.total_errors),
      });
    }

    await sequelizeImporter.query(
      `
      INSERT INTO core."Products" (
        id_producto,
        name,
        "brandId",
        "categoryId",
        price,
        stock,
        status,
        "productType",
        "imageUrl",
        description,
        features,
        "supplementFlavor",
        "supplementPresentation",
        "supplementServings",
        "apparelSize",
        "apparelColor",
        "apparelMaterial",
        "createdAt",
        "updatedAt"
      )
      SELECT
        COALESCE(
          s.id_producto,
          nextval('core.products_id_producto_seq'::regclass)
        ) AS id_producto,
        s.name,
        s."brandId",
        s."categoryId",
        s.price,
        s.stock,
        COALESCE(s.status, 'Activo')::public."enum_Products_status",
        s."productType"::public."enum_Products_productType",
        s."imageUrl",
        s.description,
        COALESCE(s.features, '[]')::text,
        s."supplementFlavor",
        s."supplementPresentation",
        s."supplementServings",
        s."apparelSize",
        s."apparelColor",
        s."apparelMaterial",
        NOW(),
        NOW()
      FROM staging.products_import s
      WHERE s.batch_id = :batchId
      ON CONFLICT (id_producto)
      DO UPDATE SET
        name = EXCLUDED.name,
        "brandId" = EXCLUDED."brandId",
        "categoryId" = EXCLUDED."categoryId",
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        status = EXCLUDED.status,
        "productType" = EXCLUDED."productType",
        "imageUrl" = EXCLUDED."imageUrl",
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        "supplementFlavor" = EXCLUDED."supplementFlavor",
        "supplementPresentation" = EXCLUDED."supplementPresentation",
        "supplementServings" = EXCLUDED."supplementServings",
        "apparelSize" = EXCLUDED."apparelSize",
        "apparelColor" = EXCLUDED."apparelColor",
        "apparelMaterial" = EXCLUDED."apparelMaterial",
        "updatedAt" = NOW();
      `,
      {
        replacements: { batchId },
        transaction,
      }
    );

    await transaction.commit();

    return res.json({
      ok: true,
      message: "Importación aplicada correctamente a core.Products",
      batchId,
    });
  } catch (error) {
  await transaction.rollback();
  console.error("commitProductsImport error:", error);

  return res.status(500).json({
    error: "Error aplicando importación",
    details:
      error?.original?.message ||
      error?.parent?.message ||
      error?.message ||
      "Error desconocido",
  });
}};