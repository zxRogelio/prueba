import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PAYMENT_REFUND_STATUSES = Object.freeze([
  "pending",
  "approved",
  "failed",
  "cancelled",
]);

export const PaymentRefund = sequelize.define(
  "PaymentRefund",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    providerRefundId: {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: true,
    },

    idempotencyKey: {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: true,
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(...PAYMENT_REFUND_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },

    requestedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "PaymentRefunds",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "payment_refunds_provider_refund_id_unique",
        fields: ["providerRefundId"],
        unique: true,
      },
      {
        name: "payment_refunds_idempotency_key_unique",
        fields: ["idempotencyKey"],
        unique: true,
      },
      {
        name: "payment_refunds_payment_id_idx",
        fields: ["paymentId"],
      },
      {
        name: "payment_refunds_order_id_idx",
        fields: ["orderId"],
      },
      {
        name: "payment_refunds_status_idx",
        fields: ["status"],
      },
      {
        name: "payment_refunds_requested_by_idx",
        fields: ["requestedBy"],
      },
      {
        name: "payment_refunds_created_at_idx",
        fields: ["createdAt"],
      },
    ],
  }
);

PaymentRefund.beforeValidate((refund) => {
  if (typeof refund.providerRefundId === "string") {
    const trimmed = refund.providerRefundId.trim();
    refund.providerRefundId = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof refund.idempotencyKey === "string") {
    const trimmed = refund.idempotencyKey.trim();
    refund.idempotencyKey = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof refund.reason === "string") {
    const trimmed = refund.reason.trim();
    refund.reason = trimmed.length > 0 ? trimmed : null;
  }
});
