import bcrypt from "bcryptjs";
import { sequelize } from "../config/sequelize.js";
import { User } from "../models/User.js";
import { Op } from "sequelize";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_USER_COUNT = 500;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/seed500TestUsers.json"
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

const EMAIL_DOMAINS = Object.freeze([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
]);

const VERIFICATION_QUERY = `
WITH seed_users AS (
  SELECT "id", "email", "role", "isVerified", "provider", "authMethod", "isPendingApproval"
  FROM "core"."Users"
  WHERE "email" IN (:emails)
),
seed_orders AS (
  SELECT "id"
  FROM "core"."Orders"
  WHERE "userId" IN (SELECT "id" FROM seed_users)
),
seed_carts AS (
  SELECT "id"
  FROM "core"."Carts"
  WHERE "userId" IN (SELECT "id" FROM seed_users)
),
seed_routines AS (
  SELECT "id"
  FROM "core"."Routines"
  WHERE "trainerId" IN (SELECT "id" FROM seed_users)
)
SELECT
  (SELECT COUNT(*)::int FROM seed_users) AS "usersFound",
  (SELECT COUNT(*)::int FROM seed_users WHERE "role" = 'cliente') AS "roleCliente",
  (SELECT COUNT(*)::int FROM seed_users WHERE "isVerified" = true) AS "verifiedUsers",
  (SELECT COUNT(*)::int FROM seed_users WHERE "provider" = 'local') AS "localProviderUsers",
  (SELECT COUNT(*)::int FROM seed_users WHERE "authMethod" = 'normal') AS "normalAuthUsers",
  (SELECT COUNT(*)::int FROM seed_users WHERE "isPendingApproval" = false) AS "notPendingApprovalUsers",
  (SELECT COUNT(*)::int FROM "core"."UserProfiles" WHERE "userId" IN (SELECT "id" FROM seed_users)) AS "userProfiles",
  (SELECT COUNT(*)::int FROM "core"."UserSubscriptions" WHERE "userId" IN (SELECT "id" FROM seed_users)) AS "userSubscriptions",
  (SELECT COUNT(*)::int FROM "core"."SubscriptionHistories" WHERE "userId" IN (SELECT "id" FROM seed_users)) AS "subscriptionHistories",
  (SELECT COUNT(*)::int FROM seed_orders) AS "orders",
  (SELECT COUNT(*)::int FROM "core"."OrderItems" WHERE "orderId" IN (SELECT "id" FROM seed_orders)) AS "orderItems",
  (SELECT COUNT(*)::int FROM "core"."Payments" WHERE "userId" IN (SELECT "id" FROM seed_users)) AS "payments",
  (SELECT COUNT(*)::int FROM "core"."BehaviorEvents" WHERE "userId" IN (SELECT "id" FROM seed_users)) AS "behaviorEvents",
  (SELECT COUNT(*)::int FROM seed_routines) AS "routines",
  (SELECT COUNT(*)::int FROM "core"."RoutineExercises" WHERE "routineId" IN (SELECT "id" FROM seed_routines)) AS "routineExercises",
  (SELECT COUNT(*)::int FROM seed_carts) AS "carts",
  (SELECT COUNT(*)::int FROM "core"."CartItems" WHERE "cartId" IN (SELECT "id" FROM seed_carts)) AS "cartItems";
`;

function toEmailSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function buildEmail(localPart, domain, suffix = 0) {
  return `${localPart}${suffix > 0 ? suffix : ""}@${domain}`;
}

function generateBaseUsers() {
  const users = [];

  for (let firstNameIndex = 0; firstNameIndex < FIRST_NAMES.length; firstNameIndex += 1) {
    for (let lastNameIndex = 0; lastNameIndex < LAST_NAMES.length; lastNameIndex += 1) {
      const firstName = FIRST_NAMES[firstNameIndex];
      const lastName = LAST_NAMES[lastNameIndex];
      const domain =
        EMAIL_DOMAINS[(firstNameIndex + lastNameIndex) % EMAIL_DOMAINS.length];

      users.push({
        localPart: `${toEmailSlug(firstName)}.${toEmailSlug(lastName)}`,
        domain,
      });
    }
  }

  if (users.length !== TEST_USER_COUNT) {
    throw new Error(
      `La generacion base produjo ${users.length} usuarios; se esperaban ${TEST_USER_COUNT}.`
    );
  }

  return users;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateControlEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("El archivo de control debe ser un arreglo JSON.");
  }

  if (entries.length !== TEST_USER_COUNT) {
    throw new Error(
      `El archivo de control contiene ${entries.length} usuarios; se esperaban ${TEST_USER_COUNT}.`
    );
  }

  const normalizedEntries = entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`La entrada ${index + 1} del control no es un objeto valido.`);
    }

    const keys = Object.keys(entry);
    if (keys.length !== 1 || keys[0] !== "email") {
      throw new Error(
        `La entrada ${index + 1} del control debe contener exclusivamente la llave email.`
      );
    }

    const email = normalizeEmail(entry.email);
    if (!/^[a-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud)\.com$/.test(email)) {
      throw new Error(`La entrada ${index + 1} tiene un correo no permitido: ${entry.email}`);
    }

    return { email };
  });

  const uniqueEmails = new Set(normalizedEntries.map((entry) => entry.email));
  if (uniqueEmails.size !== TEST_USER_COUNT) {
    throw new Error("El archivo de control contiene correos duplicados.");
  }

  return normalizedEntries;
}

async function readControlEntries() {
  try {
    const content = await readFile(CONTROL_FILE, "utf8");
    return validateControlEntries(JSON.parse(content));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw new Error(`No se pudo leer el archivo de control: ${error.message}`);
  }
}

async function writeControlEntries(entries) {
  await mkdir(path.dirname(CONTROL_FILE), { recursive: true });
  await writeFile(CONTROL_FILE, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

async function loadExistingEmailSet() {
  const existingUsers = await User.findAll({
    attributes: ["email"],
    raw: true,
  });

  return new Set(existingUsers.map((user) => normalizeEmail(user.email)));
}

async function createControlEntries() {
  const existingEmails = await loadExistingEmailSet();
  const selectedEmails = new Set();

  return generateBaseUsers().map(({ localPart, domain }) => {
    let suffix = 0;
    let email = buildEmail(localPart, domain, suffix);

    while (existingEmails.has(email) || selectedEmails.has(email)) {
      suffix += 1;
      email = buildEmail(localPart, domain, suffix);
    }

    selectedEmails.add(email);
    return { email };
  });
}

async function ensureControlEntries() {
  const existingControlEntries = await readControlEntries();

  if (existingControlEntries) {
    await writeControlEntries(existingControlEntries);
    return {
      entries: existingControlEntries,
      createdControlFile: false,
    };
  }

  const newControlEntries = await createControlEntries();
  await writeControlEntries(newControlEntries);

  return {
    entries: newControlEntries,
    createdControlFile: true,
  };
}

async function findExistingSeedEmails(seedEmails) {
  const rows = await User.findAll({
    attributes: ["email"],
    where: {
      email: {
        [Op.in]: seedEmails,
      },
    },
    raw: true,
  });

  return new Set(rows.map((row) => normalizeEmail(row.email)));
}

function generatedCreatedAt(index) {
  const baseTime = Date.UTC(2026, 0, 8, 15, 0, 0);
  const dayOffset = (index * 7) % 170;
  const minuteOffset = (index * 23) % 540;

  return new Date(baseTime + dayOffset * 24 * 60 * 60 * 1000 + minuteOffset * 60 * 1000);
}

function buildUserRows(entriesToInsert, hashedPassword) {
  return entriesToInsert.map(({ entry, index }) => {
    const createdAt = generatedCreatedAt(index);

    return {
      email: entry.email,
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
      createdAt,
      updatedAt: createdAt,
    };
  });
}

async function runVerification(seedEmails) {
  const [rows] = await sequelize.query(VERIFICATION_QUERY, {
    replacements: { emails: seedEmails },
  });

  return rows[0];
}

function asNumber(value) {
  return Number.parseInt(value, 10);
}

function assertVerification(verification) {
  const expected500Fields = [
    "usersFound",
    "roleCliente",
    "verifiedUsers",
    "localProviderUsers",
    "normalAuthUsers",
    "notPendingApprovalUsers",
  ];

  const expectedZeroFields = [
    "userProfiles",
    "userSubscriptions",
    "subscriptionHistories",
    "orders",
    "orderItems",
    "payments",
    "behaviorEvents",
    "routines",
    "routineExercises",
    "carts",
    "cartItems",
  ];

  const errors = [];

  for (const field of expected500Fields) {
    const value = asNumber(verification[field]);
    if (value !== TEST_USER_COUNT) {
      errors.push(`${field}: ${value}; esperado ${TEST_USER_COUNT}`);
    }
  }

  for (const field of expectedZeroFields) {
    const value = asNumber(verification[field]);
    if (value !== 0) {
      errors.push(`${field}: ${value}; esperado 0`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Verificacion final fallida:\n- ${errors.join("\n- ")}`);
  }
}

function toRelativePath(filePath) {
  return path.relative(process.cwd(), filePath) || ".";
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Conexion a la BD correcta.");

    const { entries, createdControlFile } = await ensureControlEntries();
    const seedEmails = entries.map((entry) => entry.email);
    const existingSeedEmails = await findExistingSeedEmails(seedEmails);
    const entriesToInsert = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !existingSeedEmails.has(entry.email));

    const hashedPassword = await bcrypt.hash("TitaniumTest2026!", 10);

    if (entriesToInsert.length > 0) {
      await User.bulkCreate(buildUserRows(entriesToInsert, hashedPassword), {
        validate: true,
      });
    }

    const controlEntriesForVerification = validateControlEntries(
      JSON.parse(await readFile(CONTROL_FILE, "utf8"))
    );
    const verification = await runVerification(
      controlEntriesForVerification.map((entry) => entry.email)
    );
    assertVerification(verification);

    console.log(
      JSON.stringify(
        {
          controlFile: toRelativePath(CONTROL_FILE),
          controlFileCreated: createdControlFile,
          controlEmails: entries.length,
          alreadyExistingFromControl: existingSeedEmails.size,
          insertedUsers: entriesToInsert.length,
          verification,
        },
        null,
        2
      )
    );

    console.log("Consulta de verificacion utilizada:");
    console.log(VERIFICATION_QUERY.trim());
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en seed500TestUsers:", error);
  process.exit(1);
});
