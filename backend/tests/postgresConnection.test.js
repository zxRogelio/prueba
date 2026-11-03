import assert from "node:assert/strict";
import test from "node:test";
import { postgresOptions, createPostgresConnection } from "../config/postgresConnection.js";
import { main as sslAudit, validateSslAuditTargets } from "../scripts/verifyProductDeliverySsl.js";

const target = "postgresql://fixture:fictional-test-only@database.invalid/gym?sslmode=require&channel_binding=require";

test("PostgreSQL requires verified TLS even when the URL says sslmode=require", async () => {
  const sequelize = createPostgresConnection(target);
  try {
    const client = new sequelize.connectionManager.lib.Client({ ...sequelize.config, ...sequelize.options.dialectOptions });
    assert.equal(client.ssl.rejectUnauthorized, true);
    assert.equal(client.ssl.servername, "database.invalid");
    assert.equal(client.ssl.minVersion, "TLSv1.2");
    assert.equal(client.enableChannelBinding, true);
    assert.equal(client.connectionParameters.ssl.rejectUnauthorized, true);
    assert.equal(sequelize.config.host, "database.invalid");
  } finally { await sequelize.close(); }
});

test("PostgreSQL URL options cannot downgrade TLS or replace identity", () => {
  for (const query of ["sslmode=disable", "sslmode=no-verify", "sslmode=prefer", "ssl=false", "host=other.invalid",
    "user=other", "password=other", "connectionString=anything", "channel_binding=disable", "sslmode=require&sslmode=disable"]) {
    assert.throws(() => postgresOptions(target.split("?")[0] + "?" + query));
  }
});

test("PostgreSQL parsing preserves escaped credentials and pool limits", () => {
  const options = postgresOptions("postgres://synthetic%40user:fictional%3Aonly%2Bpass@database.invalid:5433/gym%20test", { pooled: false });
  assert.equal(options.username, "synthetic@user");
  assert.equal(options.password, "fictional:only+pass");
  assert.equal(options.database, "gym test"); assert.equal(options.port, 5433);
  assert.equal(options.pool.max, 1); assert.equal(postgresOptions(target).pool.max, 10);
});

test("PostgreSQL supported application settings remain separate from TLS", () => {
  const options = postgresOptions(target + "&application_name=audit&connect_timeout=5&statement_timeout=15000&options=-c%20search_path%3Dcore");
  assert.equal(options.dialectOptions.application_name, "audit");
  assert.equal(options.dialectOptions.connectionTimeoutMillis, 5000);
  assert.equal(options.dialectOptions.statement_timeout, 15000);
  assert.equal(options.dialectOptions.options, "-c search_path=core");
  assert.equal(options.dialectOptions.ssl.rejectUnauthorized, true);
});

test("PostgreSQL invalid URLs and TLS file errors do not disclose connection values", () => {
  for (const url of ["fictional-secret-invalid-url", "https://database.invalid/gym", target + "#fragment", target + "&connect_timeout=NaN",
    target + "&sslrootcert=nonexistent-fictional-cert-file"]) {
    assert.throws(() => postgresOptions(url), (error) => !error.message.includes(url) && !error.message.includes("fictional-secret"));
  }
});

test("SSL audit defaults to an offline plan and rejects execution without the pinned branch", async () => {
  assert.deepEqual(await sslAudit([]), { status: "prepared-not-executed", branch: "pagos-test", connection: "none", writes: 0 });
  await assert.rejects(() => sslAudit(["--run"]));
  await assert.rejects(() => sslAudit(["--run", "--branch", "br-production"]));
});

test("SSL audit validates every endpoint before opening any connection", () => {
  const base = "postgres://neondb_owner:fictional-only@ep-long-snow-akwnltba.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require";
  const env = Object.fromEntries(["RUNTIME", "IMPORTER", "REPORTS", "ADMIN_DIRECT"].map((name) => ["DATABASE_URL_" + name, base]));
  assert.equal(validateSslAuditTargets(env).length, 4);
  env.DATABASE_URL_REPORTS = base.replace("ep-long-snow-akwnltba", "ep-production");
  assert.throws(() => validateSslAuditTargets(env));
});
