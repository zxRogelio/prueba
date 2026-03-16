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

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tudominio.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("No permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());
app.use(secureHeaders);
app.use(forceHTTPS);

sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Conectado a SQL Server");
    return sequelize.sync();
  })
  .then(() => console.log("✅ Tablas sincronizadas"))
  .catch((err) => console.error("❌ Error al conectar DB:", err));

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/admin/brands", brandRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/monitoring", monitoringRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
