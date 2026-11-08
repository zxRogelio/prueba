import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { test } from "node:test";
import { DataTypes, Sequelize } from "sequelize";
import { accessFixture } from "../helpers/accessFixture.js";
import { validateAccessPostgresTarget } from "../helpers/accessPostgresTarget.js";
import { up, down } from "../../migrations/20261103000100-create-qr-gym-access.js";

test("QR sobre PostgreSQL real aislado: migración, HTTP, concurrencia y rollback", {
  skip: !process.env.ACCESS_TEST_DATABASE_URL,
  timeout: 30000,
}, async (t) => {
  const target = process.env.ACCESS_TEST_DATABASE_URL;
  validateAccessPostgresTarget(target, process.env.ACCESS_TEST_ALLOW_LOCAL_DDL);
  const db = new Sequelize(target, { dialect: "postgres", logging: false, pool: { max: 8, min: 0 },
    dialectOptions: { ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 10000 } });
  let ownSchema = false;
  t.after(async () => {
    try { if (ownSchema) await db.query('DROP SCHEMA "core" CASCADE'); }
    finally { await db.close(); }
  });
  const [identity] = await db.query("SELECT current_database() AS name, inet_server_addr()::text AS address");
  assert.equal(identity[0].name, "titanium_access_test");
  assert.ok(["127.0.0.1/32", "127.0.0.1", "::1/128", "::1"].includes(identity[0].address));
  const [schemas] = await db.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core'");
  assert.equal(schemas.length, 0, "Refusing to modify an existing core schema.");
  await db.query('CREATE SCHEMA "core"');
  ownSchema = true;
  const uuid = () => ({ type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true });
  // Minimal existing-domain tables; new QR tables/models and service are real.
  const User = db.define("User", { id: uuid(), role: DataTypes.STRING, email: DataTypes.STRING, deletionCompletedAt: DataTypes.DATE }, { schema: "core", tableName: "Users", timestamps: false });
  const Session = db.define("Session", { id: uuid(), userId: DataTypes.UUID, token: DataTypes.TEXT, revoked: DataTypes.BOOLEAN, expiresAt: DataTypes.DATE }, { schema: "core", tableName: "sessions", timestamps: false });
  const UserSubscription = db.define("UserSubscription", {
    id: uuid(), userId: DataTypes.UUID, startsAt: DataTypes.DATEONLY, endsAt: DataTypes.DATEONLY,
    status: DataTypes.STRING, source: DataTypes.STRING, groupId: DataTypes.UUID, cancelledAt: DataTypes.DATE,
  }, { schema: "core", tableName: "UserSubscriptions", timestamps: false });
  await User.sync(); await Session.sync(); await UserSubscription.sync();
  await db.transaction((transaction) => up({ sequelize: db, transaction }));
  await db.transaction((transaction) => down({ sequelize: db, transaction }));
  await db.transaction((transaction) => up({ sequelize: db, transaction }));
  const f = await accessFixture({ database: db, databaseModels: { User, Session, UserSubscription } });
  const { AccessQrToken, GymAccessLog } = f.models;
  const request = await f.http(t);

  await t.test("endpoints reales: activo, manual y dos integrantes de grupo", async () => {
    const groupId = randomUUID();
    for (const source of ["online_checkout", "admin_manual", "group_package"]) {
      await UserSubscription.destroy({ where: {} });
      const sub = await f.subscription({ source, ...(source === "group_package" ? { groupId } : {}) });
      const qr = await request("/qr", { method: "POST" });
      assert.equal(qr.status, 201);
      const row = await AccessQrToken.unscoped().findOne({ where: { subscriptionId: sub.id } });
      assert.equal(row.tokenHash.length, 64); assert.notEqual(row.tokenHash, qr.body.token);
      const scan = await request("/scan", { user: f.admin, method: "POST", body: { token: qr.body.token } });
      assert.equal(scan.body.accessGranted, true);
      await GymAccessLog.destroy({ where: {} }); await AccessQrToken.destroy({ where: {} });
    }
    await f.subscription({ userId: f.other.id, source: "group_package", groupId });
    const qr = await request("/qr", { method: "POST", user: f.other });
    const scan = await request("/scan", { user: f.admin, method: "POST", body: { token: qr.body.token } });
    assert.equal(scan.body.access.userId, f.other.id);
  });

  await t.test("20 escaneos simultáneos usan una sola fila de token y registran una entrada", async () => {
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    const before = await GymAccessLog.count();
    const outcomes = await Promise.allSettled(Array.from({ length: 20 }, () => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id })));
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((o) => o.status === "rejected" && o.reason.code === "QR_ALREADY_USED").length, 19);
    assert.equal(await GymAccessLog.count(), before + 1);
  });

  await t.test("cancelación confirmada mientras el escáner espera el bloqueo se vuelve a leer", async () => {
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    const sub = await UserSubscription.findOne({ where: { userId: f.client.id } });
    const before = await GymAccessLog.count();
    const cancellation = await db.transaction();
    let scan;
    try {
      await sub.update({ status: "cancelled" }, { transaction: cancellation });
      scan = f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id });
      // Prevent unhandled rejection while waiting for the real lock waiter.
      const rejected = assert.rejects(scan, (error) => error.code === "MEMBERSHIP_REQUIRED");
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const [rows] = await db.query("SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%UserSubscriptions%' AND pid <> pg_backend_pid()");
        waiting = rows.length > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(waiting, true, "Scanner must actually wait for the subscription lock.");
      await cancellation.commit();
      await rejected;
    } finally {
      if (!cancellation.finished) await cancellation.rollback();
      if (scan) await Promise.allSettled([scan]);
    }
    assert.equal(await GymAccessLog.count(), before);
    await sub.update({ status: "active" });
  });

  await t.test("expiración durante la espera del bloqueo no concede acceso", async () => {
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    const sub = await UserSubscription.findOne({ where: { userId: f.client.id } });
    const blocker = await db.transaction();
    let scan;
    try {
      await UserSubscription.findByPk(sub.id, { transaction: blocker, lock: blocker.LOCK.UPDATE });
      scan = f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id });
      const rejected = assert.rejects(scan, (error) => error.code === "QR_EXPIRED");
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const [rows] = await db.query("SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%UserSubscriptions%' AND pid <> pg_backend_pid()");
        waiting = rows.length > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(waiting, true);
      f.advance(60000);
      await blocker.commit(); await rejected;
    } finally {
      if (!blocker.finished) await blocker.rollback();
      if (scan) await Promise.allSettled([scan]);
    }
    f.advance(-60000);
  });

  await t.test("fallo real de escritura revierte el registro y mantiene el QR reutilizable", async () => {
    const qr = await f.service.generateAccessQr({ userId: f.client.id });
    const before = await GymAccessLog.count();
    await db.query(`CREATE FUNCTION core.reject_access_use() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected update failure'; END $$;
      CREATE TRIGGER reject_access_use BEFORE UPDATE ON core."AccessQrTokens" FOR EACH ROW EXECUTE FUNCTION core.reject_access_use();`);
    try { await assert.rejects(() => f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id })); }
    finally { await db.query('DROP TRIGGER reject_access_use ON core."AccessQrTokens"; DROP FUNCTION core.reject_access_use();'); }
    assert.equal(await GymAccessLog.count(), before);
    const tokenRow = await AccessQrToken.findOne({ where: { tokenHash: createHash("sha256").update(qr.token).digest("hex") } });
    assert.equal(tokenRow.usedAt, null);
    assert.equal((await f.service.scanAccessQr({ token: qr.token, scannedBy: f.admin.id })).accessGranted, true);
  });

  await t.test("historial privado y rollback de migración protege las entradas existentes", async () => {
    const mine = await request(`/me/history?userId=${f.other.id}&limit=1`);
    assert.equal(mine.body.history.length, 1);
    assert.equal(mine.body.history[0].userId, f.client.id);
    assert.equal(JSON.stringify(mine.body).includes("tokenHash"), false);
    await assert.rejects(() => db.transaction((transaction) => down({ sequelize: db, transaction })), /existen entradas registradas/);
    assert.ok(await GymAccessLog.count() > 0);
    await assert.rejects(() => GymAccessLog.create({
      qrTokenId: randomUUID(), userId: f.client.id, subscriptionId: randomUUID(), scannedBy: f.admin.id, scannedAt: new Date(),
    }), (error) => error.name === "SequelizeForeignKeyConstraintError");
  });
});
