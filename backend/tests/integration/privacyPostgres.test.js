import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { DataTypes, Sequelize } from "sequelize";
import { privacyFixture } from "../helpers/privacyFixture.js";
import { validatePrivacyPostgresTarget } from "../helpers/privacyPostgresTarget.js";
import { up, down } from "../../migrations/20261104000100-create-arco-privacy.js";
import { up as upReview, down as downReview } from "../../migrations/20261108000100-account-cancellation-review.js";

test("ARCO: PostgreSQL local real, migración, HTTP, concurrencia y conservación", {
  skip: !process.env.ARCO_TEST_DATABASE_URL, timeout: 30000,
}, async (t) => {
  const target = process.env.ARCO_TEST_DATABASE_URL;
  validatePrivacyPostgresTarget(target, process.env.ARCO_TEST_ALLOW_LOCAL_DDL);
  const db = new Sequelize(target, { dialect: "postgres", logging: false, pool: { max: 8, min: 0 },
    dialectOptions: { ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 10000 } });
  let ownSchema = false;
  t.after(async () => {
    try { if (ownSchema) await db.query('DROP SCHEMA "core" CASCADE'); }
    finally { await db.close(); }
  });
  const [identity] = await db.query("SELECT current_database() AS name, inet_server_addr()::text AS address");
  assert.equal(identity[0].name, "titanium_arco_test");
  assert.ok(["127.0.0.1/32", "127.0.0.1", "::1/128", "::1"].includes(identity[0].address));
  const [schemas] = await db.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core'");
  assert.equal(schemas.length, 0, "Refusing to modify an existing core schema.");
  await db.query('CREATE SCHEMA "core"'); ownSchema = true;
  const uuid = () => ({ type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true });
  const User = db.define("User", { id: uuid(), role: DataTypes.STRING, email: DataTypes.STRING,
    password: DataTypes.STRING, provider: DataTypes.STRING, authMethod: DataTypes.STRING,
    isVerified: DataTypes.BOOLEAN, mustChangePassword: DataTypes.BOOLEAN, totpSecret: DataTypes.STRING,
    verificationOtp: DataTypes.STRING, verificationOtpExpires: DataTypes.DATE,
  }, { schema: "core", tableName: "Users", timestamps: true });
  const Session = db.define("Session", { id: uuid(), userId: DataTypes.UUID, token: DataTypes.TEXT,
    revoked: DataTypes.BOOLEAN, expiresAt: DataTypes.DATE }, { schema: "core", tableName: "sessions", timestamps: false });
  const TrainerProfile = db.define("TrainerProfile", { id: uuid(), trainerId: { type: DataTypes.UUID, unique: true },
    fullName: DataTypes.STRING(160), phone: DataTypes.STRING(30), specialty: DataTypes.STRING(160), certifications: DataTypes.TEXT,
    experienceYears: DataTypes.INTEGER, bio: DataTypes.TEXT, focus: DataTypes.TEXT, photoUrl: DataTypes.TEXT, photoPublicId: DataTypes.STRING,
  }, { schema: "core", tableName: "TrainerProfiles", timestamps: true });
  await User.sync(); await Session.sync(); await TrainerProfile.sync();
  await db.transaction((transaction) => up({ sequelize: db, transaction }));
  await db.transaction((transaction) => down({ sequelize: db, transaction }));
  await db.transaction((transaction) => up({ sequelize: db, transaction }));
  await db.transaction((transaction) => upReview({ sequelize: db, transaction }));
  await db.transaction((transaction) => downReview({ sequelize: db, transaction }));
  await db.transaction((transaction) => upReview({ sequelize: db, transaction }));
  User.rawAttributes.deletionCompletedAt = { type: DataTypes.DATE, allowNull: true };
  User.refreshAttributes();
  const f = await privacyFixture({ database: db, databaseModels: { User, Session, TrainerProfile } });
  const request = await f.http(t);
  const consent = { noticeId: "privacy-notice", version: "test-v1", accepted: true };
  const bodyFor = (token) => ({ confirmation: "SOLICITAR CANCELACIÓN", reauthenticationToken: token });
  const proof = async (user = f.client) => (await f.cancellation.reauthenticate(user.id, (await f.sessionFor(user)).id,
    { purpose: "account-cancellation", method: "password", password: f.password })).body.reauthenticationToken;

  await t.test("consentimiento simultáneo crea una sola evidencia y registra fecha/hash", async () => {
    assert.equal((await request("/user/privacy-consents")).body.consents.length, 0);
    const receipts = await Promise.all(Array.from({ length: 10 }, () => f.service.acceptConsent(f.client.id, consent)));
    assert.equal(new Set(receipts.map((row) => row.receiptId)).size, 1);
    assert.equal(await f.models.PrivacyConsent.count(), 1);
    assert.equal(receipts[0].contentSha256, "a".repeat(64));
  });

  await t.test("registro móvil con evidencia y rollback real si falla el recibo", async () => {
    await db.query(`ALTER TABLE "core"."PrivacyConsents" ADD CONSTRAINT "test_registration_failure" CHECK ("source" <> 'registration')`);
    const before = await User.count();
    const registerBody = { email: "register-failure@example.invalid", password: f.password, client: "mobile", privacyConsent: consent };
    assert.equal((await request("/auth/register", { user: null, method: "POST", body: registerBody })).status, 400);
    assert.equal(await User.count(), before);
    await db.query('ALTER TABLE "core"."PrivacyConsents" DROP CONSTRAINT "test_registration_failure"');
    const registered = await request("/auth/register", { user: null, method: "POST", body: registerBody });
    assert.equal(registered.status, 201); assert.ok(registered.body.privacyConsent.receiptId);
  });

  await t.test("perfil: ETag estable tras releer PostgreSQL y dos PATCH concurrentes", async () => {
    const current = await request("/user/profile");
    const results = await Promise.all(["Uno", "Dos"].map((fullName) => request("/user/profile", {
      method: "PATCH", headers: { "If-Match": current.headers.get("etag") }, body: { fullName },
    })));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 412]);
    const saved = results.find((r) => r.status === 200);
    const loaded = await request("/user/profile");
    assert.equal(loaded.headers.get("etag"), saved.headers.get("etag"));
    assert.equal(loaded.body.fullName, saved.body.fullName);
    assert.equal(loaded.body.password, undefined);
  });

  await t.test("entrenador comparte almacenamiento con PUT web y preserva campos profesionales", async () => {
    const initial = await request("/user/profile", { user: f.trainer });
    const patch = await request("/user/profile", { user: f.trainer, method: "PATCH", headers: { "If-Match": initial.headers.get("etag") }, body: { fullName: "Trainer", phone: "5551234567" } });
    assert.equal(patch.status, 200);
    assert.equal((await request("/trainer/profile", { user: f.trainer })).body.profile.fullName, "Trainer");
    assert.equal(await f.models.UserPersonalData.count({ where: { userId: f.trainer.id } }), 0);
    assert.equal((await request("/user/profile", { user: f.trainer })).headers.get("etag"), patch.headers.get("etag"));
  });

  await t.test("preferencias concurrentes generan una revisión y su evento, sin opt-in implícito", async () => {
    const results = await Promise.all([true, false].map((optOut) => request("/user/privacy-preferences", { method: "PATCH", body: {
      version: 1, preferences: [{ purpose: "promotional_communications", optOut }],
    } })));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(await f.models.PrivacyPreferenceEvent.count(), 1);
    assert.equal((await request("/user/privacy-preferences")).body.version, 2);
    assert.equal(await f.service.maySendOptionalCommunication(f.client.id, "promotional_communications"), false);
  });

  await t.test("OTP fresco y consumo atómico del reto sobre PostgreSQL", async () => {
    await f.other.update({ authMethod: "otp" });
    const session = await f.sessionFor(f.other);
    const challenge = await f.cancellation.reauthenticate(f.other.id, session.id, { purpose: "account-cancellation", method: "password", password: f.password });
    const code = f.deliveries.at(-1).code;
    const results = await Promise.allSettled([1, 2].map(() => f.cancellation.verifyReauthentication(f.other.id, session.id, { challengeId: challenge.body.challengeId, code })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.find((r) => r.status === "rejected").reason.code, "REAUTHENTICATION_REQUIRED");
  });

  await t.test("cancelación conserva finanzas/membresía e historial; rollback e idempotencia reales", async () => {
    // Synthetic existing records in this newly created, disposable schema.
    for (const name of ["Orders", "Payments", "Receipts", "UserSubscriptions", "SubscriptionHistories"]) {
      await db.query(`CREATE TABLE "core"."${name}" ("id" UUID PRIMARY KEY, "userId" UUID REFERENCES "core"."Users"("id") ON DELETE RESTRICT, "snapshot" JSONB)`);
      await db.query(`INSERT INTO "core"."${name}" VALUES (:id, :userId, :snapshot::jsonb)`, { replacements: {
        id: randomUUID(), userId: f.client.id, snapshot: JSON.stringify({ status: "active-or-paid", amount: "999.00" }),
      } });
    }
    const fingerprint = async () => {
      const results = [];
      for (const name of ["Orders", "Payments", "Receipts", "UserSubscriptions", "SubscriptionHistories"]) {
        const [rows] = await db.query(`SELECT * FROM "core"."${name}" ORDER BY "id"`); results.push(rows);
      }
      return JSON.stringify(results);
    };
    const before = await fingerprint(), userCount = await User.count();
    const token = await proof(), session = await f.sessionFor(f.client), key = randomUUID();
    const send = () => f.cancellation.requestCancellation(f.client.id, session.id, bodyFor(token), key);
    await db.query(`ALTER TABLE "core"."ReauthenticationProofs" ADD CONSTRAINT "test_consume_failure" CHECK ("consumedAt" IS NULL)`);
    await assert.rejects(send); assert.equal(await f.models.AccountCancellationRequest.count(), 0);
    const unconsumed = await f.models.ReauthenticationProof.findOne({ where: { userId: f.client.id } });
    assert.equal(unconsumed.consumedAt, null);
    await db.query('ALTER TABLE "core"."ReauthenticationProofs" DROP CONSTRAINT "test_consume_failure"');
    const results = await Promise.all(Array.from({ length: 10 }, send));
    assert.equal(new Set(results.map((r) => r.requestId)).size, 1);
    assert.equal(await f.models.AccountCancellationRequest.count(), 1);
    assert.equal(await fingerprint(), before); assert.equal(await User.count(), userCount);
    assert.equal((await request(`/user/account-cancellation-requests/${results[0].requestId}`, { user: f.other })).status, 404);
    assert.equal((await request(`/user/account-cancellation-requests/${results[0].requestId}`)).body.status, "pending_review");
    await assert.rejects(() => db.transaction((transaction) => User.destroy({ where: { id: f.client.id }, transaction })));
    assert.equal(await User.count(), userCount);
  });

  await t.test("revisión administrativa: bloqueos, idempotencia e índice abierto reales", async () => {
    const row = await f.models.AccountCancellationRequest.findOne({where:{userId:f.client.id}});
    const path = `/admin/account-cancellation-requests/${row.id}/decisions`;
    const key = randomUUID();
    const send = (status, version, idempotencyKey=key) => request(path,{user:f.admin,method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:{status,version,reasonCode:'SYNTHETIC_REVIEW'}});
    const same = await Promise.all(Array.from({length:8},()=>send('under_review',1)));
    assert.ok(same.every((r)=>r.status===200)); assert.equal(await f.models.AccountCancellationEvent.count(),1);
    assert.equal((await send('completed',2,randomUUID())).body.code,'RETENTION_POLICY_PENDING_APPROVAL');
    const competing = await Promise.all([send('awaiting_policy',2,randomUUID()),send('rejected',2,randomUUID())]);
    assert.deepEqual(competing.map((r)=>r.status).sort(),[200,409]);
    assert.equal(await f.models.AccountCancellationEvent.count(),2);
    await assert.rejects(()=>f.models.AccountCancellationEvent.update({reasonCode:'TAMPERED'},{where:{requestId:row.id}}));
    await assert.rejects(()=>f.models.AccountCancellationEvent.destroy({where:{requestId:row.id}}));
    assert.equal(await f.models.AccountCancellationEvent.count(),2);
    assert.equal((await request('/user/account-cancellation-requests')).body.requests[0].version,3);
    await assert.rejects(()=>db.transaction((transaction)=>downReview({sequelize:db,transaction})));
  });

  await t.test("migración down rechaza pérdida de evidencias existentes", async () => {
    await assert.rejects(() => db.transaction((transaction) => down({ sequelize: db, transaction })));
    assert.equal(await f.models.AccountCancellationRequest.count(), 1);
    assert.equal(await f.models.PrivacyConsent.count(), 2);
  });
});
