import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

function make(url, { pooled = true } = {}) {
  return new Sequelize(url, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    pool: pooled
      ? { max: 10, min: 0, acquire: 30000, idle: 10000 }
      : { max: 1, min: 0, acquire: 30000, idle: 10000 },
  });
}

// App normal
export const sequelize = make(process.env.DATABASE_URL_RUNTIME, {
  pooled: true,
});

// Importador
export const sequelizeImporter = make(process.env.DATABASE_URL_IMPORTER, {
  pooled: true,
});

// Reportes
export const sequelizeReports = make(process.env.DATABASE_URL_REPORTS, {
  pooled: true,
});

// Admin directo para mantenimiento/monitoreo sensible
export const sequelizeAdminDirect = make(process.env.DATABASE_URL_ADMIN_DIRECT, {
  pooled: false,
});