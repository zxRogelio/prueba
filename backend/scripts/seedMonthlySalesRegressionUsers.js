import bcrypt from "bcryptjs";
import { Op, QueryTypes } from "sequelize";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../config/sequelize.js";
import { User } from "../models/User.js";

const REGRESSION_USER_SEED_NAME = "sales-regression-users-v1";
const RANDOM_SEED = "TITANIUM_REGRESSION_USERS_V1";
const TEST_USER_COUNT = 500;
const EMAIL_PREFIX = "regression.v1.";
const EMAIL_DOMAIN = "titanium.test";
const PASSWORD = "TitaniumTest2026!";
const START_DATE = new Date("2024-01-01T00:00:00.000Z");
const END_DATE = new Date("2026-05-31T23:59:59.999Z");

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/monthlySalesRegressionUsersV1Seed.json"
);

const FIRST_NAMES = Object.freeze([
  "Ana",
  "Carlos",
  "Maria",
  "Luis",
  "Fernanda",
  "Jorge",
  "Daniela",
  "Miguel",
  "Sofia",
  "Alejandro",
  "Valeria",
  "Diego",
  "Camila",
  "Ricardo",
  "Paola",
  "Andres",
  "Lucia",
  "Emilio",
  "Regina",
  "Mateo",
  "Gabriela",
  "Sebastian",
  "Natalia",
  "Hector",
  "Monica",
]);

const LAST_NAMES = Object.freeze([
  "Lopez",
  "Hernandez",
  "Garcia",
  "Martinez",
  "Sanchez",
  "Ramirez",
  "Cruz",
  "Torres",
  "Flores",
  "Vargas",
  "Morales",
  "Castillo",
  "Reyes",
  "Jimenez",
  "Ortega",
  "Mendoza",
  "Rojas",
  "Navarro",
  "Aguilar",
  "Campos",
]);

const USERS_BY_MONTH = Object.freeze({
  "2024-01": 18,
  "2024-02": 22,
  "2024-03": 24,
  "2024-04": 28,
  "2024-05": 31,
  "2024-06": 37,
  "2024-07": 13,
  "2024-08": 14,
  "2024-09": 15,
  "2024-10": 17,
  "2024-11": 19,
  "2024-12": 22,
  "2025-01": 8,
  "2025-02": 9,
  "2025-03": 10,
  "2025-04": 11,
  "2025-05": 11,
  "2025-06": 12,
  "2025-07": 12,
  "2025-08": 13,
  "2025-09": 14,
  "2025-10": 15,
  "2025-11": 17,
  "2025-12": 18,
  "2026-01": 14,
  "2026-02": 16,
  "2026-03": 18,
  "2026-04": 20,
  "2026-05": 22,
});

function makeSeededRandom(seed) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function monthEnd(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
}

function createdAtFor(month, monthOffset) {
  const random = makeSeededRandom(`${RANDOM_SEED}:${month}:${monthOffset}`);
  const [year, monthNumber] = month.split("-").map(Number);
  const maxDay = monthEnd(month).getUTCDate();
  const day = 1 + Math.floor(random() * maxDay);
  const hour = 7 + Math.floor(random() * 14);
  const minute = Math.floor(random() * 60);
  const second = Math.floor(random() * 60);

  return new Date(Date.UTC(year, monthNumber - 1, day, hour, minute, second, 0));
}

function emailFor(index) {
  return `${EMAIL_PREFIX}${String(index).padStart(4, "0")}@${EMAIL_DOMAIN}`;
}

function buildPlan() {
  const users = [];
  let index = 1;

  for (const [month, count] of Object.entries(USERS_BY_MONTH)) {
    for (let offset = 0; offset < count; offset += 1) {
      const firstName = FIRST_NAMES[(index - 1) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[Math.floor((index - 1) / FIRST_NAMES.length) % LAST_NAMES.length];
      const createdAt = createdAtFor(month, offset + 1);

      users.push({
        index,
        firstName,
        lastName,
        email: emailFor(index),
        createdAt,
      });
      index += 1;
    }
  }

  return users.sort((left, right) => {
    const dateDiff = left.createdAt.getTime() - right.createdAt.getTime();
    return dateDiff !== 0 ? dateDiff : left.index - right.index;
  });
}

function usersByMonth(users) {
  return users.reduce((result, user) => {
    const month = user.createdAt.toISOString().slice(0, 7);
    result[month] = (result[month] ?? 0) + 1;
    return result;
  }, {});
}

function usersByYear(users) {
  return users.reduce((result, user) => {
    const year = user.createdAt.toISOString().slice(0, 4);
    result[year] = (result[year] ?? 0) + 1;
    return result;
  }, {});
}

function validatePlan(users) {
  const errors = [];
  const emails = users.map((user) => user.email);
  const duplicateEmails = emails.length - new Set(emails).size;
  const beforeJuly2024 = users.filter(
    (user) => user.createdAt < new Date("2024-07-01T00:00:00.000Z")
  ).length;
  const distribution = usersByMonth(users);

  if (users.length !== TEST_USER_COUNT) {
    errors.push(`Usuarios planeados ${users.length}; esperado ${TEST_USER_COUNT}.`);
  }
  if (duplicateEmails > 0) {
    errors.push(`Correos duplicados planeados: ${duplicateEmails}.`);
  }
  if (users.some((user) => !/^regression\.v1\.\d{4}@titanium\.test$/.test(user.email))) {
    errors.push("Hay correos que no cumplen el prefijo de regresion.");
  }
  if (users.some((user) => user.createdAt < START_DATE || user.createdAt > END_DATE)) {
    errors.push("Hay fechas de registro fuera del periodo historico permitido.");
  }
  if (beforeJuly2024 < 150) {
    errors.push(`Usuarios antes de julio de 2024: ${beforeJuly2024}; minimo 150.`);
  }
  if (new Set(Object.values(distribution)).size <= 1) {
    errors.push("La distribucion mensual de usuarios es identica.");
  }

  return {
    errors,
    duplicateEmails,
    beforeJuly2024,
    distribution,
  };
}

async function readManifest() {
  try {
    const payload = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
    return payload?.seedName === REGRESSION_USER_SEED_NAME ? payload : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeManifest(payload) {
  await mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
  const tmpPath = `${MANIFEST_FILE}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(tmpPath, MANIFEST_FILE);
}

async function loadExistingUsers(plannedEmails) {
  return User.findAll({
    attributes: [
      "id",
      "email",
      "role",
      "isVerified",
      "isPendingApproval",
      "authMethod",
      "provider",
      "createdAt",
    ],
    where: {
      email: { [Op.in]: plannedEmails },
    },
    order: [["email", "ASC"]],
    raw: true,
  });
}

async function loadPrefixUsers() {
  return User.findAll({
    attributes: ["id", "email", "role", "createdAt"],
    where: {
      email: { [Op.like]: `${EMAIL_PREFIX}%@${EMAIL_DOMAIN}` },
    },
    order: [["email", "ASC"]],
    raw: true,
  });
}

function buildUserRows(users, hashedPassword) {
  return users.map((user) => ({
    email: user.email,
    password: hashedPassword,
    role: "cliente",
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
    providerId: null,
    otp: null,
    otpExpires: null,
    accessToken: null,
    totpSecret: null,
    passwordChangesCount: 0,
    passwordChangesDate: null,
    mustChangePassword: false,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  }));
}

function buildManifest(users) {
  const sorted = [...users].sort((left, right) => left.email.localeCompare(right.email));
  const createdDates = sorted.map((user) => new Date(user.createdAt));

  return {
    seedName: REGRESSION_USER_SEED_NAME,
    randomSeed: RANDOM_SEED,
    usersCreated: sorted.length,
    userIds: sorted.map((user) => user.id),
    emails: sorted.map((user) => user.email),
    minimumCreatedAt: new Date(Math.min(...createdDates)).toISOString(),
    maximumCreatedAt: new Date(Math.max(...createdDates)).toISOString(),
    usersCreatedByMonth: usersByMonth(sorted),
  };
}

async function dependencyCounts(userIds) {
  if (userIds.length === 0) {
    return {
      orders: 0,
      salesSeedOrders: 0,
      nonSalesSeedOrders: 0,
      payments: 0,
      subscriptions: 0,
      histories: 0,
      profiles: 0,
      carts: 0,
      behaviorEvents: 0,
      routines: 0,
    };
  }

  const [rows] = await sequelize.query(
    `
WITH selected_users AS (
  SELECT unnest(:userIds::uuid[]) AS id
),
user_orders AS (
  SELECT o.*
  FROM core."Orders" o
  JOIN selected_users u ON u.id = o."userId"
)
SELECT
  (SELECT COUNT(*)::int FROM user_orders) AS "orders",
  (SELECT COUNT(*)::int FROM user_orders WHERE "metadata"->>'seedName' = 'sales-regression-monthly-v1') AS "salesSeedOrders",
  (SELECT COUNT(*)::int FROM user_orders WHERE COALESCE("metadata"->>'seedName', '') <> 'sales-regression-monthly-v1') AS "nonSalesSeedOrders",
  (SELECT COUNT(*)::int FROM core."Payments" p JOIN selected_users u ON u.id = p."userId") AS "payments",
  (SELECT COUNT(*)::int FROM core."UserSubscriptions" s JOIN selected_users u ON u.id = s."userId") AS "subscriptions",
  (SELECT COUNT(*)::int FROM core."SubscriptionHistories" h JOIN selected_users u ON u.id = h."userId") AS "histories",
  (SELECT COUNT(*)::int FROM core."UserProfiles" p JOIN selected_users u ON u.id = p."userId") AS "profiles",
  (SELECT COUNT(*)::int FROM core."Carts" c JOIN selected_users u ON u.id = c."userId") AS "carts",
  (SELECT COUNT(*)::int FROM core."BehaviorEvents" b JOIN selected_users u ON u.id = b."userId") AS "behaviorEvents",
  (SELECT COUNT(*)::int FROM core."Routines" r JOIN selected_users u ON u.id = r."trainerId") AS "routines";
`,
    {
      replacements: { userIds },
      type: QueryTypes.SELECT,
    }
  );

  return rows;
}

async function verifyUsers() {
  const rows = await loadPrefixUsers();
  const validation = validatePlan(buildPlan());
  const duplicateEmails = rows.length - new Set(rows.map((row) => row.email)).size;
  const byMonth = usersByMonth(rows.map((row) => ({ createdAt: new Date(row.createdAt) })));
  const byYear = usersByYear(rows.map((row) => ({ createdAt: new Date(row.createdAt) })));
  const createdDates = rows.map((row) => new Date(row.createdAt));

  return {
    usersFound: rows.length,
    roleCliente: rows.filter((row) => row.role === "cliente").length,
    duplicateEmails,
    minCreatedAt: rows.length ? new Date(Math.min(...createdDates)).toISOString() : null,
    maxCreatedAt: rows.length ? new Date(Math.max(...createdDates)).toISOString() : null,
    beforeJuly2024: rows.filter(
      (row) => new Date(row.createdAt) < new Date("2024-07-01T00:00:00.000Z")
    ).length,
    usersByYear: byYear,
    usersByMonth: byMonth,
    planErrors: validation.errors,
  };
}

function printSimulation({ plannedUsers, existingUsers, validation }) {
  console.log("Modo de simulacion");
  console.log(`Seed: ${REGRESSION_USER_SEED_NAME}`);
  console.log(`Usuarios planeados: ${plannedUsers.length}`);
  console.log(`Usuarios encontrados antes de aplicar: ${existingUsers.length}`);
  console.log(`Fecha minima de registro: ${plannedUsers[0].createdAt.toISOString()}`);
  console.log(`Fecha maxima de registro: ${plannedUsers.at(-1).createdAt.toISOString()}`);
  console.log(`Usuarios registrados antes de julio de 2024: ${validation.beforeJuly2024}`);
  console.log(`Usuarios por anio: ${JSON.stringify(usersByYear(plannedUsers))}`);
  console.log(`Usuarios por mes: ${JSON.stringify(validation.distribution)}`);
  console.log(`Correos duplicados: ${validation.duplicateEmails}`);
  console.log("Usuarios reales modificados: 0");
  console.log(`Errores: ${validation.errors.length}`);
  if (validation.errors.length > 0) {
    for (const error of validation.errors) console.log(`- ${error}`);
  }
  console.log("No se realizaron inserciones");
}

async function cleanupUsers({ confirm }) {
  const manifest = await readManifest();
  const plannedEmails = buildPlan().map((user) => user.email);
  const emails = manifest?.emails?.length ? manifest.emails : plannedEmails;
  const users = await loadExistingUsers(emails);
  const userIds = users.map((user) => user.id);
  const dependencies = await dependencyCounts(userIds);

  console.log("Modo cleanup usuarios de regresion");
  console.log(`Usuarios encontrados: ${users.length}`);
  console.log(`Dependencias: ${JSON.stringify(dependencies)}`);

  if (!confirm) {
    console.log("Falta --confirm. No se elimino nada.");
    return;
  }

  const blocking = [];
  if (dependencies.nonSalesSeedOrders > 0) blocking.push("ordenes ajenas al seed de ventas");
  if (dependencies.salesSeedOrders > 0) {
    blocking.push("ordenes del seed de ventas; ejecuta seed:regression:sales:cleanup primero");
  }
  if (dependencies.payments > 0) blocking.push("pagos");
  if (dependencies.subscriptions > 0) blocking.push("membresias");
  if (dependencies.histories > 0) blocking.push("historiales");
  if (dependencies.profiles > 0) blocking.push("perfiles");
  if (dependencies.carts > 0) blocking.push("carritos");
  if (dependencies.behaviorEvents > 0) blocking.push("eventos de comportamiento");
  if (dependencies.routines > 0) blocking.push("rutinas");

  if (blocking.length > 0) {
    throw new Error(`Cleanup detenido por dependencias: ${blocking.join(", ")}.`);
  }

  const transaction = await sequelize.transaction();
  try {
    const deletedUsers = await User.destroy({
      where: { id: { [Op.in]: userIds } },
      transaction,
    });
    await transaction.commit();
    await rm(MANIFEST_FILE, { force: true });
    console.log(`Usuarios eliminados: ${deletedUsers}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function runCheckOrApply({ apply }) {
  const plannedUsers = buildPlan();
  const validation = validatePlan(plannedUsers);
  const plannedEmails = plannedUsers.map((user) => user.email);
  const existingUsers = await loadExistingUsers(plannedEmails);

  if (!apply) {
    printSimulation({ plannedUsers, existingUsers, validation });
    return;
  }

  if (validation.errors.length > 0) {
    throw new Error(`Plan invalido:\n- ${validation.errors.join("\n- ")}`);
  }

  if (existingUsers.length > 0 && existingUsers.length < TEST_USER_COUNT) {
    throw new Error(
      `Carga parcial detectada: ${existingUsers.length}/${TEST_USER_COUNT} usuarios. Ejecuta cleanup antes de aplicar nuevamente.`
    );
  }

  if (existingUsers.length === TEST_USER_COUNT) {
    const verification = await verifyUsers();
    const manifest = buildManifest(existingUsers);
    await writeManifest(manifest);
    console.log(`La carga ${REGRESSION_USER_SEED_NAME} ya existe.`);
    console.log("Usuarios creados en esta ejecucion: 0");
    console.log(`Usuarios totales del seed despues de aplicar: ${verification.usersFound}`);
    console.log(`Fecha minima de registro: ${verification.minCreatedAt}`);
    console.log(`Fecha maxima de registro: ${verification.maxCreatedAt}`);
    console.log(`Usuarios registrados antes de julio de 2024: ${verification.beforeJuly2024}`);
    console.log(`Usuarios por anio: ${JSON.stringify(verification.usersByYear)}`);
    console.log(`Usuarios por mes: ${JSON.stringify(verification.usersByMonth)}`);
    console.log(`Correos duplicados: ${verification.duplicateEmails}`);
    console.log("Usuarios reales modificados: 0");
    console.log(`Errores: ${verification.planErrors.length}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const transaction = await sequelize.transaction();
  let createdUsers = 0;

  try {
    await User.bulkCreate(buildUserRows(plannedUsers, hashedPassword), {
      validate: true,
      transaction,
    });
    createdUsers = plannedUsers.length;
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const insertedUsers = await loadExistingUsers(plannedEmails);
  const verification = await verifyUsers();
  await writeManifest(buildManifest(insertedUsers));

  if (verification.usersFound !== TEST_USER_COUNT || verification.roleCliente !== TEST_USER_COUNT) {
    throw new Error("Verificacion final de usuarios fallida.");
  }

  console.log(`Usuarios planeados: ${plannedUsers.length}`);
  console.log(`Usuarios encontrados antes de aplicar: ${existingUsers.length}`);
  console.log(`Usuarios creados: ${createdUsers}`);
  console.log(`Usuarios totales del seed despues de aplicar: ${verification.usersFound}`);
  console.log(`Fecha minima de registro: ${verification.minCreatedAt}`);
  console.log(`Fecha maxima de registro: ${verification.maxCreatedAt}`);
  console.log(`Usuarios registrados antes de julio de 2024: ${verification.beforeJuly2024}`);
  console.log(`Usuarios por anio: ${JSON.stringify(verification.usersByYear)}`);
  console.log(`Usuarios por mes: ${JSON.stringify(verification.usersByMonth)}`);
  console.log(`Correos duplicados: ${verification.duplicateEmails}`);
  console.log("Usuarios reales modificados: 0");
  console.log("Errores: 0");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const cleanup = args.includes("--cleanup");
  const confirm = args.includes("--confirm");
  const validArgs = new Set(["--apply", "--cleanup", "--confirm"]);
  const unknownArgs = args.filter((arg) => !validArgs.has(arg));

  if (unknownArgs.length > 0) {
    throw new Error(`Argumentos no reconocidos: ${unknownArgs.join(", ")}`);
  }

  if (apply && cleanup) {
    throw new Error("Usa solamente --apply o --cleanup, no ambos.");
  }

  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    if (cleanup) {
      await cleanupUsers({ confirm });
      return;
    }

    await runCheckOrApply({ apply });
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en seedMonthlySalesRegressionUsers:", error);
  process.exit(1);
});
