import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PAYMENT_WEBHOOK_PROCESSING_STATUSES = Object.freeze([
  "received",
  "processed",
  "ignored",
  "failed",
]);

export const PaymentWebhookEvent = sequelize.define(
  "PaymentWebhookEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    providerEventId: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    eventType: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    providerPaymentId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    signatureValid: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },

    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    processingStatus: {
      type: DataTypes.ENUM(...PAYMENT_WEBHOOK_PROCESSING_STATUSES),
      allowNull: false,
      defaultValue: "received",
    },

    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "PaymentWebhookEvents",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "payment_webhook_events_provider_event_unique",
        fields: ["provider", "providerEventId"],
        unique: true,
      },
      {
        name: "payment_webhook_events_payment_id_idx",
        fields: ["paymentId"],
      },
      {
        name: "payment_webhook_events_provider_payment_id_idx",
        fields: ["providerPaymentId"],
      },
      {
        name: "payment_webhook_events_processing_status_idx",
        fields: ["processingStatus"],
      },
      {
        name: "payment_webhook_events_created_at_idx",
        fields: ["createdAt"],
      },
    ],
  }
);

PaymentWebhookEvent.beforeValidate((event) => {
  for (const field of ["provider", "providerEventId", "eventType"]) {
    if (typeof event[field] === "string") {
      event[field] = event[field].trim();
    }
  }

  if (typeof event.providerPaymentId === "string") {
    const trimmed = event.providerPaymentId.trim();
    event.providerPaymentId = trimmed.length > 0 ? trimmed : null;
  }
});
