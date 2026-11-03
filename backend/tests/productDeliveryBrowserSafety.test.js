import test from "node:test";
import assert from "node:assert/strict";
import { main as browser } from "../scripts/verifyProductDeliveryBrowser.js";
import { main as seller } from "../scripts/preflightMercadoPagoTestAccount.js";

test("browser verifier defaults to a plan without reading credentials or connecting", async () => {
  const result = await browser([]);
  assert.equal(result.status, "prepared-not-executed");
  assert.match(result.provider, /simulation/);
});

test("browser verifier refuses implicit targets and arbitrary branch authorization", async () => {
  for (const args of [["--run"], ["--run", "--use-authorized-env"], ["--run", "--confirm-branch", "production"]]) {
    await assert.rejects(() => browser(args), { code: "ERR_ASSERTION" });
  }
});

test("remote seller preflight needs explicit flags and defaults to no API operation", async () => {
  assert.equal((await seller([])).status, "not-executed");
  await assert.rejects(() => seller(["--run"]), { code: "ERR_ASSERTION" });
});
