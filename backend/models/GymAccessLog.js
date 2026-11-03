import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const GymAccessLog = sequelize.define("GymAccessLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  qrTokenId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  subscriptionId: { type: DataTypes.UUID, allowNull: false },
  scannedBy: { type: DataTypes.UUID, allowNull: false },
  scannedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  result: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "granted" },
}, {
  tableName: "GymAccessLogs",
  schema: "core",
  timestamps: false,
  indexes: [
    { name: "gym_access_logs_token_unique", fields: ["qrTokenId"], unique: true },
    { name: "gym_access_logs_user_date_idx", fields: ["userId", "scannedAt", "id"] },
    { name: "gym_access_logs_date_idx", fields: ["scannedAt", "id"] },
    { name: "gym_access_logs_subscription_idx", fields: ["subscriptionId"] },
    { name: "gym_access_logs_scanner_idx", fields: ["scannedBy"] },
  ],
});
