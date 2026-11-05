import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as crypto from "node:crypto";
import * as Sequelize from "sequelize";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import rateLimit from "express-rate-limit";
import * as validators from "express-validator";
import sanitizeHtml from "sanitize-html";

// Real services, controllers, routes, validation, JWT, bcrypt and TOTP. Only
// persistence/email are replaced; never load dotenv or the production server.
export async function privacyFixture({ database, databaseModels } = {}) {
  const env = { JWT_SECRET: "isolated-arco-signing-key", PRIVACY_NOTICE_VERSION: "test-v1",
    PRIVACY_NOTICE_SHA256: "a".repeat(64), PRIVACY_NOTICE_URL: "https://example.invalid/privacy/test-v1",
    PRIVACY_REQUIRE_REGISTRATION_CONSENT: "false" };
  let now = Date.now();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const logs = [], deliveries = [], blacklist = new Set(), failNext = new Set(), locks = new Map();
  const context = vm.createContext({ process: { env }, Date: Clock, Buffer, URL, setTimeout, clearTimeout,
    console: Object.fromEntries(["log", "warn", "error"].map((name) => [name, (...args) => logs.push(args)])) });
  const privacyNames = ["UserPersonalData", "PrivacyConsent", "PrivacyPreference", "PrivacyPreferenceEvent",
    "ReauthenticationChallenge", "ReauthenticationProof", "AccountCancellationRequest"];
  const names = ["User", "Session", "TrainerProfile", "UserProfile", "UserWeightHistory", "UserCalorieHistory", ...privacyNames];
  const tables = Object.fromEntries(names.map((name) => [name, []]));
  const models = {};
  const fail = (key) => { if (failNext.delete(key)) throw new Error("private SQL password=secret email=private@example.invalid"); };
  async function acquire(key, transaction) {
    if (transaction.held.has(key)) return;
    const previous = locks.get(key) || Promise.resolve();
    let release;
    const current = previous.then(() => new Promise((resolve) => { release = resolve; }));
    locks.set(key, current);
    await previous;
    // Let the current promise install its resolver before returning.
    await Promise.resolve();
    transaction.held.add(key);
    transaction.releases.push(() => { release(); if (locks.get(key) === current) locks.delete(key); });
  }
  const matches = (row, where = {}) => Reflect.ownKeys(where).every((key) => {
    const value = where[key];
    if (!value || typeof value !== "object" || value instanceof Date) return row[key] === value;
    return Reflect.ownKeys(value).every((op) => op === Sequelize.Op.gte ? row[key] >= value[op] : false);
  });
  for (const name of names) {
    models[name] = {
      async create(values, { transaction } = {}) {
        fail(`${name}.create`);
        const row = { id: crypto.randomUUID(), createdAt: new Date(now), updatedAt: new Date(now), ...values };
        Object.defineProperties(row, {
          update: { value: async (fields, { transaction } = {}) => {
            fail(`${name}.update`);
            const before = { ...row };
            transaction?.undo.push(() => { for (const key of Object.keys(row)) delete row[key]; Object.assign(row, before); });
            Object.assign(row, fields, { updatedAt: new Date(now) }); return row;
          } },
          save: { value: async () => row },
        });
        tables[name].push(row);
        transaction?.undo.push(() => tables[name].splice(tables[name].indexOf(row), 1));
        return row;
      },
      async findAll({ where, order = [] } = {}) {
        fail(`${name}.find`);
        return tables[name].filter((row) => matches(row, where)).sort((a, b) => {
          for (const [key, direction] of order) {
            if (a[key] < b[key]) return direction === "DESC" ? 1 : -1;
            if (a[key] > b[key]) return direction === "DESC" ? -1 : 1;
          }
          return 0;
        });
      },
      async findOne(options = {}) {
        for (const row of await this.findAll(options)) {
          if (options.lock) await acquire(`${name}:${row.id}`, options.transaction);
          if (matches(row, options.where)) return row;
        }
        return null;
      },
      async findByPk(id, options = {}) { return this.findOne({ ...options, where: { id } }); },
      async update(values, options) {
        for (const row of await this.findAll(options)) await row.update(values, options);
      },
    };
  }
  const memoryDatabase = {
    async transaction(options, callback) {
      if (typeof options === "function") callback = options;
      const transaction = { LOCK: { UPDATE: "UPDATE" }, undo: [], held: new Set(), releases: [] };
      try { return await callback(transaction); }
      catch (error) { for (const undo of transaction.undo.reverse()) undo(); throw error; }
      finally { for (const release of transaction.releases.reverse()) release(); }
    },
  };
  const actualModels = databaseModels || models;
  const actualDatabase = database || memoryDatabase;
  const mail = Object.fromEntries(["sendOTP", "sendConfirmationEmail", "sendVerificationEmail", "sendAccountVerificationOTP", "sendCancellationOTP"].map((name) =>
    [name, async (email, code) => { fail("email"); deliveries.push({ name, email, code }); }]));
  const external = { "node:crypto": crypto, crypto, sequelize: Sequelize, express: { default: express, Router: express.Router },
    jsonwebtoken: { default: jwt }, bcrypt: { default: bcrypt }, speakeasy: { default: speakeasy },
    "express-rate-limit": { default: rateLimit }, "express-validator": validators, "sanitize-html": { default: sanitizeHtml },
    dotenv: { default: { config() {} } } };
  const internal = { "config/sequelize.js": { sequelize: actualDatabase }, "models/index.js": actualModels,
    "middleware/tokenBlacklist.js": { isTokenBlacklisted: (token) => blacklist.has(token), blacklistToken: (token) => blacklist.add(token) },
    "utils/sendEmailBrevo.js": mail,
    "middleware/uploadMemory.js": { upload: { single: () => (req, res, next) => next() } },
    "utils/cloudinaryUpload.js": { uploadMediaBufferToCloudinary: () => { throw new Error("Unexpected upload"); }, destroyCloudinaryImage() {} },
  };
  for (const name of ["User", "Session", "TrainerProfile"]) internal[`models/${name}.js`] = { [name]: actualModels[name] };
  if (!database) internal["models/Privacy.js"] = Object.fromEntries(privacyNames.map((name) => [name, models[name]]));
  const base = new URL("../../", import.meta.url), cache = new Map();
  function synthetic(key, values) {
    if (!cache.has(key)) cache.set(key, new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: key }));
    return cache.get(key);
  }
  async function moduleFor(url) {
    const key = url.href.slice(base.href.length);
    if (internal[key]) return synthetic(key, internal[key]);
    if (!cache.has(url.href)) cache.set(url.href, readFile(url, "utf8").then((source) =>
      new vm.SourceTextModule(source, { context, identifier: url.href })));
    return cache.get(url.href);
  }
  const linker = async (specifier, parent) => {
    if (external[specifier]) return synthetic(specifier, external[specifier]);
    assert.ok(specifier.startsWith("."), `Unexpected dependency ${specifier}`);
    return moduleFor(new URL(specifier, parent.identifier));
  };
  async function load(path) {
    const module = await moduleFor(new URL(path, base));
    if (module.status === "unlinked") await module.link(linker);
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  }
  if (database) Object.assign(actualModels, await load("models/Privacy.js"));
  else models.User.sequelize = memoryDatabase;
  const service = await load("services/privacyService.js");
  const cancellation = await load("services/accountCancellationService.js");
  const routes = {
    user: (await load("routes/userRoutes.js")).default,
    auth: (await load("routes/authRoutes.js")).default,
    privacy: (await load("routes/privacyRoutes.js")).default,
    trainer: (await load("routes/trainer/profileRoutes.js")).default,
    ...(!database ? { profile: (await load("routes/profileRoutes.js")).default } : {}),
  };
  const password = "ArcoTest!234";
  const passwordHash = await bcrypt.hash(password, 4);
  const users = [];
  const sessionTokens = new Map();
  for (const role of ["cliente", "cliente", "administrador", "entrenador"]) {
    const user = await actualModels.User.create({ role, email: `${crypto.randomUUID()}@example.invalid`, password: passwordHash,
      provider: "local", authMethod: "normal", isVerified: true, mustChangePassword: false, totpSecret: null });
    users.push(user);
    const token = jwt.sign({ id: user.id, role: "untrusted" }, env.JWT_SECRET, { expiresIn: "1h" });
    sessionTokens.set(user.id, token);
    await actualModels.Session.create({ userId: user.id, token, revoked: false, expiresAt: new Date(now + 3600000) });
  }
  const [client, other, admin, trainer] = users;
  const sessionFor = (user) => actualModels.Session.findOne({ where: { userId: user.id } });
  async function http(t) {
    const app = express(); app.use(express.json());
    app.use((await load("middleware/privacySecurity.js")).redactJsonErrors);
    for (const [key, router] of Object.entries(routes)) app.use(key === "trainer" ? "/api/trainer/profile" : `/api/${key}`, router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
    return async (path, { user = client, method = "GET", body, rawBody, headers = {} } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
        method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${sessionTokens.get(user.id)}` } : {}), ...headers },
        ...(rawBody !== undefined ? { body: rawBody } : body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, headers: response.headers, body: await response.json() };
    };
  }
  return { env, service, cancellation, load, models: actualModels, tables, client, other, admin, trainer, password,
    sessionFor, sessionTokens, blacklist, failNext, logs, deliveries, http, advance(ms) { now += ms; }, now: () => now };
}
