import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("patched pgdump archive dependency still extracts its native binary layout", async () => {
  const root = await mkdtemp(join(tmpdir(), "titanium-pgdump-"));
  const parent = resolve(tmpdir()) + sep;
  assert.ok(resolve(root).startsWith(parent));
  try {
    const localRequire = createRequire(import.meta.url);
    const wrapperRequire = createRequire(localRequire.resolve("@louisbm/pgdump"));
    const AdmZip = wrapperRequire("adm-zip");
    assert.match(wrapperRequire("adm-zip/package.json").version, /^0\.6\./);
    const { handleUnzipFolder } = await import("../node_modules/@louisbm/pgdump/dist/utils.js");
    const destination = join(root, "output");
    const archive = join(root, process.platform === "win32" ? "binary.zip" : "binary.tar.gz");
    if (process.platform === "win32") {
      const zip = new AdmZip();
      zip.addFile("windows-latest-x64/pg_dump.exe", Buffer.from("synthetic-binary-fixture"));
      zip.writeZip(archive);
    } else {
      const { writeFile } = await import("node:fs/promises");
      await mkdir(join(root, "windows-latest-x64"));
      await writeFile(join(root, "windows-latest-x64/pg_dump.exe"), "synthetic-binary-fixture");
      await promisify(execFile)("tar", ["-czf", archive, "-C", root, "windows-latest-x64"]);
    }
    await handleUnzipFolder(archive, destination);
    assert.equal(await readFile(join(destination, "windows-latest-x64/pg_dump.exe"), "utf8"), "synthetic-binary-fixture");
    await assert.rejects(access(archive));
  } finally { await rm(root, { recursive: true, force: true }); }
});
