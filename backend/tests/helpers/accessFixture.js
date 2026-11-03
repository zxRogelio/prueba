import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as crypto from "node:crypto";
import * as Sequelize from "sequelize";
import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

// Load real application code without importing .env, connecting to Neon, or
// starting the production server. Can use either isolated memory or real PG.
export async function accessFixture({ database, databaseModels } = {}) {
  const env = { JWT_SECRET: "isolated-qr-test-signing-key" };
  const logs = [];
  let now = Date.now();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = vm.createContext({
    process: { env }, Date: Clock, Buffer, setTimeout, clearTimeout,
    console: { ...console, error: (...args) => logs.push(args) },
  });
  const names = ["User", "Session", "UserSubscription", "AccessQrToken", "GymAccessLog"];
  const tables = Object.fromEntries(names.map((name) => [name, []]));
  const models = {};
  const failNext = new Set();
  const locks = new Map();
  const lockEvents = [];
  const injectedFailure = () => new Error("sensitive-driver-diagnostics SQL session=secret postgres://private");
  async function acquire(key, transaction) {
    if (transaction.held.has(key)) return;
    const previous = locks.get(key) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    const queued = previous.then(() => next);
    locks.set(key, queued);
    await previous;
    transaction.held.add(key);
    transaction.releases.push(() => { release(); if (locks.get(key) === queued) locks.delete(key); });
    lockEvents.push(key);
  }
  function matches(row, where = {}) {
    return Reflect.ownKeys(where).every((key) => {
      const expected = where[key];
      if (!expected || typeof expected !== "object" || expected instanceof Date) return row[key] === expected;
      return Reflect.ownKeys(expected).every((op) => {
        if (op === Sequelize.Op.lte) return row[key] <= expected[op];
        if (op === Sequelize.Op.gte) return row[key] >= expected[op];
        if (op === Sequelize.Op.lt) return row[key] < expected[op];
        throw new Error("Unsupported adapter operator");
      });
    });
  }
  for (const name of names) {
    models[name] = {
      async create(values, options = {}) {
        if (failNext.delete(`${name}.create`)) throw injectedFailure();
        const row = { id: crypto.randomUUID(), createdAt: new Date(now), usedAt: null, ...values };
        Object.defineProperty(row, "update", { value: async (next, updateOptions = {}) => {
          if (failNext.delete(`${name}.update`)) throw injectedFailure();
          const before = { ...row };
          updateOptions.transaction?.undo.push(() => Object.assign(row, before));
          Object.assign(row, next);
          return row;
        } });
        tables[name].push(row);
        options.transaction?.undo.push(() => tables[name].splice(tables[name].indexOf(row), 1));
        return row;
      },
      async findAll({ where, order = [], offset = 0, limit } = {}) {
        if (failNext.delete(`${name}.find`)) throw injectedFailure();
        const rows = tables[name].filter((row) => matches(row, where));
        rows.sort((a, b) => {
          for (const [key, direction] of order) {
            if (a[key] < b[key]) return direction === "DESC" ? 1 : -1;
            if (a[key] > b[key]) return direction === "DESC" ? -1 : 1;
          }
          return 0;
        });
        return rows.slice(offset, limit === undefined ? undefined : offset + limit);
      },
      async findOne(options = {}) {
        const candidates = await this.findAll(options);
        for (const row of candidates) {
          if (options.lock) {
            assert.ok(options.transaction);
            await acquire(`${name}:${row.id}`, options.transaction);
          }
          if (matches(row, options.where)) return row;
        }
        return null;
      },
      async findByPk(id, options = {}) { return this.findOne({ ...options, where: { id } }); },
      async findAndCountAll(options) {
        return { rows: await this.findAll(options), count: (await this.findAll({ ...options, offset: 0, limit: undefined })).length };
      },
    };
  }
  const memoryDatabase = {
    async transaction(options, callback) {
      if (failNext.delete("transaction")) throw injectedFailure();
      const transaction = { options, LOCK: { UPDATE: "UPDATE", SHARE: "SHARE" }, held: new Set(), releases: [], undo: [] };
      try { return await callback(transaction); }
      catch (error) { for (const undo of transaction.undo.reverse()) undo(); throw error; }
      finally { for (const release of transaction.releases.reverse()) release(); }
    },
  };
  const actualModels = databaseModels || models;
  const actualDatabase = database || memoryDatabase;
  const external = {
    "node:crypto": crypto, sequelize: Sequelize, express: { Router: express.Router },
    jsonwebtoken: { default: jwt }, "express-rate-limit": { default: rateLimit },
  };
  const internal = {
    "config/sequelize.js": { sequelize: actualDatabase }, "models/index.js": actualModels,
    "models/User.js": { User: actualModels.User }, "models/Session.js": { Session: actualModels.Session },
    "middleware/tokenBlacklist.js": { isTokenBlacklisted: () => false },
  };
  const base = new URL("../../", import.meta.url);
  const cache = new Map();
  function synthetic(key, values) {
    if (!cache.has(key)) cache.set(key, new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: key }));
    return cache.get(key);
  }
  async function moduleFor(url) {
    const key = url.href.slice(base.href.length);
    if (internal[key]) return synthetic(key, internal[key]);
    if (cache.has(url.href)) return cache.get(url.href);
    const module = new vm.SourceTextModule(await readFile(url, "utf8"), { context, identifier: url.href });
    cache.set(url.href, module);
    return module;
  }
  const linker = async (specifier, parent) => {
    if (external[specifier]) return synthetic(specifier, external[specifier]);
    assert.ok(specifier.startsWith("."), "Unexpected dependency " + specifier);
    return moduleFor(new URL(specifier, parent.identifier));
  };
  async function load(path) {
    const module = await moduleFor(new URL(path, base));
    if (module.status === "unlinked") await module.link(linker);
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  }
  if (database) {
    actualModels.AccessQrToken = (await load("models/AccessQrToken.js")).AccessQrToken;
    actualModels.GymAccessLog = (await load("models/GymAccessLog.js")).GymAccessLog;
  }
  const service = await load("services/accessService.js");
  const routes = (await load("routes/accessRoutes.js")).default;
  const client = await actualModels.User.create({ role: "cliente", email: "client@example.invalid" });
  const other = await actualModels.User.create({ role: "cliente", email: "other@example.invalid" });
  const admin = await actualModels.User.create({ role: "administrador", email: "admin@example.invalid" });
  const trainer = await actualModels.User.create({ role: "entrenador", email: "trainer@example.invalid" });
  const sessionTokens = new Map();
  for (const user of [client, other, admin, trainer]) {
    const token = jwt.sign({ id: user.id, role: "untrusted-role" }, env.JWT_SECRET, { expiresIn: "1h" });
    sessionTokens.set(user.id, token);
    await actualModels.Session.create({ userId: user.id, token, revoked: false, expiresAt: new Date(now + 3600000) });
  }
  const subscription = (extra = {}) => actualModels.UserSubscription.create({
    userId: client.id, status: "active", startsAt: new Date(now - 86400000).toISOString().slice(0, 10),
    endsAt: new Date(now + 30 * 86400000).toISOString().slice(0, 10), cancelledAt: null,
    source: "online_checkout", ...extra,
  });
  async function http(t) {
    const app = express();
    app.use(express.json());
    app.use("/api/access", routes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve, reject) => { server.closeAllConnections(); server.close((error) => error ? reject(error) : resolve()); }));
    return async (path, { user = client, method = "GET", body, authorization } = {}) => {
      const headers = { "Content-Type": "application/json" };
      if (user) headers.Authorization = authorization || `Bearer ${sessionTokens.get(user.id)}`;
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/access${path}`, {
        method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, headers: response.headers, body: await response.json() };
    };
  }
  return { service, load, models: actualModels, tables, subscription, client, other, admin, trainer,
    failNext, lockEvents, logs, sessionTokens, http, advance: (ms) => { now += ms; } };
}
