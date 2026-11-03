import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const FulfillmentEvent = sequelize.define("FulfillmentEvent", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sequence: { type: DataTypes.BIGINT, autoIncrement: true, allowNull: false, unique: true },
  fulfillmentId: { type: DataTypes.UUID, allowNull: false },
  fromStatus: { type: DataTypes.STRING(30), allowNull: true },
  toStatus: { type: DataTypes.STRING(30), allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: true },
  notes: { type: DataTypes.STRING(1000), allowNull: true },
  details: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: "FulfillmentEvents", schema: "core", timestamps: true, updatedAt: false });
