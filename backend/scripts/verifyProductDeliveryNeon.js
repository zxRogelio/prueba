import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { AUTHORIZED_DELIVERY_TARGET as target, connectionConfig, openClient, snapshotExisting,
  createManifest, cleanupFixtures, loadBackend, reportRoot, MIGRATION, TABLES } from "../tests/integration/productDeliveryNeonSupport.js";

export function parseArgs(args) {
  if (!args.length || (args.length === 1 && args[0] === "--plan")) return { mode: "plan" };
  const mode = args[0];
  assert.ok(mode === "--run" || mode === "--cleanup", "Only explicit run or scoped cleanup is supported.");
  let manifestPath = null;
  let rest = args.slice(1);
  if (mode === "--cleanup") { manifestPath = rest.shift(); assert.ok(manifestPath); }
  assert.deepEqual(rest, ["--use-authorized-env", "--confirm-database", target.databaseId, "--confirm-branch", target.branchId], "Explicit target authorization flags are required.");
  if (manifestPath) {
    const absolute = resolve(manifestPath);
    assert.equal(resolve(absolute, ".."), resolve(reportRoot));
    assert.match(absolute.slice(resolve(reportRoot).length + 1), /^[a-f0-9-]{36}\.json$/);
  }
  return { mode: mode.slice(2), manifestPath };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.mode === "plan") return { status: "prepared-not-executed", writes: 0, target,
    cases: ["migration and atomic metadata", "rollback and reapply", "SQL constraints and indexes", "addresses and ownership", "rates and totals",
      "pickup and delivery", "payment idempotence", "real PostgreSQL lock races", "membership compatibility", "scoped cleanup and existing-row fingerprints"] };
  // This flag was explicitly authorized by the user for pagos-test. Parse the
  // file without dotenv.config(), changing process.env or logging its contents.
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  const fileBefore = await readFile(envPath);
  const env = dotenv.parse(fileBefore);
  const config = connectionConfig(env.DATABASE_URL_ADMIN_DIRECT);
  const client = await openClient(config, "pgdel-coordinator");
  const backends = [];
  let store;
  try {
    if (options.mode === "cleanup") {
      const manifest = JSON.parse(await readFile(options.manifestPath, "utf8"));
      const remainingFixtures = await cleanupFixtures(client, manifest);
      const after = await snapshotExisting(client, Object.keys(manifest.baseline));
      const existingRecordsUnchanged = JSON.stringify(after) === JSON.stringify(manifest.baseline);
      assert.equal(existingRecordsUnchanged, true, "Preexisting rows must remain unchanged after recovery.");
      manifest.recovery = { completedAt: new Date().toISOString(), remainingFixtures, existingRecordsUnchanged };
      await writeFile(options.manifestPath, JSON.stringify(manifest, null, 2));
      return { status: "cleaned", remainingFixtures, existingRecordsUnchanged };
    }
    store = await createManifest();
    const check = async (name, callback) => {
      try {
        const evidence = await callback(); store.manifest.checks.push({ name, ok: true, ...(evidence ? { evidence } : {}) });
        console.log("PASS " + name);
      } catch (error) {
        store.manifest.checks.push({ name, ok: false, code: error.original?.code || error.code || null });
        throw error;
      } finally { await store.save(); }
    };
    await check("identity and certificate verified on authorized Neon branch", async () => {
      const { rows: [identity] } = await client.query("SELECT current_setting('neon.branch_id') AS branch_id,current_setting('neon.project_id',true) AS project_id,current_setting('server_version') AS version");
      store.manifest.identity = { ...identity, clientTls: client.connection.stream.getProtocol(), certificateVerified: true };
    });
    const baseline = await snapshotExisting(client); store.manifest.baseline = baseline; await store.save();
    const migration = await import(new URL("../migrations/" + MIGRATION, import.meta.url));
    const already = (await client.query('SELECT 1 FROM core."SequelizeMeta" WHERE name=$1', [MIGRATION])).rowCount > 0;
    await check(already ? "existing delivery migration verified without repeating DDL" : "delivery migration, empty rollback, reapplication and atomic metadata", async () => {
      if (already) {
        assert.equal((await client.query("SELECT tablename FROM pg_tables WHERE schemaname='core' AND tablename=ANY($1::text[])", [TABLES])).rowCount, 4);
        store.manifest.migration = "already-applied; initial empty rollback not repeated";
        return;
      }
      const present = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='core' AND tablename=ANY($1::text[])", [TABLES])).rows;
      assert.equal(present.length, 0, "Partial delivery schema requires review before applying.");
      await client.query("BEGIN");
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('titanium-delivery-migration'))");
        await client.query("SET LOCAL lock_timeout='5s'");
        const transaction = {};
        const sequelize = { query: (sql, context) => { assert.equal(context.transaction, transaction); return client.query(sql); } };
        await migration.up({ sequelize, transaction });
        await migration.down({ sequelize, transaction });
        assert.equal((await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='Orders' AND column_name='shippingTotal'")).rowCount, 0);
        await migration.up({ sequelize, transaction });
        await client.query('INSERT INTO core."SequelizeMeta" (name) VALUES ($1)', [MIGRATION]);
        await client.query("COMMIT");
        store.manifest.migration = "applied; empty down and reapplication verified in same transaction";
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    });
    await check("migration registry prevents a second application", async () => {
      assert.equal((await client.query('SELECT count(*)::int AS count FROM core."SequelizeMeta" WHERE name=$1', [MIGRATION])).rows[0].count, 1);
    });
    const secrets = { jwt: randomBytes(32).toString("hex"), webhook: randomBytes(32).toString("hex") };
    const prefix = "pgdel-" + store.manifest.runId.slice(0, 8);
    for (const suffix of ["one", "two"]) backends.push(await loadBackend(config, store, prefix + "-" + suffix, secrets));
    const { runScenarios } = await import("../tests/integration/productDeliveryNeonScenarios.js");
    await runScenarios({ client, config, backends, labels: [prefix + "-one", prefix + "-two"], store, check });
    store.manifest.status = "passed";
  } catch (error) {
    if (store) { store.manifest.status = "failed"; store.manifest.error = { name: error.name, code: error.original?.code || error.code || null,
      // All assertion labels are written by this harness; never include SQL/URL.
      ...(error.name === "AssertionError" ? { assertion: String(error.message).split("\n")[0].slice(0, 180) } : {}) }; }
    if (store && store.manifest.checks.at(-1)?.ok !== false) store.manifest.checks.push({ name: "harness initialization or execution", ok: false });
    process.exitCode = 1;
  } finally {
    await Promise.all(backends.map((backend) => backend.close()));
    if (store) {
      try {
        store.manifest.remainingFixtures = await cleanupFixtures(client, store.manifest);
        if (store.manifest.baseline) {
          const after = await snapshotExisting(client, Object.keys(store.manifest.baseline));
          store.manifest.existingRecordsUnchanged = JSON.stringify(after) === JSON.stringify(store.manifest.baseline);
          assert.equal(store.manifest.existingRecordsUnchanged, true, "Existing rows changed.");
        }
        store.manifest.checks.push({ name: "all fixtures removed and all preexisting rows unchanged", ok: true });
      } catch (error) { store.manifest.status = "failed"; store.manifest.cleanupError = { name: error.name, code: error.code || null };
        store.manifest.checks.push({ name: "fixture cleanup and preservation", ok: false }); process.exitCode = 1; }
      store.manifest.completedAt = new Date().toISOString(); await store.save();
    }
    await client.end();
    assert.deepEqual(await readFile(envPath), fileBefore, "The original .env must remain unchanged.");
  }
  return { status: store.manifest.status, target, runId: store.manifest.runId, report: store.path,
    passed: store.manifest.checks.filter((item) => item.ok).length, failed: store.manifest.checks.filter((item) => !item.ok).length,
    remainingFixtures: store.manifest.remainingFixtures, existingRecordsUnchanged: store.manifest.existingRecordsUnchanged,
    error: store.manifest.error || store.manifest.cleanupError || null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: "not-completed", code: error.original?.code || error.code || null,
    error: "Delivery Neon verification did not complete. Review target guards and the scoped manifest; no credentials are printed." })); process.exitCode = 1; }
}
