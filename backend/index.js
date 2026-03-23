import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { secureHeaders } from "./middleware/secureHeaders.js";
import { forceHTTPS } from "./middleware/forceHTTPS.js";
import authRoutes from "./routes/authRoutes.js";
import { sequelize } from "./config/sequelize.js";
import userRoutes from "./routes/userRoutes.js";
import devRoutes from "./routes/devroutes.js";
import brandRoutes from "./routes/admin/brandRoutes.js";
import categoryRoutes from "./routes/admin/categoryRoutes.js";
import productRoutes from "./routes/admin/productRoutes.js";
import monitoringRoutes from "./routes/admin/monitoringRoutes.js";
import backupRoutes from "./routes/admin/backupRoutes.js";
import backupScheduleRoutes from "./routes/admin/backupScheduleRoutes.js";
import { initializeBackupScheduler } from "./services/backupScheduler.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(secureHeaders);
app.use(forceHTTPS);

sequelize
  .authenticate()
  .then(async () => {
    console.log("✅ Conectado a PostgreSQL");
    await sequelize.sync();
    console.log("✅ Tablas sincronizadas");
    await initializeBackupScheduler();
    console.log("✅ Scheduler de backups inicializado");
  })
  .catch((err) => console.error("❌ Error al conectar DB:", err));

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/admin/brands", brandRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/monitoring", monitoringRoutes);
app.use("/api/admin/backups", backupRoutes);
app.use("/api/admin/backup-schedule", backupScheduleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));