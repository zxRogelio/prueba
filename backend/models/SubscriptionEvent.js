import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const SUBSCRIPTION_EVENT_TYPES = Object.freeze([
  "created",
  "activated",
  "renewed",
  "extended",
  "expired",
  "cancelled",
  "refunded",
]);

export const SubscriptionEvent = sequelize.define(
  "SubscriptionEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    eventType: {
      type: DataTypes.ENUM(...SUBSCRIPTION_EVENT_TYPES),
      allowNull: false,
    },

    previousStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    newStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    effectiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "SubscriptionEvents",
    schema: "core",
    timestamps: false,
    indexes: [
      { fields: ["subscriptionId"] },
      { fields: ["userId"] },
      { fields: ["orderId"] },
      { fields: ["paymentId"] },
      { fields: ["eventType"] },
      { fields: ["effectiveAt"] },
      { fields: ["createdAt"] },
    ],
  }
);
