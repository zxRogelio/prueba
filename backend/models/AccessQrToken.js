import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const AccessQrToken = sequelize.define("AccessQrToken", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  subscriptionId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "AccessQrTokens",
  schema: "core",
  timestamps: true,
  updatedAt: false,
  defaultScope: { attributes: { exclude: ["tokenHash"] } },
  indexes: [
    { name: "access_qr_tokens_hash_unique", fields: ["tokenHash"], unique: true },
    { name: "access_qr_tokens_user_idx", fields: ["userId"] },
    { name: "access_qr_tokens_subscription_idx", fields: ["subscriptionId"] },
    { name: "access_qr_tokens_expires_idx", fields: ["expiresAt"] },
  ],
});
