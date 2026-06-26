import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { secureHeaders } from "./middleware/secureHeaders.js";
import { forceHTTPS } from "./middleware/forceHTTPS.js";
import authRoutes from "./routes/authRoutes.js";
import { sequelize, sequelizeAdminDirect } from "./config/sequelize.js";
import userRoutes from "./routes/userRoutes.js";
import devRoutes from "./routes/devroutes.js";
import publicProductRoutes from "./routes/public/productRoutes.js";
import brandRoutes from "./routes/admin/brandRoutes.js";
import categoryRoutes from "./routes/admin/categoryRoutes.js";
import adminProductRoutes from "./routes/admin/productRoutes.js";
import monitoringRoutes from "./routes/admin/monitoringRoutes.js";
import backupRoutes from "./routes/admin/backupRoutes.js";
import backupScheduleRoutes from "./routes/admin/backupScheduleRoutes.js";
import { initializeBackupScheduler } from "./services/backupScheduler.js";
import publicCatalogRoutes from "./routes/public/catalog.routes.js";
import adminAboutRoutes from "./routes/admin/about.routes.js";
import publicAboutRoutes from "./routes/public/about.routes.js";
import profileRoutes from "./routes/profileRoutes.js";
import adminUserRoutes from "./routes/admin/userRoutes.js";
import trainerRoutineRoutes from "./routes/trainer/routineRoutes.js";
import trainerClientRoutes from "./routes/trainer/clientRoutes.js";
import trainerAgendaRoutes from "./routes/trainer/agendaRoutes.js";
import trainerProfileRoutes from "./routes/trainer/profileRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import clientRoutineRoutes from "./routes/client/routineRoutes.js";
import adminRoutineRoutes from "./routes/admin/routineRoutes.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(secureHeaders);
app.use(forceHTTPS);

app.use("/api/products", publicProductRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/admin/brands", brandRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/monitoring", monitoringRoutes);
app.use("/api/admin/backups", backupRoutes);
app.use("/api/admin/backup-schedule", backupScheduleRoutes);
app.use("/api/catalog", publicCatalogRoutes);
app.use("/api/admin/about", adminAboutRoutes);
app.use("/api/about", publicAboutRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/trainer/routines", trainerRoutineRoutes);
app.use("/api/trainer/clients", trainerClientRoutes);
app.use("/api/trainer/agenda", trainerAgendaRoutes);
app.use("/api/trainer/profile", trainerProfileRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/client/routines", clientRoutineRoutes);
app.use("/api/admin/routines", adminRoutineRoutes);



const PORT = process.env.PORT || 5000;

async function ensureDatabaseSchema() {
  await sequelizeAdminDirect.query(`
    ALTER TABLE core."Users"
    ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log('✅ Columna "mustChangePassword" verificada');
}

async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a PostgreSQL");

    await sequelize.sync();
    console.log("✅ Tablas sincronizadas");

    await ensureDatabaseSchema();
    await initializeBackupScheduler();
    console.log("✅ Scheduler de backups inicializado");

    app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
  } catch (error) {
    console.error("❌ Error al iniciar backend:", error);
    process.exit(1);
  }
}

bootstrap();
