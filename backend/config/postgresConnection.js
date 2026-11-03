import { readFileSync } from "node:fs";
import pg from "pg";
import { Sequelize } from "sequelize";

// Sequelize 6 does not forward enableChannelBinding to pg.Client. Keep it
// enabled in the driver while certificate and hostname validation stay strict.
class VerifiedPostgresClient extends pg.Client {
  constructor(options) {
    super({ ...options, enableChannelBinding: true });
  }
}

export function postgresOptions(value, { pooled = true } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid PostgreSQL connection configuration."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.hash) {
    throw new Error("Invalid PostgreSQL connection configuration.");
  }
  const ssl = { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: url.hostname };
  const dialectOptions = { ssl };
  const seen = new Set();
  for (const [key, option] of url.searchParams) {
    if (seen.has(key)) throw new Error("Duplicate PostgreSQL connection option.");
    seen.add(key);
    if (key === "sslmode") {
      if (!["require", "verify-ca", "verify-full"].includes(option)) throw new Error("Verified PostgreSQL TLS is required.");
    } else if (key === "channel_binding") {
      if (!["require", "prefer"].includes(option)) throw new Error("PostgreSQL channel binding must stay enabled.");
    } else if (["sslrootcert", "sslcert", "sslkey"].includes(key)) {
      const property = { sslrootcert: "ca", sslcert: "cert", sslkey: "key" }[key];
      try { ssl[property] = readFileSync(option, "utf8"); }
      catch { throw new Error("Cannot read configured PostgreSQL TLS material."); }
    } else if (["application_name", "options", "client_encoding"].includes(key)) {
      dialectOptions[key] = option;
    } else if (["statement_timeout", "lock_timeout", "idle_in_transaction_session_timeout", "connect_timeout"].includes(key)) {
      if (!/^\d+$/.test(option) || !Number.isSafeInteger(Number(option))) throw new Error("Invalid PostgreSQL timeout.");
      dialectOptions[key === "connect_timeout" ? "connectionTimeoutMillis" : key] = Number(option) * (key === "connect_timeout" ? 1000 : 1);
    } else {
      // Never let URI query parameters replace the host, credentials or TLS
      // object. A new production option must be reviewed explicitly.
      throw new Error("Unsupported PostgreSQL connection option.");
    }
  }
  // Use the object constructor: Sequelize's URI constructor reparses sslmode
  // and can replace the SSL object, including rejectUnauthorized.
  return {
    dialect: "postgres", host: url.hostname, port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1)),
    username: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    logging: false, dialectOptions,
    dialectModule: { ...pg, Client: VerifiedPostgresClient },
    pool: { max: pooled ? 10 : 1, min: 0, acquire: 30000, idle: 10000 },
  };
}

export function createPostgresConnection(value, options) {
  return new Sequelize(postgresOptions(value, options));
}
