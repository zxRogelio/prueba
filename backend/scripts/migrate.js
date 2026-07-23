import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as SequelizeModule from "sequelize";
import { sequelize, sequelizeAdminDirect } from "../config/sequelize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");
const metaTable = { schema: "core", tableName: "SequelizeMeta" };
const migrationSequelize = sequelizeAdminDirect || sequelize;

const validCommands = new Set(["up", "down", "status"]);

async function ensureMetaTable() {
  const [schemas] = await migrationSequelize.query(
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core' LIMIT 1;"
  );

  if (schemas.length === 0) {
    await migrationSequelize.query('CREATE SCHEMA "core";');
  }

  await migrationSequelize.query(`
    CREATE TABLE IF NOT EXISTS "core"."SequelizeMeta" (
      "name" VARCHAR(255) PRIMARY KEY,
      "executedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function listMigrationFiles() {
  const files = await fs.readdir(migrationsDir);

  return files
    .filter((file) => /^\d+-.+\.js$/.test(file))
    .sort((left, right) => left.localeCompare(right));
}

async function getExecutedMigrations() {
  const [rows] = await migrationSequelize.query(
    'SELECT "name", "executedAt" FROM "core"."SequelizeMeta" ORDER BY "name" ASC;'
  );

  return rows;
}

async function loadMigration(filename) {
  const migrationPath = path.join(migrationsDir, filename);
  const migration = await import(pathToFileURL(migrationPath).href);

  if (typeof migration.up !== "function" || typeof migration.down !== "function") {
    throw new Error(`La migracion ${filename} debe exportar up y down.`);
  }

  return migration;
}

async function runMigration(filename, direction) {
  const migration = await loadMigration(filename);
  const queryInterface = migrationSequelize.getQueryInterface();
  const context = {
    sequelize: migrationSequelize,
    queryInterface,
    Sequelize: SequelizeModule,
    transaction: null,
  };
  const useTransaction = migration.useTransaction !== false;

  if (!useTransaction) {
    await migration[direction](context);
    return;
  }

  await migrationSequelize.transaction(async (transaction) => {
    await migration[direction]({
      ...context,
      transaction,
    });
  });
}

async function status() {
  await ensureMetaTable();

  const files = await listMigrationFiles();
  const executedRows = await getExecutedMigrations();
  const executed = new Map(
    executedRows.map((row) => [row.name, row.executedAt])
  );

  if (files.length === 0) {
    console.log("No hay archivos de migracion.");
    return;
  }

  for (const file of files) {
    const marker = executed.has(file) ? "up" : "down";
    console.log(`${marker.padEnd(4)} ${file}`);
  }
}

async function up() {
  await ensureMetaTable();

  const files = await listMigrationFiles();
  const executedRows = await getExecutedMigrations();
  const executed = new Set(executedRows.map((row) => row.name));
  const pending = files.filter((file) => !executed.has(file));

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const file of pending) {
    console.log(`Aplicando ${file}`);
    await runMigration(file, "up");
    await migrationSequelize.getQueryInterface().bulkInsert(metaTable, [
      {
        name: file,
        executedAt: new Date(),
      },
    ]);
  }
}

async function down() {
  await ensureMetaTable();

  const files = await listMigrationFiles();
  const fileSet = new Set(files);
  const executedRows = await getExecutedMigrations();
  const executedExisting = executedRows.filter((row) => fileSet.has(row.name));
  const last = executedExisting.at(-1);

  if (!last) {
    console.log("No hay migraciones aplicadas para revertir.");
    return;
  }

  console.log(`Revirtiendo ${last.name}`);
  await runMigration(last.name, "down");
  await migrationSequelize.getQueryInterface().bulkDelete(metaTable, {
    name: last.name,
  });
}

async function main() {
  const command = process.argv[2] || "status";

  if (!validCommands.has(command)) {
    throw new Error(
      `Comando invalido "${command}". Usa up, down o status.`
    );
  }

  if (command === "up") await up();
  if (command === "down") await down();
  if (command === "status") await status();
}

main()
  .catch((error) => {
    console.error("Error ejecutando migraciones:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await migrationSequelize.close();

    if (sequelize !== migrationSequelize) {
      await sequelize.close();
    }
  });
