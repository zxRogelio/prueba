import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Starts a fresh cluster; never reads .env or any application database URL.
// Requires existing PostgreSQL binaries, no new runtime dependency/download.
const bin = process.env.ARCO_TEST_POSTGRES_BIN;
if (!bin || !path.isAbsolute(bin)) throw new Error("Set ARCO_TEST_POSTGRES_BIN to an absolute PostgreSQL bin directory.");
const executable = (name) => path.join(bin, `${name}${process.platform === "win32" ? ".exe" : ""}`);
await access(executable("initdb")); await access(executable("pg_ctl"));
const run = promisify(execFile);
const directory = await mkdtemp(path.join(os.tmpdir(), "titanium-arco-test-"));
const data = path.join(directory, "data");
const socket = net.createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const options = { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 };
let started = false;
try {
  await run(executable("initdb"), ["-D", data, "-U", "arco_test", "-A", "trust", "--encoding=UTF8", "--locale=C"], options);
  // Listen only on literal loopback. Logs contain synthetic local test data.
  await run(executable("pg_ctl"), ["-D", data, "-l", path.join(directory, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"], options);
  started = true;
  const admin = new pg.Client({ host: "127.0.0.1", port, user: "arco_test", database: "postgres", ssl: false });
  await admin.connect();
  try { await admin.query('CREATE DATABASE "titanium_arco_test"'); } finally { await admin.end(); }
  const result = await run(process.execPath, ["--experimental-vm-modules", "--test", "--test-isolation=none", "tests/integration/privacyPostgres.test.js"], {
    ...options, timeout: 60000, cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, ARCO_TEST_ALLOW_LOCAL_DDL: "true", ARCO_TEST_DATABASE_URL: `postgres://arco_test@127.0.0.1:${port}/titanium_arco_test` },
  });
  process.stdout.write(result.stdout); process.stderr.write(result.stderr);
} catch (error) {
  process.stdout.write(error.stdout || ""); process.stderr.write(error.stderr || ""); process.exitCode = 1;
  console.error("Local ARCO PostgreSQL verification failed.");
} finally {
  if (started) await run(executable("pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"], options);
  console.log(`Disposable cluster stopped. Synthetic artifacts preserved at ${directory}`);
}
