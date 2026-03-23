import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { sequelize } from "../config/sequelize.js";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupsDir = path.resolve(__dirname, "../storage/backups");
const BACKUP_EXTENSION = ".sql";
const DEFAULT_SCHEMA = "public";

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

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

const getBackupFilename = ({ scope, schema, table, mode }) => {
  const timestamp = createTimestamp();
  const modeSuffix = mode === "data-only" ? "datos" : "estructura-datos";

  if (scope === "table") {
    return `backup-${slugify(schema)}-${slugify(table)}-${modeSuffix}-${timestamp}${BACKUP_EXTENSION}`;
  }

  return `backup-completo-${modeSuffix}-${timestamp}${BACKUP_EXTENSION}`;
};

const validateIdentifier = (value, fieldName) => {
  if (!/^[a-zA-Z0-9_]+$/.test(String(value || ""))) {
    const error = new Error(`El ${fieldName} indicado no es válido.`);
    error.statusCode = 400;
    throw error;
  }
};

const parseDatabaseUrl = () => {
  const databaseUrl =
    process.env.DATABASE_URL_RUNTIME ||
    process.env.DATABASE_URL_ADMIN_DIRECT ||
    process.env.DATABASE_URL;

  if (!databaseUrl) return null;

  try {
    const parsed = new URL(databaseUrl);

    return {
      dbName: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
      dbUser: decodeURIComponent(parsed.username),
      dbPassword: decodeURIComponent(parsed.password),
      dbHost: parsed.hostname,
      dbPort: parsed.port || "5432",
      sslmode: parsed.searchParams.get("sslmode") || "require",
      channelBinding: parsed.searchParams.get("channel_binding") || null,
    };
  } catch (error) {
    const customError = new Error("DATABASE_URL no tiene un formato válido.");
    customError.statusCode = 500;
    customError.detail = error.message;
    throw customError;
  }
};

const getDbConfig = () => {
  const parsedUrl = parseDatabaseUrl();
  if (parsedUrl) return parsedUrl;

  const dbName =
    process.env.DB_NAME ||
    process.env.POSTGRES_DB ||
    sequelize?.config?.database ||
    sequelize?.options?.database;

  const dbUser =
    process.env.DB_USER ||
    process.env.POSTGRES_USER ||
    sequelize?.config?.username ||
    sequelize?.options?.username;

  const dbPassword =
    process.env.DB_PASSWORD ||
    process.env.POSTGRES_PASSWORD ||
    sequelize?.config?.password ||
    sequelize?.options?.password;

  const dbHost =
    process.env.DB_HOST ||
    process.env.POSTGRES_HOST ||
    sequelize?.config?.host ||
    sequelize?.options?.host ||
    "127.0.0.1";

  const dbPort =
    process.env.DB_PORT ||
    process.env.POSTGRES_PORT ||
    sequelize?.config?.port ||
    sequelize?.options?.port ||
    "5432";

  if (!dbName || !dbUser) {
    const error = new Error(
      "Faltan variables de entorno de PostgreSQL. Usa DATABASE_URL o verifica DB_NAME y DB_USER.",
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    dbName,
    dbUser,
    dbPassword: dbPassword || "",
    dbHost,
    dbPort: String(dbPort),
    sslmode: "require",
    channelBinding: null,
  };
};

const getCandidatePgDumpPaths = () => {
  const candidates = [];
  const homeDir =
    process.env.USERPROFILE || process.env.HOME || os.homedir() || null;

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe",
    );

    if (homeDir) {
      candidates.push(
        path.join(
          homeDir,
          ".cache",
          "pgdump",
          "windows-latest-x64",
          "pg_dump.exe",
        ),
        path.join(
          homeDir,
          ".cache",
          "pgdump",
          "windows-latest-arm64",
          "pg_dump.exe",
        ),
      );
    }
  }

  if (process.platform === "darwin" && homeDir) {
    candidates.push(
      "/opt/homebrew/bin/pg_dump",
      "/usr/local/bin/pg_dump",
      path.join(homeDir, ".cache", "pgdump", "macos-latest-x64", "pg_dump"),
      path.join(homeDir, ".cache", "pgdump", "macos-latest-arm64", "pg_dump"),
    );
  }

  if (process.platform === "linux" && homeDir) {
    candidates.push(
      "/usr/bin/pg_dump",
      "/usr/local/bin/pg_dump",
      path.join(homeDir, ".cache", "pgdump", "ubuntu-latest-x64", "pg_dump"),
    );
  }

  candidates.push("pg_dump");
  return [...new Set(candidates)];
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolvePgDumpBin = async () => {
  const candidates = getCandidatePgDumpPaths();

  for (const candidate of candidates) {
    if (candidate === "pg_dump") {
      return candidate;
    }

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  const error = new Error(
    "No se encontró pg_dump automáticamente. Instala PostgreSQL o verifica que la librería haya descargado el binario en caché.",
  );
  error.statusCode = 500;
  throw error;
};

const spawnCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        const error = new Error(
          stderr || stdout || `El proceso terminó con código ${code}.`,
        );
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });

const ensurePgDumpAvailable = async () => {
  const pgDumpBin = await resolvePgDumpBin();

  try {
    await spawnCommand(pgDumpBin, ["--version"]);
    return pgDumpBin;
  } catch (error) {
    const customError = new Error(
      "No se pudo ejecutar pg_dump. Verifica que el binario esté disponible y funcional.",
    );
    customError.statusCode = 500;
    customError.detail = error?.message;
    throw customError;
  }
};

const getPsqlBin = () => "psql";

const getRestoreGuide = ({ filename, mode, scope, schema, table }) => {
  const { dbName, dbUser, dbHost, dbPort } = getDbConfig();

  return {
    type:
      mode === "data-only"
        ? "Restauración de datos"
        : "Restauración de estructura + datos",
    notes: [
      "Este backup fue generado con pg_dump en formato SQL plano.",
      "Se restaura con psql.",
      scope === "table"
        ? `El respaldo corresponde a la tabla ${schema}.${table}.`
        : "El respaldo corresponde a la base completa o a múltiples tablas.",
    ],
    commands: {
      restoreSameDatabase: `${getPsqlBin()} "postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}?sslmode=require" -f "${filename}"`,
      restoreOtherDatabase: `${getPsqlBin()} "postgresql://${dbUser}@${dbHost}:${dbPort}/TU_BASE_DESTINO?sslmode=require" -f "${filename}"`,
    },
  };
};

const getUserTables = async () => {
  const [rows] = await sequelize.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'neon_auth')
    ORDER BY table_schema, table_name;
  `);

  return rows.map((row) => ({
    schema: row.table_schema,
    table: row.table_name,
  }));
};

const getBackupTableStats = async ({ scope, schema, table }) => {
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

    const [[countResult]] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM "${schema}"."${table}";`,
    );

    return {
      tablesIncluded: 1,
      rowsIncluded: Number(countResult?.count || 0),
    };
  }

  const counts = await Promise.all(
    tables.map(async (item) => {
      const [[countResult]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM "${item.schema}"."${item.table}";`,
      );

      return Number(countResult?.count || 0);
    }),
  );

  return {
    tablesIncluded: tables.length,
    rowsIncluded: counts.reduce((acc, value) => acc + value, 0),
  };
};

const runPgDump = async ({ outputPath, scope, schema, table, mode }) => {
  const { dbName, dbUser, dbPassword, dbHost, dbPort, sslmode } = getDbConfig();
  const pgDumpBin = await resolvePgDumpBin();

  const args = [
    "--no-owner",
    "--no-privileges",
    "-Fp",
    "--encoding=UTF8",
    "-h",
    dbHost,
    "-p",
    dbPort,
    "-U",
    dbUser,
    "-d",
    dbName,
    "-f",
    outputPath,
    "--exclude-schema=neon_auth",
    "--exclude-schema=pg_catalog",
    "--exclude-schema=information_schema",
  ];

  if (mode === "data-only") {
    args.push("--data-only", "--inserts");
  } else if (mode !== "schema-and-data") {
    const error = new Error("El modo de backup indicado no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (scope === "table") {
    validateIdentifier(schema, "schema");
    validateIdentifier(table, "tabla");

    const qualifiedTable = `"${schema}"."${table}"`;
    args.push("-t", qualifiedTable);
  } else {
    const tables = await getUserTables();
    const uniqueSchemas = [...new Set(tables.map((item) => item.schema))];

    if (uniqueSchemas.length === 0) {
      const error = new Error(
        "No se encontraron esquemas válidos para respaldar.",
      );
      error.statusCode = 400;
      throw error;
    }

    uniqueSchemas.forEach((schemaName) => {
      args.push("-n", schemaName);
    });
  }

  try {
    await spawnCommand(pgDumpBin, args, {
      env: {
        ...process.env,
        PGPASSWORD: dbPassword,
        PGSSLMODE: sslmode || "require",
      },
    });
  } catch (error) {
    const customError = new Error("No se pudo generar el backup con pg_dump.");
    customError.statusCode = 500;
    customError.detail =
      error?.stderr || error?.stdout || error?.message || "Error desconocido.";
    throw customError;
  }
};

const uploadBackupToCloudinary = async ({ buffer, filename, metadata }) => {
  if (!isCloudinaryConfigured()) return null;

  const publicId = filename.replace(/\.sql$/i, "");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "titanium/backups",
        resource_type: "raw",
        public_id: publicId,
        format: "sql",
        tags: [
          "backup",
          metadata.scope,
          metadata.schema || "all",
          metadata.mode || "schema-and-data",
          "sql",
          metadata.origin || "manual",
        ],
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

const readCloudinaryBackups = async () => {
  if (!isCloudinaryConfigured()) return [];

  const result = await cloudinary.api.resources({
    type: "upload",
    resource_type: "raw",
    prefix: "titanium/backups/",
    max_results: 100,
  });

  return (result.resources || []).map((item) => {
    const publicId = item.public_id || "";
    const filenameBase = publicId.split("/").pop() || publicId;
    const inferredFilename = filenameBase.endsWith(".sql")
      ? filenameBase
      : `${filenameBase}.sql`;

    return {
      id: item.asset_id || publicId,
      filename: inferredFilename,
      filePath: null,
      createdAt: item.created_at,
      scope: "unknown",
      schema: null,
      table: null,
      mode: inferredFilename.includes("datos")
        ? "data-only"
        : inferredFilename.includes("estructura-datos")
          ? "schema-and-data"
          : "unknown",
      source: "cloudinary",
      origin: "scheduled",
      tablesIncluded: null,
      rowsIncluded: null,
      sizeBytes: item.bytes || 0,
      sizeKB: bytesToKB(item.bytes || 0),
      format: item.format || "sql",
      engine: "postgresql",
      downloadUrl: null,
      restoreGuide: null,
      cloudinary: {
        assetId: item.asset_id,
        publicId: item.public_id,
        url: item.secure_url,
        bytes: item.bytes,
        format: item.format,
      },
    };
  });
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
        const parsed = JSON.parse(raw);

        return {
          ...parsed,
          source: parsed.source || "local",
          mode: parsed.mode || "schema-and-data",
          engine: parsed.engine || "postgresql",
          origin: parsed.origin || "manual",
        };
      }),
  );

  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const performBackup = async ({
  scope = "full",
  schema = DEFAULT_SCHEMA,
  table = null,
  uploadToCloudinary = false,
  mode = "schema-and-data",
  origin = "manual",
} = {}) => {
  if (!["full", "table"].includes(scope)) {
    const error = new Error("El tipo de backup debe ser 'full' o 'table'.");
    error.statusCode = 400;
    throw error;
  }

  if (!["data-only", "schema-and-data"].includes(mode)) {
    const error = new Error(
      "El modo de backup debe ser 'data-only' o 'schema-and-data'.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (scope === "table" && !table) {
    const error = new Error("Debes indicar la tabla a respaldar.");
    error.statusCode = 400;
    throw error;
  }

  await ensurePgDumpAvailable();
  await ensureBackupsDir();

  const statsInfo = await getBackupTableStats({ scope, schema, table });
  const filename = getBackupFilename({ scope, schema, table, mode });
  const filePath = path.join(backupsDir, filename);

  await runPgDump({
    outputPath: filePath,
    scope,
    schema,
    table,
    mode,
  });

  const buffer = await fs.readFile(filePath);
  const stats = await fs.stat(filePath);

  const metadata = {
    id: filename,
    filename,
    filePath,
    createdAt: new Date().toISOString(),
    scope,
    schema: scope === "table" ? schema : null,
    table: scope === "table" ? table : null,
    mode,
    source: "local",
    origin,
    engine: "postgresql",
    backupProvider: "spawn-pg_dump-auto",
    tablesIncluded: statsInfo.tablesIncluded,
    rowsIncluded: statsInfo.rowsIncluded,
    sizeBytes: stats.size,
    sizeKB: bytesToKB(stats.size),
    format: "sql",
    downloadUrl: `/api/admin/backups/download/${encodeURIComponent(filename)}`,
    restoreGuide: getRestoreGuide({ filename, mode, scope, schema, table }),
    cloudinary: null,
  };

  if (uploadToCloudinary) {
    metadata.cloudinary = await uploadBackupToCloudinary({
      buffer,
      filename,
      metadata,
    });
  }

  await fs.writeFile(
    `${filePath}.meta.json`,
    JSON.stringify(metadata, null, 2),
    "utf8",
  );

  return metadata;
};

export const getBackupOptions = async (_req, res) => {
  try {
    const tables = await getUserTables();

    return res.json({
      tables,
      cloudinaryEnabled: isCloudinaryConfigured(),
      backupsPath: backupsDir,
      backupFormat: "sql",
      engine: "postgresql",
      backupProvider: "spawn-pg_dump-auto",
      supportedScopes: [
        { value: "full", label: "Base completa" },
        { value: "table", label: "Tabla específica" },
      ],
      supportedModes: [
        { value: "data-only", label: "Datos solamente" },
        { value: "schema-and-data", label: "Estructura + datos" },
      ],
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
    const localBackups = await readBackupIndex();
    const cloudBackups = await readCloudinaryBackups();

    const merged = [...localBackups];

    for (const cloudItem of cloudBackups) {
      const exists = merged.some(
        (local) =>
          local.cloudinary?.publicId === cloudItem.cloudinary?.publicId ||
          local.filename === cloudItem.filename,
      );

      if (!exists) merged.push(cloudItem);
    }

    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.json({ backups: merged });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener el historial de backups.",
      detail: error.message,
    });
  }
};

export const createBackup = async (req, res) => {
  try {
    const metadata = await performBackup({
      ...(req.body || {}),
      origin: "manual",
    });

    return res.status(201).json({
      message:
        metadata.mode === "data-only"
          ? "Backup SQL de datos generado correctamente."
          : "Backup SQL de estructura + datos generado correctamente.",
      backup: metadata,
    });
  } catch (error) {
    console.error("❌ Error real al generar backup:", error);
    console.error("❌ Mensaje:", error?.message);
    console.error("❌ Detail:", error?.detail);
    console.error("❌ Stack:", error?.stack);

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

    if (!safeName.endsWith(BACKUP_EXTENSION)) {
      return res.status(400).json({
        error: "El archivo solicitado no es válido.",
      });
    }

    const filePath = path.join(backupsDir, safeName);
    await fs.access(filePath);
    return res.download(filePath, safeName);
  } catch {
    return res.status(404).json({
      error: "No se encontró el backup solicitado.",
    });
  }
};