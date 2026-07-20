import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ORDER_STATUSES = Object.freeze([
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "partially_refunded",
  "disputed",
  "charged_back",
  "refunded",
]);

export const ORDER_CHANNELS = Object.freeze(["online", "reception", "mobile"]);

export const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    orderNumber: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },

    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: "draft",
    },

    channel: {
      type: DataTypes.ENUM(...ORDER_CHANNELS),
      allowNull: false,
      defaultValue: "reception",
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    discountTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    taxTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "MXN",
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "Orders",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["orderNumber"],
        unique: true,
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["createdBy"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["channel"],
      },
      {
        fields: ["createdAt"],
      },
    ],
  }
);
