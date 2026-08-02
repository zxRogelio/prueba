export const useTransaction = false;

const productKindEnum = 'core."category_product_kind_enum"';
const productTypeEnum = 'public."enum_Products_productType"';

export async function up({ sequelize }) {
  await sequelize.query(`
    DO $$
    DECLARE
      missing_categories text;
    BEGIN
      WITH normalized AS (
        SELECT
          id_categoria,
          name,
          lower(
            regexp_replace(
              translate(
                btrim(name),
                'ÁÉÍÓÚÜÑáéíóúüñ',
                'AEIOUUNaeiouun'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ) AS normalized_name
        FROM core."Categories"
      )
      SELECT string_agg(id_categoria::text || ' - ' || name, ', ' ORDER BY id_categoria)
      INTO missing_categories
      FROM normalized
      WHERE normalized_name NOT IN (
        'suplementacion',
        'suplementos',
        'suplemento',
        'proteinas',
        'proteina',
        'creatinas',
        'creatina',
        'pre entrenos',
        'pre entreno',
        'aminoacidos',
        'vitaminas',
        'accesorios',
        'accesorio',
        'guantes',
        'guante',
        'shakers',
        'shaker',
        'botellas',
        'botella',
        'cinturones',
        'cinturon',
        'toallas',
        'toalla',
        'ropa',
        'ropas',
        'ropa deportiva',
        'playeras',
        'playera',
        'shorts',
        'short',
        'leggings',
        'pants'
      );

      IF missing_categories IS NOT NULL THEN
        RAISE EXCEPTION 'No se pudo clasificar productKind para estas categorias: %', missing_categories;
      END IF;
    END $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'core'
          AND t.typname = 'category_product_kind_enum'
      ) THEN
        CREATE TYPE ${productKindEnum} AS ENUM ('supplement', 'accessory', 'apparel');
      END IF;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE core."Categories"
      ADD COLUMN IF NOT EXISTS "productKind" ${productKindEnum};
  `);

  await sequelize.query(`
    WITH normalized AS (
      SELECT
        id_categoria,
        lower(
          regexp_replace(
            translate(
              btrim(name),
              'ÁÉÍÓÚÜÑáéíóúüñ',
              'AEIOUUNaeiouun'
            ),
            '\\s+',
            ' ',
            'g'
          )
        ) AS normalized_name
      FROM core."Categories"
    )
    UPDATE core."Categories" c
    SET "productKind" = CASE
      WHEN n.normalized_name IN (
        'suplementacion',
        'suplementos',
        'suplemento',
        'proteinas',
        'proteina',
        'creatinas',
        'creatina',
        'pre entrenos',
        'pre entreno',
        'aminoacidos',
        'vitaminas'
      ) THEN 'supplement'::${productKindEnum}
      WHEN n.normalized_name IN (
        'accesorios',
        'accesorio',
        'guantes',
        'guante',
        'shakers',
        'shaker',
        'botellas',
        'botella',
        'cinturones',
        'cinturon',
        'toallas',
        'toalla'
      ) THEN 'accessory'::${productKindEnum}
      WHEN n.normalized_name IN (
        'ropa',
        'ropas',
        'ropa deportiva',
        'playeras',
        'playera',
        'shorts',
        'short',
        'leggings',
        'pants'
      ) THEN 'apparel'::${productKindEnum}
      ELSE c."productKind"
    END
    FROM normalized n
    WHERE c.id_categoria = n.id_categoria
      AND c."productKind" IS NULL;
  `);

  await sequelize.query(`
    DO $$
    DECLARE
      missing_categories text;
    BEGIN
      SELECT string_agg(id_categoria::text || ' - ' || name, ', ' ORDER BY id_categoria)
      INTO missing_categories
      FROM core."Categories"
      WHERE "productKind" IS NULL;

      IF missing_categories IS NOT NULL THEN
        RAISE EXCEPTION 'No se pudo clasificar productKind para estas categorias: %', missing_categories;
      END IF;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE core."Categories"
      ALTER COLUMN "productKind" SET NOT NULL;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'enum_Products_productType'
          AND e.enumlabel = 'Accesorios'
      ) THEN
        ALTER TYPE ${productTypeEnum} ADD VALUE 'Accesorios';
      END IF;
    END $$;
  `);

  await sequelize.query(`
    UPDATE core."Products" p
    SET
      "productType" = (
        CASE c."productKind"::text
          WHEN 'supplement' THEN 'Suplementación'
          WHEN 'accessory' THEN 'Accesorios'
          WHEN 'apparel' THEN 'Ropa'
        END
      )::${productTypeEnum},
      "supplementFlavor" = CASE
        WHEN c."productKind"::text = 'supplement' THEN p."supplementFlavor"
        ELSE NULL
      END,
      "supplementPresentation" = CASE
        WHEN c."productKind"::text = 'supplement' THEN p."supplementPresentation"
        ELSE NULL
      END,
      "supplementServings" = CASE
        WHEN c."productKind"::text = 'supplement' THEN p."supplementServings"
        ELSE NULL
      END,
      "apparelSize" = CASE
        WHEN c."productKind"::text = 'apparel' THEN p."apparelSize"
        ELSE NULL
      END,
      "apparelColor" = CASE
        WHEN c."productKind"::text = 'apparel' THEN p."apparelColor"
        ELSE NULL
      END,
      "apparelMaterial" = CASE
        WHEN c."productKind"::text = 'apparel' THEN p."apparelMaterial"
        ELSE NULL
      END,
      "updatedAt" = NOW()
    FROM core."Categories" c
    WHERE p."categoryId" = c.id_categoria
      AND (
        p."productType"::text IS DISTINCT FROM CASE c."productKind"::text
          WHEN 'supplement' THEN 'Suplementación'
          WHEN 'accessory' THEN 'Accesorios'
          WHEN 'apparel' THEN 'Ropa'
        END
        OR (c."productKind"::text <> 'supplement' AND (
          p."supplementFlavor" IS NOT NULL
          OR p."supplementPresentation" IS NOT NULL
          OR p."supplementServings" IS NOT NULL
        ))
        OR (c."productKind"::text <> 'apparel' AND (
          p."apparelSize" IS NOT NULL
          OR p."apparelColor" IS NOT NULL
          OR p."apparelMaterial" IS NOT NULL
        ))
      );
  `);
}

export async function down({ sequelize }) {
  await sequelize.query(`
    ALTER TABLE core."Categories"
      DROP COLUMN IF EXISTS "productKind";
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'Products'
          AND column_name = 'productType'
      ) THEN
        ALTER TABLE core."Products"
          ALTER COLUMN "productType" TYPE text
          USING "productType"::text;

        UPDATE core."Products"
        SET "productType" = 'Ropa'
        WHERE "productType" = 'Accesorios';

        DROP TYPE IF EXISTS ${productTypeEnum};

        CREATE TYPE ${productTypeEnum} AS ENUM ('Suplementación', 'Ropa');

        ALTER TABLE core."Products"
          ALTER COLUMN "productType" TYPE ${productTypeEnum}
          USING "productType"::${productTypeEnum};
      END IF;
    END $$;
  `);

  await sequelize.query(`DROP TYPE IF EXISTS ${productKindEnum};`);
}
