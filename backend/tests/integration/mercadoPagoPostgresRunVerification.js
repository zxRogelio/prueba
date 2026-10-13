import { cleanupFixtures, ownedRows, validateManifest } from "./mercadoPagoPostgresFixtures.js";
import { protectedFingerprint } from "./mercadoPagoPostgresScenarios.js";
import { diagnoseIntegrationError, integrationAssert, safeError } from "./mercadoPagoPostgresSupport.js";

export async function verifyProtectedRecords(client, baseline, report) {
  let matched = null;
  try {
    integrationAssert(typeof baseline === "string" && /^[a-f0-9]{64}$/.test(baseline),
      "The original run must have a saved protected-record fingerprint.", "protectedFingerprint", "protected_records");
    matched = await protectedFingerprint(client) === baseline;
    integrationAssert(matched, "Protected records differ from the saved pre-write baseline; stop integration writes.",
      "protectedFingerprint", "protected_records", { expected: true, actual: matched });
    report({ phase: "protected-records", status: "passed", protectedRecordsUnchanged: true });
  } catch (error) {
    report({ phase: "protected-records", status: "failed", protectedRecordsUnchanged: matched,
      error: safeError(diagnoseIntegrationError(error, "protected_records")) });
    throw error;
  }
}

// Solo SELECT en transacciones READ ONLY; no carga servicios ni llama a cleanupFixtures.
export async function verifySavedRun(client, manifest, expectedDatabaseId, report) {
  validateManifest(manifest, expectedDatabaseId);
  await verifyProtectedRecords(client, manifest.protectedFingerprint, report);
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const remaining = await ownedRows(client, manifest);
    const remainingFixtures = Object.values(remaining).reduce((count, rows) => count + rows.length, 0);
    integrationAssert(remainingFixtures === 0, "The saved run still has fixture rows; verification does not delete them.",
      "remainingFixtures", "verify_run", { expected: 0, actual: remainingFixtures });
    await client.query("COMMIT");
    return { phase: "verify-run", status: "passed", runId: manifest.runId,
      protectedRecordsUnchanged: true, remainingFixtures, writes: 0 };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

// Conserva el error original del escenario y verifica los protegidos aun si falla limpieza.
export async function finalizeIntegrationRun({ backend, client, manifest, seeded, protectedBefore }, report) {
  const errors = [];
  let closed = true;
  try { await backend?.close(); }
  catch (error) {
    closed = false;
    errors.push(diagnoseIntegrationError(error, "cleanup"));
  }
  if (seeded && closed) {
    try {
      const result = await cleanupFixtures(client, manifest);
      report({ phase: "cleanup", status: "passed", runId: manifest.runId, ...result, remainingFixtures: 0 });
    } catch (error) {
      errors.push(diagnoseIntegrationError(error, "cleanup"));
      report({ phase: "cleanup", status: "failed", runId: manifest.runId,
        remainingFixtures: null, error: safeError(errors.at(-1)) });
    }
  } else if (seeded) {
    report({ phase: "cleanup", status: "blocked", remainingFixtures: null,
      reason: "Backend connections did not close; scoped deletion was not attempted." });
  }
  if (protectedBefore) {
    try { await verifyProtectedRecords(client, protectedBefore, report); }
    catch (error) { errors.push(error); }
  }
  return errors;
}
