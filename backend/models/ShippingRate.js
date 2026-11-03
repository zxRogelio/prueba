import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ShippingRate = sequelize.define("ShippingRate", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  postalCodeFrom: { type: DataTypes.STRING(5), allowNull: false },
  postalCodeTo: { type: DataTypes.STRING(5), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "MXN" },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "ShippingRates", schema: "core", timestamps: true });
