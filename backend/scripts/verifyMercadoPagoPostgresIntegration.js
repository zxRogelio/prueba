import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  assertAuthorizedIntegrationTarget, assertWriteAuthorization, diagnoseIntegrationError, integrationAssert, loadRealBackend, openClient, preflight, safeError, validateTarget,
} from "../tests/integration/mercadoPagoPostgresSupport.js";
import {
  CASES, SELECTIVE_CASES, buildManifest, cleanupFixtures, seedFixtures, validateManifest,
} from "../tests/integration/mercadoPagoPostgresFixtures.js";
import { protectedFingerprint, runScenarios } from "../tests/integration/mercadoPagoPostgresScenarios.js";
import { finalizeIntegrationRun, verifySavedRun } from "../tests/integration/mercadoPagoPostgresRunVerification.js";

export function parseIntegrationArgs(args) {
  const { values } = parseArgs({ args, options: {
    plan: { type: "boolean", default: false }, preflight: { type: "boolean", default: false },
    run: { type: "boolean", default: false }, cleanup: { type: "string" }, "verify-run": { type: "string" }, target: { type: "string" },
    "authorize-temporary-writes": { type: "boolean", default: false }, "confirm-database": { type: "string" },
    selective: { type: "boolean", default: false },
  }, strict: true, allowPositionals: false });
  integrationAssert([values.plan, values.preflight, values.run, Boolean(values.cleanup), Boolean(values["verify-run"])].filter(Boolean).length <= 1,
    "Choose exactly one integration mode.", "mode", "arguments");
  const mode = values.run ? "run" : values.cleanup ? "cleanup" : values["verify-run"] ? "verify-run" : values.preflight ? "preflight" : "plan";
  integrationAssert(!values.selective || ["run", "plan"].includes(mode),
    "Selective execution is only available for run or offline plan.", "--selective", "arguments");
  if (mode !== "plan") integrationAssert(Boolean(values.target), "A reviewed target file is required; supply --target with the reviewed local JSON file.", "--target", "arguments");
  if (["plan", "preflight", "verify-run"].includes(mode)) {
    integrationAssert(values["authorize-temporary-writes"] === false, "Read-only modes do not accept write authorization.", "--authorize-temporary-writes", "arguments");
    integrationAssert(values["confirm-database"] === undefined, "Read-only modes do not accept --confirm-database.", "--confirm-database", "arguments");
  }
  return { mode, targetPath: values.target, cleanupPath: values.cleanup,
    verificationPath: values["verify-run"],
    selective: values.selective,
    authorizeTemporaryWrites: values["authorize-temporary-writes"], confirmDatabase: values["confirm-database"] };
}

export async function main(args = process.argv.slice(2)) {
  let stage = "arguments";
  try { return await executeIntegration(args, (value) => { stage = value; }); }
  catch (error) { throw diagnoseIntegrationError(error, stage); }
}

async function executeIntegration(args, setStage) {
  const options = parseIntegrationArgs(args);
  if (options.mode === "plan") {
    console.log(JSON.stringify({ status: "prepared-not-executed", connection: "none", writes: 0,
      scenarios: options.selective ? SELECTIVE_CASES : CASES,
      additionalChecks: options.selective ? ["five real unique violations SQLSTATE 23505", "protected records unchanged", "scoped cleanup"]
        : ["fixture dryRun does not write", "real unique violations SQLSTATE 23505", "protected records unchanged", "scoped cleanup"] }, null, 2));
    return;
  }
  setStage("target_file");
  const targetContents = await readFile(options.targetPath, "utf8");
  setStage("target_json");
  const target = JSON.parse(targetContents);
  setStage("target_validation");
  if (options.selective) assertAuthorizedIntegrationTarget(target);
  const config = validateTarget(target, process.env.TITANIUM_PG_TEST_DATABASE_URL);
  setStage("write_authorization");
  if (["run", "cleanup"].includes(options.mode)) assertWriteAuthorization(options, config);
  setStage("database_connection");
  const monitor = await openClient(config, "titanium-pgit-preflight");
  let backend;
  let manifest;
  let seeded = false;
  let ownsRunLock = false;
  let protectedBefore;
  let primaryError;
  const report = (value) => console.log(JSON.stringify(value));
  try {
    setStage("preflight");
    const checked = await preflight(monitor, config);
    report({ phase: "preflight", ...checked });
    if (options.mode === "preflight") return;
    if (options.mode === "verify-run") {
      setStage("verify_run");
      manifest = JSON.parse(await readFile(options.verificationPath, "utf8"));
      report(await verifySavedRun(monitor, manifest, config.databaseId, report));
      return;
    }
    setStage("execution");
    if (options.mode === "cleanup") {
      manifest = JSON.parse(await readFile(options.cleanupPath, "utf8"));
    } else manifest = buildManifest(config.databaseId, { selective: options.selective });
    validateManifest(manifest, config.databaseId);
    // Los manifiestos selectivos de recuperacion conservan el mismo destino estricto.
    if (manifest.version === 3) assertAuthorizedIntegrationTarget(target);
    const { rows: [{ acquired }] } = await monitor.query("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired", [`titanium_pgit:${manifest.runId}`]);
    assert.equal(acquired, true, "Another process owns this integration run; cleanup is forbidden");
    ownsRunLock = true;
    const currentProtected = await protectedFingerprint(monitor);
    protectedBefore = options.mode === "cleanup" ? manifest.protectedFingerprint : currentProtected;
    if (options.mode === "cleanup") {
      integrationAssert(currentProtected === protectedBefore, "Protected records differ from the original run; review before cleanup.", "protectedFingerprint", "protected_records");
      report({ phase: "cleanup", runId: manifest.runId, ...await cleanupFixtures(monitor, manifest) });
      return;
    }
    const purchases = manifest.scenarios.flatMap((scenario) => scenario.purchases);
    const { rows: [{ count }] } = await monitor.query(`SELECT (
      (SELECT count(*) FROM core."Payments" WHERE "providerPaymentId"=ANY($1::text[])) +
      (SELECT count(*) FROM core."PaymentWebhookEvents" WHERE "providerPaymentId"=ANY($1::text[]))
    )::int AS count`, [purchases.map((purchase) => purchase.providerId)]);
    assert.equal(count, 0, "Synthetic provider IDs must not already exist");
    manifest.protectedFingerprint = protectedBefore;
    const directory = await mkdtemp(join(tmpdir(), "titanium-pgit-"));
    const manifestPath = join(directory, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: "wx", mode: 0o600 });
    report({ phase: "manifest", runId: manifest.runId, manifestPath,
      warning: "Temporary writes authorized for this destination; manifest contains no credentials" });
    const secrets = { jwt: randomBytes(48).toString("base64url"), webhook: randomBytes(32).toString("hex") };
    backend = await loadRealBackend(config, `pgit-${manifest.runId.slice(0, 8)}-fixtures`, secrets);
    // Incluso si falla el INSERT, se intenta limpiar por los IDs previamente persistidos.
    seeded = true;
    const operatorTokens = await seedFixtures(backend, manifest, secrets);
    await backend.close(); backend = null;
    await runScenarios({ config, monitor, manifest, secrets, operatorTokens, preflight: checked }, report);
    report({ phase: "tests", status: "passed", runId: manifest.runId });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const finalErrors = await finalizeIntegrationRun({ backend, client: monitor, manifest, seeded, protectedBefore }, report);
    if (ownsRunLock) await monitor.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [`titanium_pgit:${manifest.runId}`]).catch((error) => finalErrors.push(diagnoseIntegrationError(error, "cleanup")));
    await monitor.end().catch((error) => finalErrors.push(diagnoseIntegrationError(error, "cleanup")));
    if (finalErrors.length) {
      report({ phase: "finalization", status: "failed", errors: finalErrors.map(safeError) });
      if (!primaryError) throw finalErrors[0];
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("PostgreSQL integration stopped; no automatic retry:", safeError(error));
    process.exitCode = 1;
  });
}
