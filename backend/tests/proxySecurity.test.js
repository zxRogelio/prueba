import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import { getClientIp } from "../utils/clientIp.js";
import { forceHTTPS } from "../middleware/forceHTTPS.js";

// Usa los getters reales de Express, sin iniciar servidor ni importar index.js.
const proxySetting = readFileSync(new URL("../index.js", import.meta.url), "utf8")
  .match(/app\.set\("trust proxy",[^;]+;/)?.[0];
assert.ok(proxySetting, "Express must configure trust proxy explicitly.");
function request({ render, headers = {}, encrypted = false, address = "192.0.2.10", path = "/api/auth/login" } = {}) {
  const app = express();
  vm.runInNewContext(proxySetting, { app, process: { env: { RENDER: render } } });
  const req = Object.create(app.request);
  Object.assign(req, { app, headers, socket: { remoteAddress: address, encrypted }, url: path, originalUrl: path });
  req.connection = req.socket;
  return req;
}
function httpsResult(req, environment = "production", publicUrl = "https://api.example.test") {
  const saved = { NODE_ENV: process.env.NODE_ENV, BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL };
  const result = { next: false };
  const res = {
    status(code) { result.status = code; return this; },
    send(body) { result.body = body; return this; },
    redirect(code, url) { result.status = code; result.url = url; return this; },
  };
  try {
    process.env.NODE_ENV = environment;
    if (publicUrl === null) delete process.env.BACKEND_PUBLIC_URL;
    else process.env.BACKEND_PUBLIC_URL = publicUrl;
    forceHTTPS(req, res, () => { result.next = true; });
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  return result;
}

for (const render of [undefined, "false", "TRUE"]) {
  test(`untrusted forwarded headers cannot change IP or HTTPS: RENDER=${render}`, () => {
    const req = request({ render, headers: { "x-forwarded-for": "203.0.113.99", "x-real-ip": "203.0.113.98",
      "cf-connecting-ip": "203.0.113.97", "x-forwarded-proto": "https", host: "attacker.example", "x-forwarded-host": "attacker.example" } });
    assert.equal(req.app.get("trust proxy"), false);
    assert.equal(getClientIp(req), "192.0.2.10");
    assert.equal(req.secure, false);
    assert.deepEqual(httpsResult(req), { next: false, status: 307, url: "https://api.example.test/api/auth/login" });
  });
}
test("Render trusts the nearest forwarded IP and ignores a forged leftmost entry", () => {
  const req = request({ render: "true", headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.42", "x-forwarded-proto": "https" } });
  assert.equal(req.app.get("trust proxy"), 1);
  assert.equal(getClientIp(req), "198.51.100.42");
  assert.equal(req.secure, true);
  assert.deepEqual(httpsResult(req), { next: true });
});
test("alternative IP headers are ignored even behind the authorized proxy", () => {
  const req = request({ render: "true", headers: { "x-real-ip": "203.0.113.98", "cf-connecting-ip": "203.0.113.97" } });
  assert.equal(getClientIp(req), "192.0.2.10");
});
test("local development keeps loopback and HTTP regardless of supplied headers", () => {
  const req = request({ address: "::1", headers: { "x-forwarded-for": "203.0.113.99" } });
  assert.equal(getClientIp(req), "127.0.0.1 (localhost)");
  assert.deepEqual(httpsResult(req, "development"), { next: true });
});
test("non-Express callers fall back to socket IP without inspecting headers", () => {
  assert.equal(getClientIp({ headers: { "x-forwarded-for": "203.0.113.99" }, socket: { remoteAddress: "::ffff:127.0.0.1" } }), "127.0.0.1 (localhost)");
  assert.equal(getClientIp({ headers: { "x-forwarded-for": "203.0.113.99" } }), null);
});
test("direct TLS works without trusting proxies or x-forwarded-proto", () => {
  const req = request({ encrypted: true, headers: { "x-forwarded-proto": "http" } });
  assert.equal(req.secure, true);
  assert.deepEqual(httpsResult(req), { next: true });
});
for (const path of ["/api/auth/login?next=%2F", "/api/checkout/mercadopago/webhook?data.id=123", "//attacker.example/path"]) {
  test(`HTTPS redirect keeps the configured origin and original path: ${path}`, () => {
    const result = httpsResult(request({ render: "true", path, headers: { host: "attacker.example", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http" } }));
    assert.equal(result.status, 307);
    assert.equal(result.url, "https://api.example.test" + path);
    assert.equal(new URL(result.url).origin, "https://api.example.test");
  });
}
for (const publicUrl of [null, "", "invalid", "http://api.example.test", "https://fictional:dummy@api.example.test"]) {
  test(`invalid HTTPS destination fails closed: ${publicUrl}`, () => {
    const result = httpsResult(request({ headers: { host: "attacker.example" } }), "production", publicUrl);
    assert.equal(result.status, 400);
    assert.equal(result.next, false);
    assert.equal(result.url, undefined);
  });
}
test("redirect rejects invalid paths and header injection", () => {
  for (const path of ["https://attacker.example", "/path\r\nLocation: https://attacker.example"]) {
    assert.equal(httpsResult(request({ path })).status, 400);
  }
});
