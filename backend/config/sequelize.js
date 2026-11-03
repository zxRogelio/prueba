import dotenv from "dotenv";
import { createPostgresConnection as make } from "./postgresConnection.js";

dotenv.config();

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
