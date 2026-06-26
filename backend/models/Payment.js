import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Payment = sequelize.define(
  "Payment",
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

    planId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    paymentType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "membership",
      comment: "membership, product, mixed",
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    method: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "cash",
      comment: "cash, transfer, card_terminal, online_card, online_wallet",
    },

    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "admin_manual",
      comment: "admin_manual, online_checkout",
    },

    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "none",
      comment: "none, mercadopago_point, mercadopago_checkout, bank_transfer",
    },

    providerPaymentId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "pending",
      comment: "pending, paid, failed, cancelled, refunded",
    },

    reference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin que registró el pago manualmente",
    },
  },
  {
    tableName: "Payments",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["planId"],
      },
      {
        fields: ["subscriptionId"],
      },
      {
        fields: ["groupId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["method"],
      },
      {
        fields: ["source"],
      },
    ],
  }
);