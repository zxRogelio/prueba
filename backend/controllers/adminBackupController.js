import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "../config/sequelize.js";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupsDir = path.resolve(__dirname, "../storage/backups");

const ensureBackupsDir = async () => {
  await fs.mkdir(backupsDir, { recursive: true });
};

const slugify = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const bytesToKB = (bytes = 0) => Number(bytes / 1024).toFixed(2);

const createTimestamp = () => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

const getBackupFilename = ({ scope, schema, table }) => {
  const timestamp = createTimestamp();
  if (scope === "table") {
    return `backup-${slugify(schema)}-${slugify(table)}-${timestamp}.json`;
  }
  return `backup-completo-${timestamp}.json`;
};

const validateIdentifier = (value, fieldName) => {
  if (!/^[a-zA-Z0-9_]+$/.test(String(value || ""))) {
    const error = new Error(`El ${fieldName} indicado no es válido.`);
    error.statusCode = 400;
    throw error;
  }
};

const getUserTables = async () => {
  const [rows] = await sequelize.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `);

  return rows.map((row) => ({
    schema: row.table_schema,
    table: row.table_name,
  }));
};

const fetchTableRows = async ({ schema, table }) => {
  validateIdentifier(schema, "schema");
  validateIdentifier(table, "tabla");

  const [rows] = await sequelize.query(`SELECT * FROM "${schema}"."${table}";`);
  return rows;
};

const uploadBackupToCloudinary = async ({ buffer, filename, metadata }) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return null;
  }

  const publicId = filename.replace(/\.json$/i, "");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "titanium/backups",
        resource_type: "raw",
        public_id: publicId,
        format: "json",
        tags: ["backup", metadata.scope, metadata.schema || "all"],
        context: Object.entries(metadata)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key}=${String(value)}`),
      },
      (error, response) => {
        if (error) return reject(error);
        resolve(response);
      },
    );

    stream.end(buffer);
  });

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    url: result.secure_url,
    bytes: result.bytes,
    format: result.format,
  };
};

const buildBackupPayload = async ({ scope, schema, table }) => {
  const generatedAt = new Date().toISOString();
  const tables = await getUserTables();

  if (scope === "table") {
    validateIdentifier(schema, "schema");
    validateIdentifier(table, "tabla");

    const exists = tables.some(
      (item) => item.schema === schema && item.table === table,
    );
    if (!exists) {
      const error = new Error("La tabla solicitada no existe.");
      error.statusCode = 404;
      throw error;
    }

    const rows = await fetchTableRows({ schema, table });
    return {
      generatedAt,
      scope,
      database: sequelize.config.database,
      tables: [
        {
          schema,
          table,
          rowCount: rows.length,
          rows,
        },
      ],
    };
  }

  const tablesWithData = await Promise.all(
    tables.map(async (item) => {
      const rows = await fetchTableRows(item);
      return {
        schema: item.schema,
        table: item.table,
        rowCount: rows.length,
        rows,
      };
    }),
  );

  return {
    generatedAt,
    scope: "full",
    database: sequelize.config.database,
    tables: tablesWithData,
  };
};

const readBackupIndex = async () => {
  await ensureBackupsDir();
  const files = await fs.readdir(backupsDir);
  const backups = await Promise.all(
    files
      .filter((file) => file.endsWith(".meta.json"))
      .map(async (file) => {
        const fullPath = path.join(backupsDir, file);
        const raw = await fs.readFile(fullPath, "utf8");
        return JSON.parse(raw);
      }),
  );

  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const getBackupOptions = async (_req, res) => {
  try {
    const tables = await getUserTables();
    return res.json({
      tables,
      cloudinaryEnabled: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
      ),
      backupsPath: backupsDir,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudieron cargar las tablas disponibles para backup.",
      detail: error.message,
    });
  }
};

export const listBackups = async (_req, res) => {
  try {
    const backups = await readBackupIndex();
    return res.json({ backups });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener el historial de backups.",
      detail: error.message,
    });
  }
};

export const createBackup = async (req, res) => {
  try {
    const {
      scope = "full",
      schema = "public",
      table = null,
      uploadToCloudinary = false,
    } = req.body || {};

    if (!["full", "table"].includes(scope)) {
      return res
        .status(400)
        .json({ error: "El tipo de backup debe ser 'full' o 'table'." });
    }

    if (scope === "table" && !table) {
      return res
        .status(400)
        .json({ error: "Debes indicar la tabla a respaldar." });
    }

    await ensureBackupsDir();

    const payload = await buildBackupPayload({ scope, schema, table });
    const filename = getBackupFilename({ scope, schema, table });
    const filePath = path.join(backupsDir, filename);
    const buffer = Buffer.from(JSON.stringify(payload, null, 2), "utf8");

    await fs.writeFile(filePath, buffer);

    const stats = await fs.stat(filePath);
    const metadata = {
      id: filename,
      filename,
      filePath,
      createdAt: payload.generatedAt,
      scope,
      schema: scope === "table" ? schema : null,
      table: scope === "table" ? table : null,
      tablesIncluded: payload.tables.length,
      rowsIncluded: payload.tables.reduce(
        (acc, item) => acc + item.rowCount,
        0,
      ),
      sizeBytes: stats.size,
      sizeKB: bytesToKB(stats.size),
      downloadUrl: `/api/admin/backups/download/${encodeURIComponent(filename)}`,
      cloudinary: null,
    };

    if (uploadToCloudinary) {
      metadata.cloudinary = await uploadBackupToCloudinary({
        buffer,
        filename,
        metadata: {
          scope,
          schema: metadata.schema,
          table: metadata.table,
          createdAt: metadata.createdAt,
        },
      });
    }

    await fs.writeFile(
      `${filePath}.meta.json`,
      JSON.stringify(metadata, null, 2),
      "utf8",
    );

    return res.status(201).json({
      message:
        scope === "full"
          ? "Backup completo generado correctamente."
          : "Backup de tabla generado correctamente.",
      backup: metadata,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo generar el backup.",
      detail: error.detail || undefined,
    });
  }
};

export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const safeName = path.basename(filename);

    if (!safeName.endsWith(".json")) {
      return res
        .status(400)
        .json({ error: "El archivo solicitado no es válido." });
    }

    const filePath = path.join(backupsDir, safeName);
    await fs.access(filePath);
    return res.download(filePath, safeName);
  } catch (error) {
    return res
      .status(404)
      .json({ error: "No se encontró el backup solicitado." });
  }
};
