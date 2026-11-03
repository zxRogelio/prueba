import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { FULFILLMENT_STATUSES } from "../utils/deliveryValidation.js";

export const OrderFulfillment = sequelize.define("OrderFulfillment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false, unique: true },
  method: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [["pickup", "delivery"]] } },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "awaiting_payment", validate: { isIn: [FULFILLMENT_STATUSES] } },
  resumeStatus: { type: DataTypes.STRING(30), allowNull: true },
  recipientName: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(25), allowNull: false },
  addressSnapshot: { type: DataTypes.JSONB, allowNull: true },
  pickupLocationSnapshot: { type: DataTypes.JSONB, allowNull: true },
  shippingCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  rateSnapshot: { type: DataTypes.JSONB, allowNull: true },
  carrier: { type: DataTypes.STRING(120), allowNull: true },
  trackingNumber: { type: DataTypes.STRING(120), allowNull: true },
  preparedAt: { type: DataTypes.DATE, allowNull: true },
  readyAt: { type: DataTypes.DATE, allowNull: true },
  packedAt: { type: DataTypes.DATE, allowNull: true },
  shippedAt: { type: DataTypes.DATE, allowNull: true },
  deliveredAt: { type: DataTypes.DATE, allowNull: true },
  pickedUpAt: { type: DataTypes.DATE, allowNull: true },
  cancelledAt: { type: DataTypes.DATE, allowNull: true },
  confirmedBy: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "OrderFulfillments", schema: "core", timestamps: true });
