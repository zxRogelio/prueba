import assert from "node:assert/strict";
import { test } from "node:test";
import { deliveryFixture } from "./helpers/productDeliveryFixture.js";
import { up, down } from "../migrations/20261102000200-add-pickup-settings-to-about-pages.js";

const settings = { name: "PGDEL synthetic gym", address: "Synthetic street 1", municipality: "Synthetic city", state: "Synthetic state",
  postalCode: "00001", phone: "5555555555", hours: "Synthetic hours 09:00–18:00", instructions: "Synthetic pickup instructions", enabled: true };

test("pickup configuration stores a complete location without replacing marketing contact data", async () => {
  const f = await deliveryFixture(); const service = await f.load("services/pickupLocationService.js");
  const original = f.tables.AboutPage[0].ctaAddress;
  assert.equal((await service.getPickupConfiguration()).configured, false);
  const saved = await service.savePickupConfiguration({ input: settings, actorId: f.admin.id });
  assert.equal(saved.configured, true); assert.equal(saved.settings.postalCode, "00001");
  assert.equal(f.tables.AboutPage[0].ctaAddress, original);
  assert.equal(f.tables.AboutPage[0].pickupSettings.updatedBy, f.admin.id);
  const pickup = await service.readPickupLocation();
  assert.equal(pickup.hours, settings.hours); assert.equal(pickup.instructions, settings.instructions);
  assert.equal(pickup.updatedBy, undefined);
});

test("incomplete pickup data, invalid postal code and contact are rejected", async () => {
  const f = await deliveryFixture(); const service = await f.load("services/pickupLocationService.js");
  for (const field of ["name", "address", "municipality", "state", "postalCode", "phone", "hours", "instructions"]) {
    assert.throws(() => service.normalizePickupSettings({ ...settings, [field]: "" }));
  }
  for (const change of [{ postalCode: "ABCDE" }, { phone: "123" }, { enabled: "true" }]) {
    assert.throws(() => service.normalizePickupSettings({ ...settings, ...change }));
  }
});

test("pickup may be disabled and previous order snapshots remain immutable", async () => {
  const f = await deliveryFixture(); const service = await f.load("services/pickupLocationService.js");
  await service.savePickupConfiguration({ input: settings, actorId: f.admin.id });
  const purchase = await f.checkout();
  await service.savePickupConfiguration({ input: { ...settings, hours: "Other hours", enabled: false }, actorId: f.admin.id });
  assert.equal(await service.readPickupLocation(), null);
  assert.equal(purchase.fulfillment.pickupLocationSnapshot.hours, settings.hours);
});

test("pickup settings migration is additive, transactional and refuses to discard configured locations", async () => {
  const queries = []; const transaction = {};
  const sequelize = { async query(sql, options) { queries.push(sql); assert.equal(options.transaction, transaction); } };
  await up({ sequelize, transaction }); await down({ sequelize, transaction });
  assert.match(queries[0], /ADD COLUMN "pickupSettings" JSONB NULL/);
  assert.doesNotMatch(queries[0], /UPDATE|DELETE|DROP/);
  assert.match(queries[1], /RAISE EXCEPTION/); assert.match(queries[1], /ACCESS EXCLUSIVE/);
});
