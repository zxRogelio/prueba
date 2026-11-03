import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const UserAddress = sequelize.define("UserAddress", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  recipientName: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(25), allowNull: false },
  postalCode: { type: DataTypes.STRING(5), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false },
  municipality: { type: DataTypes.STRING(100), allowNull: false },
  neighborhood: { type: DataTypes.STRING(120), allowNull: false },
  street: { type: DataTypes.STRING(160), allowNull: false },
  exteriorNumber: { type: DataTypes.STRING(30), allowNull: false },
  interiorNumber: { type: DataTypes.STRING(30), allowNull: true },
  references: { type: DataTypes.STRING(500), allowNull: false },
  isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: "UserAddresses", schema: "core", timestamps: true });
