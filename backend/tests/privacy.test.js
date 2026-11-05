import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { privacyFixture } from "./helpers/privacyFixture.js";

const consent = { noticeId: "privacy-notice", version: "test-v1", accepted: true };
const rejectsCode = (run, code) => assert.rejects(run, (error) => error.code === code);
const plain = (value) => JSON.parse(JSON.stringify(value));
const cancellationBody = (token) => ({ confirmation: "SOLICITAR CANCELACIÓN", reauthenticationToken: token });
async function proof(f, user = f.client) {
  const session = await f.sessionFor(user);
  return (await f.cancellation.reauthenticate(user.id, session.id,
    { purpose: "account-cancellation", method: "password", password: f.password })).body.reauthenticationToken;
}

test("consentimiento: histórico vacío, evidencia del servidor y repetición idempotente", async () => {
  const f = await privacyFixture();
  assert.deepEqual(plain(await f.service.listConsents(f.client.id)), { consents: [] });
  const receipt = await f.service.acceptConsent(f.client.id, consent);
  assert.equal(receipt.contentSha256, f.env.PRIVACY_NOTICE_SHA256);
  assert.equal(new Date(receipt.acceptedAt).getTime(), f.now());
  assert.equal(receipt.revokedAt, null);
  assert.equal((await f.service.acceptConsent(f.client.id, consent)).receiptId, receipt.receiptId);
  assert.equal(f.tables.PrivacyConsent.length, 1);
  assert.equal((await f.service.listConsents(f.other.id)).consents.length, 0);
});

for (const [name, body, code] of [
  ["ausente", undefined, "CONSENT_REQUIRED"], ["negado", { ...consent, accepted: false }, "CONSENT_REQUIRED"],
  ["string true", { ...consent, accepted: "true" }, "CONSENT_REQUIRED"],
  ["versión antigua", { ...consent, version: "old" }, "NOTICE_VERSION_CHANGED"],
  ["fecha cliente", { ...consent, acceptedAt: "2020-01-01" }, "INVALID_INPUT"],
  ["otro usuario", { ...consent, userId: randomUUID() }, "INVALID_INPUT"],
]) test(`consentimiento rechaza ${name}`, async () => {
  const f = await privacyFixture();
  await rejectsCode(() => f.service.acceptConsent(f.client.id, body), code);
  assert.equal(f.tables.PrivacyConsent.length, 0);
});

test("aviso sin configuración aprobada no inventa versión ni comprobante", async (t) => {
  const f = await privacyFixture(); delete f.env.PRIVACY_NOTICE_SHA256;
  const request = await f.http(t);
  assert.equal((await request("/privacy/notice", { user: null })).status, 503);
  await rejectsCode(() => f.service.acceptConsent(f.client.id, consent), "PRIVACY_NOTICE_UNAVAILABLE");
});

test("registro: usuario y consentimiento atómicos; rechazo de privilegios y compatibilidad web", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  const register = (extra = {}) => request("/auth/register", { user: null, method: "POST",
    body: { email: `${randomUUID()}@example.invalid`, password: f.password, ...extra } });
  const legacy = await register({ role: "cliente" });
  assert.equal(legacy.status, 201); assert.equal(legacy.body.privacyConsent, undefined);
  assert.equal(f.tables.PrivacyConsent.length, 0);
  f.env.PRIVACY_REQUIRE_REGISTRATION_CONSENT = "true";
  assert.equal((await register()).body.code, "CONSENT_REQUIRED");
  assert.equal((await register({ privacyConsent: { ...consent, version: "old" } })).status, 409);
  const before = f.tables.User.length;
  f.failNext.add("PrivacyConsent.create");
  assert.equal((await register({ privacyConsent: consent })).status, 400);
  assert.equal(f.tables.User.length, before);
  const registered = await register({ privacyConsent: consent, client: "mobile" });
  assert.equal(registered.status, 201); assert.ok(registered.body.privacyConsent.receiptId);
  assert.equal(f.tables.PrivacyConsent.length, 1);
  assert.equal(f.deliveries.at(-1).name, "sendAccountVerificationOTP");
  assert.equal((await register({ privacyConsent: consent, role: "administrador" })).status, 422);
});

test("acceso HTTP reutiliza perfil, conserva claves antiguas y excluye secretos", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  await f.models.UserPersonalData.create({ userId: f.other.id, fullName: "Otra persona", phone: "5551234567" });
  const result = await request(`/user/profile?userId=${f.other.id}`);
  assert.equal(result.status, 200); assert.equal(result.body.id, f.client.id);
  for (const key of ["email", "rol", "authMethod", "provider", "loginMethod"]) assert.ok(key in result.body);
  assert.equal(result.body.fullName, null);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.headers.get("etag"), `"${result.body.version}"`);
  for (const key of ["password", "otp", "totpSecret", "providerId", "token", "accessToken"]) assert.equal(key in result.body, false);
  assert.equal(JSON.stringify(result.body).includes("Otra persona"), false);
});

for (const role of ["client", "admin", "trainer"]) test(`rectificación parcial para ${role}; validación y campos protegidos`, async (t) => {
  const f = await privacyFixture(); const user = f[role]; const request = await f.http(t);
  if (role === "trainer") await f.models.TrainerProfile.create({ trainerId: user.id, fullName: "Original", phone: "5551234567", specialty: "Fuerza", bio: "Biografía" });
  const current = await request("/user/profile", { user });
  const update = await request("/user/profile", { user, method: "PATCH", headers: { "If-Match": current.headers.get("etag") }, body: { fullName: "Nombre corregido" } });
  assert.equal(update.status, 200); assert.equal(update.body.fullName, "Nombre corregido");
  assert.equal(update.body.id, user.id);
  assert.equal((await request("/user/profile", { user, method: "PATCH", body: { phone: null } })).status, 428);
  for (const body of [{ role: "administrador" }, { id: f.other.id }, { userId: f.other.id }, { email: "new@example.invalid" },
    { fullName: {} }, { fullName: "x".repeat(161) }, { phone: "bad phone" }, { phone: "1".repeat(31) }, { fullName: "<script>" }, {}]) {
    assert.equal((await request("/user/profile", { user, method: "PATCH", headers: { "If-Match": update.headers.get("etag") }, body })).status, 422);
  }
  if (role === "trainer") {
    assert.equal(f.tables.TrainerProfile[0].specialty, "Fuerza");
    assert.equal(f.tables.TrainerProfile[0].phone, "5551234567");
    assert.equal(f.tables.UserPersonalData.length, 0);
    assert.equal((await request("/trainer/profile", { user })).body.profile.fullName, "Nombre corregido");
  }
  const cleared = await request("/user/profile", { user, method: "PATCH", headers: { "If-Match": update.headers.get("etag") }, body: { phone: null } });
  assert.equal(cleared.status, 200); assert.equal(cleared.body.phone, null);
});

test("rectificación concurrente: un guardado gana y el segundo recibe 412", async () => {
  const f = await privacyFixture();
  const current = await f.service.getPersonalProfile(f.client);
  const outcomes = await Promise.allSettled(["Uno", "Dos"].map((fullName) => f.service.rectifyProfile(f.client.id, { fullName }, `"${current.version}"`)));
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((o) => o.status === "rejected").reason.code, "PROFILE_VERSION_CHANGED");
});

test("PUT web del entrenador conserva contrato y cambia el ETag del PATCH", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  const current = await request("/user/profile", { user: f.trainer });
  const put = await request("/trainer/profile", { user: f.trainer, method: "PUT", body: { fullName: "Web", phone: "5551234567", specialty: "Fuerza", certifications: "Cert", experienceYears: 5, bio: "Bio", focus: "Salud" } });
  assert.equal(put.status, 200); assert.equal(put.body.profile.specialty, "Fuerza");
  assert.equal(put.body.profile.fullName, "Web");
  const stale = await request("/user/profile", { user: f.trainer, method: "PATCH", body: { fullName: "Móvil" }, headers: { "If-Match": current.headers.get("etag") } });
  assert.equal(stale.status, 412);
  assert.equal((await request("/trainer/profile", { user: f.client })).status, 403);
});

test("perfil deportivo web conserva GET/PUT y su historial; rechaza sesiones revocadas", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  await f.models.UserWeightHistory.create({ userId: f.other.id, weight: 99, recordDate: "2026-01-01" });
  const initial = await request("/profile/me");
  assert.equal(initial.status, 200); assert.equal(initial.body.ok, true); assert.equal(initial.body.profile, null);
  const saved = await request("/profile/me", { method: "PUT", body: { age: 30, height: 1.75, fitnessGoal: "maintain", userId: f.other.id } });
  assert.equal(saved.status, 200); assert.equal(saved.body.profile.userId, f.client.id);
  assert.equal((await request("/profile/me")).body.profile.age, 30);
  assert.equal((await request("/profile/me/weights")).body.records.length, 0);
  const session = await f.sessionFor(f.client); await session.update({ revoked: true });
  for (const [path, method] of [["/profile/me", "GET"], ["/profile/me", "PUT"], ["/profile/me/weights", "GET"], ["/profile/me/calories", "GET"]]) {
    assert.equal((await request(path, { method, body: method === "PUT" ? { age: 31 } : undefined })).status, 401);
  }
});

test("JSON malformado y cuerpos excesivos no devuelven ni registran fragmentos privados", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  for (const [rawBody, status] of [['{"password":"sensitive-fragment",bad}', 400], [JSON.stringify({ password: "sensitive-fragment".repeat(10000) }), 413]]) {
    const response = await request("/auth/reauthenticate", { method: "POST", rawBody });
    assert.equal(response.status, status); assert.equal(response.body.code, "INVALID_JSON");
    assert.equal(JSON.stringify([response.body, f.logs]).includes("sensitive-fragment"), false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("oposición: null inicial, cambios parciales, auditoría y sin permiso publicitario implícito", async () => {
  const f = await privacyFixture();
  const initial = await f.service.getPreferences(f.client.id);
  assert.equal(initial.version, 1); assert.ok(initial.preferences.every((p) => p.optOut === null && p.updatedAt === null));
  assert.equal(await f.service.maySendOptionalCommunication(f.client.id, "promotional_communications", { hasApprovedAuthorization: true }), false);
  const saved = await f.service.updatePreferences(f.client.id, { version: 1, preferences: [{ purpose: "promotional_communications", optOut: true }] });
  assert.equal(saved.version, 2); assert.equal(saved.preferences[0].optOut, true); assert.equal(saved.preferences[1].optOut, null);
  assert.equal(f.tables.PrivacyPreferenceEvent.length, 1);
  assert.equal(await f.service.maySendOptionalCommunication(f.client.id, "promotional_communications", { hasApprovedAuthorization: true }), false);
  await f.service.updatePreferences(f.client.id, { version: 2, preferences: [{ purpose: "promotional_communications", optOut: false }] });
  assert.equal(await f.service.maySendOptionalCommunication(f.client.id, "promotional_communications"), false);
  assert.equal(await f.service.maySendOptionalCommunication(f.client.id, "promotional_communications", { hasApprovedAuthorization: true }), true);
  assert.equal((await f.service.getPreferences(f.other.id)).version, 1);
});

for (const body of [
  { version: 1, preferences: [{ purpose: "unknown", optOut: true }] },
  { version: 1, preferences: [{ purpose: "promotional_communications", optOut: "false" }] },
  { version: 1, preferences: [{ purpose: "promotional_communications", optOut: null }] },
  { version: "1", preferences: [] }, { version: 1, preferences: [] },
  { version: 1, preferences: [{ purpose: "promotional_communications", optOut: true, userId: randomUUID() }] },
]) test(`preferencias rechazan entrada ${JSON.stringify(body)}`, async () => {
  const f = await privacyFixture(); await rejectsCode(() => f.service.updatePreferences(f.client.id, body), "INVALID_INPUT");
});

test("preferencias concurrentes y fallo de auditoría revierten la operación", async () => {
  const f = await privacyFixture();
  const patch = { version: 1, preferences: [{ purpose: "satisfaction_surveys", optOut: true }] };
  f.failNext.add("PrivacyPreferenceEvent.create");
  await assert.rejects(() => f.service.updatePreferences(f.client.id, patch));
  assert.equal(f.tables.PrivacyPreference.length, 0);
  const results = await Promise.allSettled([1, 2].map(() => f.service.updatePreferences(f.client.id, patch)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.code, "PREFERENCES_VERSION_CHANGED");
});

test("reautenticación: contraseña errónea, propósito inválido y Google no crean pruebas", async () => {
  const f = await privacyFixture(); const session = await f.sessionFor(f.client);
  await rejectsCode(() => f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: "wrong" }), "REAUTHENTICATION_FAILED");
  await rejectsCode(() => f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "payment", method: "password", password: f.password }), "INVALID_INPUT");
  await f.client.update({ provider: "google", password: null });
  await rejectsCode(() => f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "google" }), "REAUTHENTICATION_METHOD_UNAVAILABLE");
  assert.equal(f.tables.ReauthenticationProof.length, 0);
});

test("OTP fresco independiente del login: contraseña + reto, hash, cinco intentos y consumo único", async () => {
  const f = await privacyFixture(); await f.client.update({ authMethod: "otp", otp: "111111" });
  const session = await f.sessionFor(f.client);
  const challenge = await f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
  assert.equal(challenge.status, 202); assert.equal(challenge.body.reauthenticationToken, undefined);
  const code = f.deliveries.at(-1).code;
  assert.notEqual(code, "111111"); assert.equal(f.tables.ReauthenticationChallenge[0].codeHash.includes(code), false);
  await rejectsCode(() => f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: challenge.body.challengeId, code: "111111" }), "REAUTHENTICATION_REQUIRED");
  const result = await f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: challenge.body.challengeId, code });
  assert.ok(result.reauthenticationToken);
  assert.equal(f.tables.ReauthenticationProof[0].tokenHash.includes(result.reauthenticationToken), false);
  await rejectsCode(() => f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: challenge.body.challengeId, code }), "REAUTHENTICATION_REQUIRED");
  const next = await f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
  const nextCode = f.deliveries.at(-1).code;
  const wrong = nextCode === "000000" ? "999999" : "000000";
  for (let i = 0; i < 5; i++) await rejectsCode(() => f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: next.body.challengeId, code: wrong }), "REAUTHENTICATION_REQUIRED");
  await rejectsCode(() => f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: next.body.challengeId, code: nextCode }), "REAUTHENTICATION_REQUIRED");
  assert.equal(f.tables.ReauthenticationChallenge[1].attempts, 5);
});

test("TOTP exige contraseña y un intervalo posterior al inicio del reto", async () => {
  const f = await privacyFixture(); const secret = speakeasy.generateSecret().base32;
  await f.client.update({ authMethod: "totp", totpSecret: secret });
  const session = await f.sessionFor(f.client);
  const challenge = await f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
  const old = speakeasy.totp({ secret, encoding: "base32", time: Math.floor(f.now() / 1000) });
  await rejectsCode(() => f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: challenge.body.challengeId, code: old }), "REAUTHENTICATION_REQUIRED");
  f.advance(31000);
  const code = speakeasy.totp({ secret, encoding: "base32", time: Math.floor(f.now() / 1000) });
  assert.ok((await f.cancellation.verifyReauthentication(f.client.id, session.id, { challengeId: challenge.body.challengeId, code })).reauthenticationToken);
});

for (const condition of ["expired", "other-user", "other-session", "credentials-changed"]) {
  test(`reto OTP rechaza ${condition} sin emitir prueba`, async () => {
    const f = await privacyFixture(); await f.client.update({ authMethod: "otp" });
    const session = await f.sessionFor(f.client);
    const challenge = await f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
    const code = f.deliveries.at(-1).code;
    let userId = f.client.id, sessionId = session.id;
    if (condition === "expired") f.advance(300000);
    if (condition === "other-user") { userId = f.other.id; sessionId = (await f.sessionFor(f.other)).id; }
    if (condition === "other-session") sessionId = (await f.models.Session.create({ userId, token: "new-session", revoked: false, expiresAt: new Date(f.now() + 600000) })).id;
    if (condition === "credentials-changed") await f.client.update({ authMethod: "normal" });
    await rejectsCode(() => f.cancellation.verifyReauthentication(userId, sessionId, { challengeId: challenge.body.challengeId, code }), "REAUTHENTICATION_REQUIRED");
    assert.equal(f.tables.ReauthenticationProof.length, 0);
  });
}

test("fallo al enviar OTP invalida el reto; no modifica OTP de login ni emite prueba", async () => {
  const f = await privacyFixture(); await f.client.update({ authMethod: "confirm-link", otp: "111111", accessToken: "existing-login-token" });
  const session = await f.sessionFor(f.client); f.failNext.add("email");
  await rejectsCode(() => f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password }), "REAUTHENTICATION_DELIVERY_FAILED");
  assert.ok(f.tables.ReauthenticationChallenge[0].consumedAt);
  assert.equal(f.tables.ReauthenticationProof.length, 0);
  assert.equal(f.client.otp, "111111"); assert.equal(f.client.accessToken, "existing-login-token");
  assert.equal(JSON.stringify(f.logs).includes("private@example.invalid"), false);
});

test("máximo de tres retos recientes persiste en almacenamiento", async () => {
  const f = await privacyFixture(); await f.client.update({ authMethod: "otp" });
  const session = await f.sessionFor(f.client);
  const start = () => f.cancellation.reauthenticate(f.client.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
  for (let i = 0; i < 3; i++) await start();
  await rejectsCode(start, "REAUTHENTICATION_RATE_LIMITED");
  assert.equal(f.tables.ReauthenticationChallenge.length, 3);
});

test("cancelación HTTP: confirmación, folio propio, idempotencia y ninguna baja", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  const reauth = await request("/auth/reauthenticate", { method: "POST", body: { purpose: "account-cancellation", method: "password", password: f.password } });
  assert.equal(reauth.status, 200);
  const key = randomUUID(), token = reauth.body.reauthenticationToken;
  const send = (body = cancellationBody(token), idempotency = key) => request("/user/account-cancellation-requests", { method: "POST", body, headers: { "Idempotency-Key": idempotency } });
  assert.equal((await send({ ...cancellationBody(token), confirmation: "DELETE" })).status, 422);
  assert.equal((await send({ confirmation: "SOLICITAR CANCELACIÓN" })).status, 403);
  const created = await send(); assert.equal(created.status, 202); assert.equal(created.body.status, "pending_review");
  assert.equal(created.body.membershipImpact.requiresReview, true);
  assert.ok(created.body.retentionSummary.every((item) => item.policyStatus === "pending_approval" && item.retainUntil === null));
  const replay = await send(); assert.equal(replay.body.requestId, created.body.requestId);
  assert.equal((await send(cancellationBody("a".repeat(43)))).body.code, "IDEMPOTENCY_CONFLICT");
  assert.equal((await send(cancellationBody(token), randomUUID())).status, 403);
  assert.equal((await request(`/user/account-cancellation-requests/${created.body.requestId}`, { user: f.other })).status, 404);
  assert.equal((await request(`/user/account-cancellation-requests/${created.body.requestId}`)).body.requestId, created.body.requestId);
  assert.equal(f.tables.User.length, 4); assert.equal((await f.sessionFor(f.client)).revoked, false);
  assert.equal(f.tables.AccountCancellationRequest.length, 1);
});

for (const invalidation of ["expired", "other-user", "other-session", "password-changed", "revoked-session"]) {
  test(`prueba de cancelación rechaza ${invalidation}`, async () => {
    const f = await privacyFixture(); const token = await proof(f);
    let user = f.client, session = await f.sessionFor(user);
    if (invalidation === "expired") f.advance(300000);
    if (invalidation === "other-user") { user = f.other; session = await f.sessionFor(user); }
    if (invalidation === "other-session") session = await f.models.Session.create({ userId: user.id, revoked: false, token: "another", expiresAt: new Date(f.now() + 600000) });
    if (invalidation === "password-changed") await user.update({ password: "changed-hash" });
    if (invalidation === "revoked-session") await session.update({ revoked: true });
    await rejectsCode(() => f.cancellation.requestCancellation(user.id, session.id, cancellationBody(token), randomUUID()), invalidation === "revoked-session" ? "UNAUTHORIZED" : "REAUTHENTICATION_REQUIRED");
    assert.equal(f.tables.AccountCancellationRequest.length, 0);
  });
}

test("cancelación concurrente y fallo al consumir prueba: atomicidad y un solo folio", async () => {
  const f = await privacyFixture(); const token = await proof(f), session = await f.sessionFor(f.client), key = randomUUID();
  const send = () => f.cancellation.requestCancellation(f.client.id, session.id, cancellationBody(token), key);
  f.failNext.add("ReauthenticationProof.update"); await assert.rejects(send);
  assert.equal(f.tables.AccountCancellationRequest.length, 0); assert.equal(f.tables.ReauthenticationProof[0].consumedAt, null);
  const results = await Promise.all([send(), send()]);
  assert.equal(results[0].requestId, results[1].requestId); assert.equal(f.tables.AccountCancellationRequest.length, 1);
  const another = await proof(f);
  await rejectsCode(() => f.cancellation.requestCancellation(f.client.id, session.id, cancellationBody(another), randomUUID()), "CANCELLATION_ALREADY_PENDING");
});

test("todas las rutas privadas exigen JWT y sesión vinculada vigente", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  const endpoints = [["/user/profile", "GET"], ["/user/profile", "PATCH"], ["/user/privacy-consents", "GET"], ["/user/privacy-consents", "POST"],
    ["/user/privacy-preferences", "GET"], ["/user/privacy-preferences", "PATCH"], ["/user/account-cancellation-requests", "POST"],
    [`/user/account-cancellation-requests/${randomUUID()}`, "GET"], ["/auth/reauthenticate", "POST"], ["/auth/reauthenticate/verify", "POST"]];
  for (const [path, method] of endpoints) {
    assert.equal((await request(path, { user: null, method })).status, 401);
    assert.equal((await request(path, { method, headers: { Authorization: "Bearer invalid" } })).status, 401);
  }
  const session = await f.sessionFor(f.client);
  for (const changes of [{ revoked: true }, { revoked: false, expiresAt: new Date(0) }, { expiresAt: new Date(f.now() + 60000), userId: f.other.id }]) {
    await session.update(changes);
    assert.equal((await request("/user/profile")).status, 401);
  }
  await session.update({ userId: f.client.id });
  f.blacklist.add(f.sessionTokens.get(f.client.id));
  assert.equal((await request("/user/profile")).status, 401);
  f.blacklist.clear();
  const orphan = jwt.sign({ id: f.client.id, nonce: "no-session" }, f.env.JWT_SECRET, { expiresIn: "1h" });
  assert.equal((await request("/user/profile", { headers: { Authorization: `Bearer ${orphan}` } })).status, 401);
});

test("HTTP preferencias y consentimientos se persisten solo en el usuario autenticado", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  assert.equal((await request("/user/privacy-consents", { method: "POST", body: consent })).status, 201);
  assert.equal((await request("/user/privacy-consents")).body.consents.length, 1);
  assert.equal((await request("/user/privacy-consents", { user: f.other })).body.consents.length, 0);
  const result = await request("/user/privacy-preferences", { method: "PATCH", body: { version: 1, preferences: [{ purpose: "satisfaction_surveys", optOut: true }] } });
  assert.equal(result.status, 200); assert.equal(result.body.version, 2);
  assert.equal((await request("/user/privacy-preferences", { user: f.other })).body.version, 1);
});

test("reautenticación HTTP limita intentos por usuario; errores no filtran datos a respuesta ni logs", async (t) => {
  const f = await privacyFixture(); const request = await f.http(t);
  f.failNext.add("UserPersonalData.find");
  const failure = await request("/user/profile");
  assert.equal(failure.status, 503);
  assert.equal(JSON.stringify([failure.body, f.logs]).includes("private@example.invalid"), false);
  for (let i = 0; i < 10; i++) {
    const failed = await request("/auth/reauthenticate", { method: "POST", body: { purpose: "account-cancellation", method: "password", password: "wrong" } });
    assert.equal(failed.status, 403);
  }
  assert.equal((await request("/auth/reauthenticate", { method: "POST", body: { purpose: "account-cancellation", method: "password", password: f.password } })).status, 429);
  assert.equal(JSON.stringify(f.logs).includes(f.password), false);
});
