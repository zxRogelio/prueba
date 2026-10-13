import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";
import pg from "pg";

pg.types.setTypeParser(1082, (value) => value); // DATE sin conversion de zona horaria.

export const PROTECTED_PROVIDER_ID = "183880156306";
export const PROTECTED_ORDER_NUMBER = "ORD-2026-000259";
export const PROTECTED_IDS = new Set([
  "d09a4b5c-1f30-4e5c-9349-d6540fe70d1b",
  "d09a4b5c-1f30-4e0c-ac49-a26c1b146fdc",
  "6c3e5128-93f7-4de5-9349-d6540fe70d1b",
]);
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const AUTHORIZED_INTEGRATION_TARGET = Object.freeze({
  environment: "test", neonBranchId: "br-divine-butterfly-akvmjram",
  host: "ep-falling-wave-akf610u0.c-3.us-west-2.aws.neon.tech",
  expectedDatabaseId: "d0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3",
});
export function assertAuthorizedIntegrationTarget(target) {
  for (const [field, value] of Object.entries(AUTHORIZED_INTEGRATION_TARGET)) {
    integrationAssert(target?.[field] === value,
      "Target differs from the explicitly authorized integration destination.", field);
  }
  integrationAssert(target.branchVerifiedInNeon === true,
    "The authorized branch must have its endpoint verified in Neon.", "branchVerifiedInNeon");
}
export const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
// Solo estos mensajes escritos por el arnes pueden publicarse; nunca error.message.
const diagnostics = new WeakMap();
const diagnosticFiles = [
  [new URL(import.meta.url), "backend/tests/integration/mercadoPagoPostgresSupport.js"],
  [new URL("../../scripts/verifyMercadoPagoPostgresIntegration.js", import.meta.url), "backend/scripts/verifyMercadoPagoPostgresIntegration.js"],
  ...["mercadoPagoPostgresScenarios.js", "mercadoPagoPostgresFixtures.js", "mercadoPagoPostgresWorker.js", "mercadoPagoPostgresRunVerification.js"].map((file) =>
    [new URL(file, import.meta.url), `backend/tests/integration/${file}`]),
];
function safeLocation(error) {
  for (const frame of String(error?.stack || "").split("\n").slice(1)) {
    const match = /^\s+at (?:[^()]+ \()?(.+):(\d+):(\d+)\)?$/.exec(frame);
    if (!match) continue;
    const file = diagnosticFiles.find(([url]) => [url.href, fileURLToPath(url)].includes(match[1]));
    if (file) return { file: file[1], line: Number(match[2]), column: Number(match[3]) };
  }
  return null;
}
const diagnosticValues = new Set(["paid", "pending", "pending_admin_approval", "pending_members", "issued",
  "failed", "processed", "PGIT_INJECTED_FAILURE", "23505"]);
const safeDiagnosticValue = (value) => value == null ? null
  : typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ? value
  : diagnosticValues.has(value) ? value : "[redacted]";
const validationFields = new Set(["invitedEmail", "groupId", "userId", "priceShare", "status", "role", "totalAmount", "memberLimit"]);
const validationRules = new Set(["isEmail", "is_null", "notNull", "min", "max", "isUUID"]);
function safeWorkerDiagnostic(value) {
  const names = new Set(["Error", "AssertionError", "SequelizeValidationError", "SequelizeDatabaseError",
    "SequelizeUniqueConstraintError", "SequelizeForeignKeyConstraintError"]);
  return { name: names.has(value?.name) ? value.name : "Error",
    code: /^(?:\d{5}|PGIT_INJECTED_FAILURE|ERR_ASSERTION)$/.test(value?.code || "") ? value.code : null,
    statusCode: Number.isInteger(value?.statusCode) ? value.statusCode : null,
    ...(Array.isArray(value?.validationErrors) ? { validationErrors: value.validationErrors.map((item) => ({
      field: validationFields.has(item?.field) ? item.field : "[redacted]",
      validator: validationRules.has(item?.validator) ? item.validator : "[redacted]",
    })) } : {}) };
}
export function integrationAssert(condition, message, field, stage = "target_validation", details = {}) {
  if (condition) return;
  const error = new assert.AssertionError({ message, operator: "integration validation", stackStartFn: integrationAssert });
  diagnostics.set(error, { message, stage, ...(field ? { field } : {}), location: safeLocation(error),
    ...("expected" in details ? { expected: safeDiagnosticValue(details.expected) } : {}),
    ...("actual" in details ? { actual: safeDiagnosticValue(details.actual) } : {}),
    ...(details.worker ? { worker: safeWorkerDiagnostic(details.worker) } : {}) });
  throw error;
}
export function diagnoseIntegrationError(error, stage) {
  const messages = {
    arguments: "Invalid integration arguments; review the supported modes and required --target.",
    target_file: "Cannot read the file supplied with --target; check that it exists and is readable.",
    target_json: "The file supplied with --target must contain valid JSON.",
    target_validation: "Invalid reviewed destination or dedicated test connection configuration.",
    write_authorization: "Temporary writes require explicit authorization for the exact destination.",
    database_connection: "Cannot connect to the reviewed test destination; check the safe error code and TLS configuration.",
    preflight: "Read-only PostgreSQL preflight failed; check the safe error code and destination schema.",
    execution: "Integration execution failed; no automatic retry.",
    worker: "Integration worker operation failed; review the safe validation fields and source location.",
    cleanup: "Fixture cleanup failed; manual review required, no automatic retry.",
    protected_records: "Protected records verification failed; do not resume integration writes.",
    verify_run: "Read-only verification of the saved integration run failed.",
  };
  if (!diagnostics.has(error) && messages[stage]) {
    diagnostics.set(error, { message: messages[stage], stage, location: safeLocation(error) });
  }
  return error;
}
export function databaseId(config) {
  return createHash("sha256").update(JSON.stringify({
    host: config.host.toLowerCase(), port: Number(config.port || 5432),
    database: config.database, username: config.username, schema: "core",
  })).digest("hex");
}

// No lee .env ni acepta DATABASE_URL_RUNTIME como respaldo.
export function validateTarget(target, connectionString) {
  integrationAssert(target && typeof target === "object" && !Array.isArray(target), "The reviewed target must be a JSON object.", "target");
  integrationAssert(target.environment === "test", "Only an independently verified test branch is allowed.", "environment");
  integrationAssert(typeof target.neonBranchId === "string" && /^br-[a-z0-9-]+$/.test(target.neonBranchId), "neonBranchId must be a Neon resource ID starting with br-, not the branch display name.", "neonBranchId");
  integrationAssert(target.branchVerifiedInNeon === true, "Verify the host/branch mapping in Neon before setting branchVerifiedInNeon to true.", "branchVerifiedInNeon");
  integrationAssert(typeof target.expectedDatabaseId === "string" && /^[a-f0-9]{64}$/.test(target.expectedDatabaseId), "expectedDatabaseId must contain the independently approved SHA-256 fingerprint.", "expectedDatabaseId");
  integrationAssert(typeof target.host === "string" && /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(target.host), "host must be the reviewed Neon endpoint hostname.", "host");
  integrationAssert(!target.host.split(".")[0].endsWith("-pooler"), "Use a direct Neon endpoint for stable independent backend PIDs.", "host");
  integrationAssert(Number(target.port) === 5432, "The reviewed PostgreSQL port must be 5432.", "port");
  integrationAssert(typeof target.database === "string" && target.database.length > 0, "The reviewed database name is required.", "database");
  integrationAssert(typeof target.username === "string" && target.username.length > 0, "The reviewed PostgreSQL role is required.", "username");
  integrationAssert(databaseId(target) === target.expectedDatabaseId, "Trusted target fingerprint is inconsistent; review the direct host, port, database, role and approved fingerprint together.", "expectedDatabaseId");
  let url;
  integrationAssert(typeof connectionString === "string" && connectionString.length > 0, "Set TITANIUM_PG_TEST_DATABASE_URL in the process environment; this runner does not load .env or use DATABASE_URL_RUNTIME.", "TITANIUM_PG_TEST_DATABASE_URL");
  try { url = new URL(connectionString); }
  catch { integrationAssert(false, "TITANIUM_PG_TEST_DATABASE_URL must contain a valid dedicated PostgreSQL test URL.", "TITANIUM_PG_TEST_DATABASE_URL"); }
  integrationAssert(["postgres:", "postgresql:"].includes(url.protocol), "The dedicated test URL must use the postgres or postgresql protocol.", "TITANIUM_PG_TEST_DATABASE_URL.protocol");
  integrationAssert(url.hostname.toLowerCase() === target.host.toLowerCase(), "URL host differs from the approved host.", "TITANIUM_PG_TEST_DATABASE_URL.host");
  integrationAssert(Number(url.port || 5432) === Number(target.port), "URL port differs from the approved port.", "TITANIUM_PG_TEST_DATABASE_URL.port");
  let database, username;
  try { database = decodeURIComponent(url.pathname.slice(1)); username = decodeURIComponent(url.username); decodeURIComponent(url.password); }
  catch { integrationAssert(false, "The dedicated test URL contains invalid percent encoding.", "TITANIUM_PG_TEST_DATABASE_URL"); }
  integrationAssert(database === target.database, "URL database differs from the approved database.", "TITANIUM_PG_TEST_DATABASE_URL.database");
  integrationAssert(username === target.username, "URL role differs from the approved PostgreSQL role.", "TITANIUM_PG_TEST_DATABASE_URL.username");
  // Evita opciones que redirijan el host o sobrescriban TLS/search_path.
  for (const key of url.searchParams.keys()) {
    integrationAssert(["sslmode", "channel_binding"].includes(key), "Unsupported test URL option; only sslmode and channel_binding are allowed.", "TITANIUM_PG_TEST_DATABASE_URL.options");
  }
  return { target, url, databaseId: target.expectedDatabaseId };
}

export function assertWriteAuthorization({ mode, authorizeTemporaryWrites, confirmDatabase }, config) {
  integrationAssert(["run", "cleanup"].includes(mode), "Only run and cleanup modes can request temporary writes.", "mode", "write_authorization");
  integrationAssert(authorizeTemporaryWrites === true, "Temporary writes require explicit prior authorization.", "--authorize-temporary-writes", "write_authorization");
  integrationAssert(confirmDatabase === config.databaseId, "Explicit destination confirmation must match the approved fingerprint.", "--confirm-database", "write_authorization");
}

export function connectionOptions(config, applicationName) {
  const { url } = config;
  return {
    host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    application_name: applicationName, connectionTimeoutMillis: 10000,
    statement_timeout: 25000, lock_timeout: 20000, idle_in_transaction_session_timeout: 30000,
  };
}
export async function openClient(config, name) {
  const client = new pg.Client(connectionOptions(config, name));
  await client.connect();
  return client;
}

export async function preflight(client, config) {
  await client.query("BEGIN READ ONLY");
  try {
    const { rows: [identity] } = await client.query(
      "SELECT current_database() AS database, current_user AS username, pg_backend_pid() AS pid, current_setting('transaction_read_only') AS read_only, current_setting('default_transaction_isolation') AS isolation"
    );
    integrationAssert(identity.database === config.target.database, "Connected database differs from the approved database.", "current_database", "preflight");
    integrationAssert(identity.username === config.target.username, "Connected PostgreSQL role differs from the approved role.", "current_user", "preflight");
    integrationAssert(identity.read_only === "on", "Preflight must execute in a read-only transaction.", "transaction_read_only", "preflight");
    integrationAssert(identity.isolation === "read committed", "Activation services require READ COMMITTED.", "default_transaction_isolation", "preflight");
    const { rows: columns } = await client.query(`
      SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name IN ('UserSubscriptions','SubscriptionGroups')
        AND column_name IN ('startsAt','endsAt')`);
    integrationAssert(columns.length === 4, "Required subscription date columns are missing.", "subscription_date_columns", "preflight");
    integrationAssert(columns.every((column) => column.data_type === "date"), "Inclusive periods require DATE columns.", "subscription_date_columns", "preflight");
    const { rows: indexes } = await client.query(`
      SELECT t.relname AS table_name, ix.relname AS name, i.indisunique AS is_unique, i.indisvalid AS is_valid,
        pg_get_indexdef(i.indexrelid) AS definition,
        ARRAY(SELECT a.attname::text FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum
          WHERE k.ord <= i.indnkeyatts ORDER BY k.ord) AS columns
      FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class ix ON ix.oid=i.indexrelid
        JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='core' AND t.relname=ANY($1::text[])`, [[
      "Payments", "Receipts", "UserSubscriptions", "SubscriptionGroups", "SubscriptionGroupMembers",
      "SubscriptionHistories", "PaymentWebhookEvents",
    ]]);
    for (const [table, fields] of [
      ["Payments", ["provider", "providerPaymentId"]], ["Receipts", ["paymentId"]],
      ["UserSubscriptions", ["orderItemId"]], ["SubscriptionGroups", ["orderItemId"]],
      ["SubscriptionGroupMembers", ["groupId", "invitedEmail"]],
      ["SubscriptionHistories", ["subscriptionId"]], ["PaymentWebhookEvents", ["provider", "providerEventId"]],
    ]) {
      integrationAssert(indexes.some((index) => index.table_name === table && index.is_unique && index.is_valid &&
        JSON.stringify(index.columns) === JSON.stringify(fields)), `Missing valid unique index: ${table}(${fields})`, "unique_indexes", "preflight");
    }
    await client.query("COMMIT");
    return {
      environment: "test", neonBranchId: config.target.neonBranchId, host: config.target.host,
      database: identity.database, username: identity.username, databaseId: config.databaseId,
      dateColumns: columns, indexCount: indexes.length, indexes, writes: 0,
    };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export function assertFixtureIds(fixture, runId) {
  assert.match(runId, UUID);
  assert.equal(fixture.runId, runId);
  for (const id of [fixture.userId, fixture.planId, fixture.orderId, fixture.itemId, fixture.paymentId]) {
    assert.match(id, UUID);
    assert.ok(!PROTECTED_IDS.has(id), "Protected real entity cannot be used as a fixture");
  }
  assert.match(fixture.providerId, /^98\d{20}$/);
  assert.notEqual(fixture.providerId, PROTECTED_PROVIDER_ID);
}

// Solo se invoca despues de la autorizacion y preflight; usa modelos/servicios reales.
export async function loadRealBackend(config, name, secrets) {
  const { default: dotenv } = await import("dotenv");
  dotenv.config = () => ({ parsed: {} }); // Impide cargar credenciales del .env abierto en el IDE.
  const forbidden = () => { throw new Error("HTTP/provider traffic forbidden in PostgreSQL integration tests"); };
  globalThis.fetch = forbidden;
  http.request = http.get = https.request = https.get = forbidden;
  syncBuiltinESMExports();
  for (const key of Object.keys(process.env)) {
    if (/^(DATABASE_|MERCADOPAGO_|JWT_SECRET)/.test(key)) delete process.env[key];
  }
  const runtimeUrl = new URL(config.url);
  runtimeUrl.search = "";
  for (const key of ["DATABASE_URL_RUNTIME", "DATABASE_URL_IMPORTER", "DATABASE_URL_REPORTS", "DATABASE_URL_ADMIN_DIRECT"]) {
    process.env[key] = runtimeUrl.toString();
  }
  Object.assign(process.env, {
    NODE_ENV: "test", JWT_SECRET: secrets.jwt,
    MERCADOPAGO_WEBHOOK_SECRET: secrets.webhook, MERCADOPAGO_ACCESS_TOKEN: "APP_USR-pgit-not-a-credential",
    MERCADOPAGO_EXPECTED_SELLER_ID: "999000123", MERCADOPAGO_EXPECTED_LIVE_MODE: "true",
    MERCADOPAGO_RECONCILIATION_ENVIRONMENT: "test",
    MERCADOPAGO_RECONCILIATION_PAYMENT_MODE: "checkout_pro_test_account",
    MERCADOPAGO_RECONCILIATION_DATABASE_ID: config.databaseId,
  });
  const connections = await import("../../config/sequelize.js");
  const instances = Object.values(connections);
  for (const sequelize of instances) {
    assert.equal(databaseId(sequelize.config), config.databaseId);
    sequelize.options.pool.max = 1;
    sequelize.options.pool.idle = 120000;
    await sequelize.connectionManager.pool.destroyAllNow();
    sequelize.connectionManager.config.pool.max = 1;
    sequelize.connectionManager.config.pool.idle = 120000;
    sequelize.connectionManager.initPools();
    // Se aplica exclusivamente a las conexiones de este proceso de prueba.
    sequelize.addHook("beforeConnect", (options) => {
      assert.equal(databaseId(options), config.databaseId);
      options.dialectOptions = { ...options.dialectOptions,
        ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        application_name: name, statement_timeout: 25000, lock_timeout: 20000,
        idle_in_transaction_session_timeout: 30000, connectionTimeoutMillis: 10000,
      };
    });
  }
  const models = await import("../../models/index.js");
  const payments = await import("../../services/paymentService.js");
  const memberships = await import("../../services/membershipActivationService.js");
  const checkout = await import("../../services/mercadoPagoCheckoutService.js");
  return { sequelize: connections.sequelize, models, payments, memberships, checkout,
    close: () => Promise.all(instances.map((connection) => connection.close())) };
}

export function newProviderId() {
  return "98" + BigInt("0x" + randomUUID().replaceAll("-", "").slice(0, 16)).toString().padStart(20, "0");
}
export function safeError(error) {
  const original = error?.cause || error;
  // Nunca publica message/stack/SQL/parameters del error original.
  // La causa legible y ubicacion provienen exclusivamente de diagnosticos internos.
  return { name: /^[A-Za-z]+$/.test(error?.name || "") ? error.name : "Error",
    code: /^[A-Z0-9_]{1,40}$/.test(original?.original?.code || original?.code || "")
      ? (original.original?.code || original.code) : null,
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : null,
    ...(["AssertionError", "SequelizeValidationError", "SequelizeDatabaseError", "SequelizeUniqueConstraintError",
      "SequelizeForeignKeyConstraintError"].includes(error?.cause?.name) ? { worker: safeWorkerDiagnostic(error.cause) } : {}),
    ...(safeLocation(error) ? { location: safeLocation(error) } : {}),
    ...(error?.name === "SequelizeValidationError" && Array.isArray(error.errors) ? {
      validationErrors: error.errors.map((item) => ({
        field: validationFields.has(item.path) ? item.path : "[redacted]",
        validator: validationRules.has(item.validatorKey) ? item.validatorKey : "[redacted]",
      })),
    } : {}),
    ...(diagnostics.get(error) || {}) };
}
