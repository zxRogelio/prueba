import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

export async function readLocalWebhookSecret(runId) {
  assert.match(runId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  assert.equal(process.platform, "win32", "Local secret input uses Windows user-scoped DPAPI.");
  const path = fileURLToPath(new URL("../../storage/test-reports/remote-test-secrets/" + runId + ".dpapi", import.meta.url));
  await access(path);
  const command = `$ErrorActionPreference='Stop';
    $taskSecure=ConvertTo-SecureString -String ([System.IO.File]::ReadAllText($env:TITANIUM_WEBHOOK_KEY_FILE));
    $taskPointer=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure);
    try { [Console]::Out.Write([System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer); $taskSecure.Dispose() }`;
  // Plaintext goes only through a private child-process pipe into memory.
  // Neither command-line arguments, reports nor console contain the secret.
  const { stdout } = await promisify(execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    env: { ...process.env, TITANIUM_WEBHOOK_KEY_FILE: path }, windowsHide: true, timeout: 10000, maxBuffer: 16384,
  });
  const secret = stdout.trim();
  assert.ok(secret.length >= 16 && !/[\r\n]/.test(secret), "Invalid locally encrypted signing key.");
  return secret;
}
