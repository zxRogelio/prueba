import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { checkServerIdentity } from "node:tls";
import dotenv from "dotenv";
import { createPostgresConnection } from "../config/postgresConnection.js";
import { AUTHORIZED_DELIVERY_TARGET as target } from "../tests/integration/productDeliveryNeonSupport.js";

export function validateSslAuditTargets(env) {
  return ["RUNTIME", "IMPORTER", "REPORTS", "ADMIN_DIRECT"].map((name) => {
    let url;
    try { url = new URL(env["DATABASE_URL_" + name]); } catch { throw new Error("Missing or invalid SSL audit target."); }
    assert.equal(url.hostname.replace("-pooler.", "."), target.host, "Only the authorized pagos-test endpoint is permitted.");
    assert.equal(Number(url.port || 5432), target.port);
    assert.equal(decodeURIComponent(url.pathname.slice(1)), target.database);
    assert.equal(decodeURIComponent(url.username), target.username);
    return { name, url: url.href };
  });
}

export async function main(args = process.argv.slice(2)) {
  if (!args.length || (args.length === 1 && args[0] === "--plan")) {
    return { status: "prepared-not-executed", branch: target.branchName, connection: "none", writes: 0 };
  }
  assert.deepEqual(args, ["--run", "--branch", target.branchId], "Explicit authorization for the pinned test branch is required.");
  const env = dotenv.parse(await readFile(new URL("../.env", import.meta.url)));
  // Validate ALL destinations before opening the first connection.
  const targets = validateSslAuditTargets(env);
  const results = [];
  for (const item of targets) {
    const sequelize = createPostgresConnection(item.url, { pooled: item.name !== "ADMIN_DIRECT" });
    let client;
    try {
      client = await sequelize.connectionManager.getConnection();
      assert.equal(client.ssl.rejectUnauthorized, true);
      assert.equal(client.connection.stream.encrypted, true);
      assert.equal(client.connection.stream.authorized, true);
      const certificate = client.connection.stream.getPeerCertificate();
      assert.equal(checkServerIdentity(client.ssl.servername, certificate), undefined);
      assert.equal(checkServerIdentity("mismatch.invalid", certificate)?.code, "ERR_TLS_CERT_ALTNAME_INVALID");
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = '10s'");
      const { rows: [identity] } = await client.query(`SELECT current_setting('neon.branch_id',true) AS branch,
        current_setting('neon.endpoint_id',true) AS endpoint, current_database() AS database, current_user AS username,
        current_setting('transaction_read_only') AS read_only`);
      assert.equal(identity.branch, target.branchId);
      assert.equal(identity.endpoint, target.endpointId);
      assert.equal(identity.database, target.database);
      assert.equal(identity.username, target.username);
      assert.equal(identity.read_only, "on");
      results.push({ connection: item.name, branch: identity.branch, readOnly: true,
        certificateVerified: true, hostnameMismatchRejected: true, tls: client.connection.stream.getProtocol() });
    } finally {
      if (client) {
        await client.query("ROLLBACK").catch(() => {});
        await sequelize.connectionManager.releaseConnection(client);
      }
      await sequelize.close();
    }
  }
  return { status: "passed", writes: 0, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) {
    // Never print driver messages, configuration objects or connection URLs.
    console.error(JSON.stringify({ status: "failed", type: error.name, code: error.original?.code || error.code || "SSL_AUDIT_FAILED" }));
    process.exitCode = 1;
  }
}
