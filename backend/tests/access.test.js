import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { accessFixture } from "./helpers/accessFixture.js";
import { validateAccessPostgresTarget } from "./helpers/accessPostgresTarget.js";

const rejectsCode = (callback, code) => assert.rejects(callback, (error) => error.code === code);

test("verificador PostgreSQL rechaza destinos remotos, producción y DDL implícito", () => {
  const valid = "postgres://test@127.0.0.1:55473/titanium_access_test";
  assert.equal(validateAccessPostgresTarget(valid, "true").hostname, "127.0.0.1");
  for (const value of [undefined, "postgres://test@neon.example/titanium_access_test", "postgres://test@localhost/titanium_access_test",
    "postgres://test@127.0.0.1/production", valid + "?sslmode=disable", valid + "#fragment"]) {
    assert.throws(() => validateAccessPostgresTarget(value, "true"));
  }
  assert.throws(() => validateAccessPostgresTarget(valid, undefined));
});

for (const source of ["online_checkout", "admin_manual", "group_package"]) {
  test(`QR individual con suscripción activa de origen ${source}; persiste solo SHA-256`, async () => {
    const f = await accessFixture();
    const subscription = await f.subscription({ source, ...(source === "group_package" ? { groupId: randomUUID() } : {}) });
    const result = await f.service.generateAccessQr({ userId: f.client.id });
    assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
    const row = f.tables.AccessQrToken[0];
    assert.equal(row.tokenHash, createHash("sha256").update(result.token).digest("hex"));
    assert.equal(row.expiresAt - row.createdAt, 60000);
    assert.equal(row.subscriptionId, subscription.id);
    assert.equal(JSON.stringify(row).includes(result.token), false);
    assert.deepEqual(Object.keys(result.subscription).sort(), ["endsAt", "status"]);
    const second = await f.service.generateAccessQr({ userId: f.client.id });
    assert.notEqual(second.token, result.token);
  });
}

for (const condition of ["missing", "expired", "cancelled", "pending", "future", "cancelledAt"]) {
  test(`generación rechazada con membresía ${condition}`, async () => {
    const f = await accessFixture();
    if (condition !== "missing") await f.subscription({
      ...(condition === "expired" ? { endsAt: "2000-01-01" } : {}),
      ...(["cancelled", "pending"].includes(condition) ? { status: condition } : {}),
      ...(condition === "future" ? { startsAt: "2099-01-01" } : {}),
      ...(condition === "cancelledAt" ? { cancelledAt: new Date() } : {}),
    });
    await rejectsCode(() => f.service.generateAccessQr({ userId: f.client.id }), "MEMBERSHIP_REQUIRED");
    assert.equal(f.tables.AccessQrToken.length, 0);
  });
}

test("inicio y fin inclusivos; una renovación futura no sustituye la vigente", async () => {
  const f = await accessFixture();
  const today = new Date().toISOString().slice(0, 10);
  const current = await f.subscription({ startsAt: today, endsAt: today });
  await f.subscription({ startsAt: "2099-01-01", endsAt: "2099-02-01" });
  const qr = await f.service.generateAccessQr({ userId: f.client.id });
  const result = await f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id });
  assert.equal(result.accessGranted, true);
  assert.equal(f.tables.GymAccessLog[0].subscriptionId, current.id);
});

test("cada integrante aprobado usa un token vinculado a su propia cuenta", async () => {
  const f = await accessFixture();
  const groupId = randomUUID();
  await f.subscription({ groupId, source: "group_package" });
  await f.subscription({ userId: f.other.id, groupId, source: "group_package" });
  const first = await f.service.generateAccessQr({ userId: f.client.id });
  const second = await f.service.generateAccessQr({ userId: f.other.id });
  assert.notEqual(first.token, second.token);
  for (const token of [first.token, second.token]) await f.service.scanAccessQr({ token, scannedBy: f.admin.id });
  assert.deepEqual(f.tables.GymAccessLog.map((row) => row.userId).sort(), [f.client.id, f.other.id].sort());
});

test("token expirado justo a los 60 segundos no registra entrada", async () => {
  const f = await accessFixture(); await f.subscription();
  const qr = await f.service.generateAccessQr({ userId: f.client.id });
  f.advance(60000);
  await rejectsCode(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id }), "QR_EXPIRED");
  assert.equal(f.tables.GymAccessLog.length, 0);
  assert.equal(f.tables.AccessQrToken[0].usedAt, null);
});

test("tokens inexistentes, tipos inesperados y JWT no autorizan ni filtran datos", async () => {
  const f = await accessFixture();
  for (const token of [undefined, null, 15, {}, [], "", "jwt.session.value", "x".repeat(100000), randomBytes(32).toString("base64url")]) {
    await rejectsCode(() => f.service.scanAccessQr({ token, scannedBy: f.admin.id }), "QR_INVALID");
  }
  assert.equal(f.tables.GymAccessLog.length, 0);
});

test("escaneo correcto registra administrador, consume una vez y rechaza reuso", async () => {
  const f = await accessFixture(); await f.subscription();
  const qr = await f.service.generateAccessQr({ userId: f.client.id });
  const result = await f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id });
  assert.equal(result.accessGranted, true);
  assert.equal(result.access.userId, f.client.id);
  assert.equal(f.tables.GymAccessLog[0].scannedBy, f.admin.id);
  assert.equal(f.tables.AccessQrToken[0].usedAt, result.access.scannedAt);
  await rejectsCode(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id }), "QR_ALREADY_USED");
  assert.equal(f.tables.GymAccessLog.length, 1);
});

test("dos escaneos concurrentes con bloqueo por fila conceden una sola entrada", async () => {
  const f = await accessFixture(); await f.subscription();
  const qr = await f.service.generateAccessQr({ userId: f.client.id });
  const outcomes = await Promise.allSettled([1, 2].map(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id })));
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((o) => o.status === "rejected").reason.code, "QR_ALREADY_USED");
  assert.equal(f.tables.GymAccessLog.length, 1);
  assert.equal(f.lockEvents.filter((key) => key.startsWith("AccessQrToken:")).length, 2);
});

for (const condition of ["cancelled", "expired", "pending", "future", "cancelledAt"]) {
  test(`membresía cambia a ${condition} después de emitir el QR: acceso denegado`, async () => {
    const f = await accessFixture(); const sub = await f.subscription();
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    await sub.update({
      ...(["cancelled", "pending"].includes(condition) ? { status: condition } : {}),
      ...(condition === "expired" ? { endsAt: "2000-01-01" } : {}),
      ...(condition === "future" ? { startsAt: "2099-01-01" } : {}),
      ...(condition === "cancelledAt" ? { cancelledAt: new Date() } : {}),
    });
    await rejectsCode(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id }), "MEMBERSHIP_REQUIRED");
    assert.equal(f.tables.GymAccessLog.length, 0);
    assert.equal(f.tables.AccessQrToken[0].usedAt, null);
  });
}

test("cuenta que deja de ser cliente y autoescaneo se rechazan", async () => {
  const f = await accessFixture(); await f.subscription();
  const qr = await f.service.generateAccessQr({ userId: f.client.id });
  await rejectsCode(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.client.id }), "SELF_SCAN_FORBIDDEN");
  await f.client.update({ role: "administrador" });
  await rejectsCode(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id }), "QR_OWNER_INVALID");
  assert.equal(f.tables.GymAccessLog.length, 0);
});

for (const failure of ["GymAccessLog.create", "AccessQrToken.update"]) {
  test(`fallo ${failure} revierte token y entrada; permite reintentar`, async () => {
    const f = await accessFixture(); await f.subscription();
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    f.failNext.add(failure);
    await assert.rejects(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id }));
    assert.equal(f.tables.GymAccessLog.length, 0);
    assert.equal(f.tables.AccessQrToken[0].usedAt, null);
    assert.equal((await f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id })).accessGranted, true);
  });
}

test("historial propio ignora userId externo, pagina y excluye secretos", async () => {
  const f = await accessFixture();
  for (const userId of [f.client.id, f.client.id, f.other.id]) {
    await f.models.GymAccessLog.create({ userId, subscriptionId: randomUUID(), scannedBy: f.admin.id, scannedAt: new Date(),
      result: "granted", token: "secret", tokenHash: "secret-hash", qrTokenId: randomUUID() });
  }
  const result = await f.service.listAccessHistory({ userId: f.client.id, query: { userId: f.other.id, page: "2", limit: "1" } });
  assert.equal(result.pagination.total, 2);
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].userId, f.client.id);
  for (const key of ["token", "tokenHash", "qrTokenId"]) assert.equal(key in result.history[0], false);
});

test("filtros de fecha son UTC inclusivos; rechaza fechas/paginación inválidas", async () => {
  const f = await accessFixture();
  for (const time of ["2026-11-02T23:59:59.999Z", "2026-11-03T00:00:00.000Z", "2026-11-03T23:59:59.999Z", "2026-11-04T00:00:00.000Z"]) {
    await f.models.GymAccessLog.create({ userId: f.client.id, scannedAt: new Date(time) });
  }
  const result = await f.service.listAccessHistory({ query: { from: "2026-11-03", to: "2026-11-03" } });
  assert.equal(result.pagination.total, 2);
  for (const query of [{ page: "0" }, { limit: "101" }, { page: ["1"] }, { page: "1.5" }, { from: "2026-02-30" },
    { to: "bad" }, { from: {} }, { from: "2026-11-04", to: "2026-11-03" }]) {
    await rejectsCode(() => f.service.listAccessHistory({ query }), "INVALID_HISTORY_FILTER");
  }
});

test("HTTP: JWT, roles y sesión vigente protegen los cuatro endpoints", async (t) => {
  const f = await accessFixture(); const request = await f.http(t);
  const endpoints = [["/qr", "POST"], ["/scan", "POST"], ["/me/history", "GET"], ["/admin/history", "GET"]];
  for (const [path, method] of endpoints) {
    assert.equal((await request(path, { user: null, method })).status, 401);
    assert.equal((await request(path, { user: f.trainer, method })).status, 403);
  }
  assert.equal((await request("/scan", { method: "POST", body: { token: "fake" } })).status, 403);
  assert.equal((await request("/admin/history")).status, 403);
  assert.equal((await request("/qr", { user: f.admin, method: "POST" })).status, 403);
  assert.equal((await request("/qr", { method: "POST", authorization: "Bearer invalid" })).status, 401);
  f.tables.Session.find((s) => s.userId === f.client.id).revoked = true;
  assert.equal((await request("/qr", { method: "POST" })).status, 401);
  f.tables.Session.find((s) => s.userId === f.client.id).revoked = false;
  f.tables.Session.find((s) => s.userId === f.client.id).expiresAt = new Date(0);
  assert.equal((await request("/qr", { method: "POST" })).status, 401);
});

test("HTTP: genera solo para el autenticado, administrador escanea y el historial es privado", async (t) => {
  const f = await accessFixture(); await f.subscription(); const request = await f.http(t);
  const qr = await request("/qr", { method: "POST", body: { userId: f.other.id, subscription: { status: "active" } } });
  assert.equal(qr.status, 201);
  assert.equal(qr.headers.get("cache-control"), "no-store");
  assert.equal(f.tables.AccessQrToken[0].userId, f.client.id);
  const scan = await request("/scan", { user: f.admin, method: "POST", body: { token: qr.body.token, scannedBy: f.client.id } });
  assert.equal(scan.status, 200); assert.equal(scan.body.accessGranted, true);
  assert.equal(f.tables.GymAccessLog[0].scannedBy, f.admin.id);
  const mine = await request(`/me/history?userId=${f.other.id}`);
  const other = await request(`/me/history?userId=${f.client.id}`, { user: f.other });
  const admin = await request("/admin/history?from=2000-01-01&limit=1", { user: f.admin });
  assert.equal(mine.body.history.length, 1); assert.equal(other.body.history.length, 0);
  assert.equal(admin.body.pagination.total, 1);
  assert.equal(JSON.stringify([mine.body, other.body, admin.body]).includes(qr.body.token), false);
  assert.equal(JSON.stringify(admin.body).includes("tokenHash"), false);
});

test("HTTP: membresía ausente responde 403 sin crear tokens", async (t) => {
  const f = await accessFixture(); const request = await f.http(t);
  const result = await request("/qr", { method: "POST", body: { status: "active", endsAt: "2099-01-01" } });
  assert.equal(result.status, 403); assert.equal(result.body.code, "MEMBERSHIP_REQUIRED");
  assert.equal(f.tables.AccessQrToken.length, 0);
});

test("HTTP: errores de escaneo mantienen códigos y estados estables", async (t) => {
  const f = await accessFixture(); const sub = await f.subscription(); const request = await f.http(t);
  const scan = (token) => request("/scan", { user: f.admin, method: "POST", body: { token } });
  const invalid = await scan("invalid");
  assert.equal(invalid.status, 400); assert.equal(invalid.body.code, "QR_INVALID");
  const used = await f.service.generateAccessQr({ userId: f.client.id });
  assert.equal((await scan(used.token)).status, 200);
  const reused = await scan(used.token);
  assert.equal(reused.status, 409); assert.equal(reused.body.code, "QR_ALREADY_USED");
  const expired = await f.service.generateAccessQr({ userId: f.client.id });
  f.advance(60000);
  const timedOut = await scan(expired.token);
  assert.equal(timedOut.status, 410); assert.equal(timedOut.body.code, "QR_EXPIRED");
  const cancelled = await f.service.generateAccessQr({ userId: f.client.id });
  await sub.update({ status: "cancelled" });
  const denied = await scan(cancelled.token);
  assert.equal(denied.status, 403); assert.equal(denied.body.code, "MEMBERSHIP_REQUIRED");
  for (const result of [invalid, reused, timedOut, denied]) assert.equal(result.body.accessGranted, false);
});

test("HTTP: límite de generación por usuario devuelve 429 y Retry-After", async (t) => {
  const f = await accessFixture(); await f.subscription(); const request = await f.http(t);
  for (let i = 0; i < 6; i++) assert.equal((await request("/qr", { method: "POST" })).status, 201);
  const blocked = await request("/qr", { method: "POST" });
  assert.equal(blocked.status, 429); assert.equal(blocked.body.code, "ACCESS_RATE_LIMITED");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal(f.tables.AccessQrToken.length, 6);
  assert.equal((await request("/qr", { method: "POST", user: f.other })).status, 403);
});

test("HTTP: límite de escaneo y límite IP antes de autenticación", async (t) => {
  const f = await accessFixture(); const request = await f.http(t);
  for (let i = 0; i < 120; i++) assert.equal((await request("/scan", { user: f.admin, method: "POST", body: { token: "invalid" } })).status, 400);
  const blocked = await request("/scan", { user: f.admin, method: "POST" });
  assert.equal(blocked.status, 429);
  for (let i = 121; i < 180; i++) assert.equal((await request("/me/history", { user: null })).status, 401);
  assert.equal((await request("/qr", { method: "POST", user: null })).status, 429);
});

test("HTTP: caída de DB nunca concede acceso ni filtra consultas, tokens o credenciales", async (t) => {
  const f = await accessFixture(); await f.subscription(); const request = await f.http(t);
  const qr = await request("/qr", { method: "POST" });
  for (const [failure, path, method, body] of [
    ["transaction", "/qr", "POST"],
    ["GymAccessLog.create", "/scan", "POST", { token: qr.body.token }],
    ["AccessQrToken.update", "/scan", "POST", { token: qr.body.token }],
    ["GymAccessLog.find", "/admin/history", "GET"],
    ["Session.find", "/admin/history", "GET"],
  ]) {
    f.failNext.add(failure);
    const result = await request(path, { user: path === "/qr" ? f.client : f.admin, method, body });
    assert.equal(result.status, 503); assert.equal(result.body.accessGranted, false);
    assert.equal(result.body.code, "ACCESS_SERVICE_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(result.body), /sensitive|postgres:|SQL|secret/);
    assert.equal(f.tables.GymAccessLog.length, 0);
    assert.equal(f.tables.AccessQrToken[0].usedAt, null);
  }
  f.failNext.add("User.find");
  assert.equal((await request("/scan", { user: f.admin, method: "POST", body: { token: qr.body.token } })).status, 401);
  assert.equal(f.tables.GymAccessLog.length, 0);
  assert.equal(f.logs.length, 0);
});
