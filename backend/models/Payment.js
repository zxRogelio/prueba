import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PAYMENT_METHODS = Object.freeze([
  "cash",
  "transfer",
  "card_terminal",
  "online_checkout",
]);

export const PAYMENT_SOURCES = Object.freeze([
  "admin_manual",
  "online_checkout",
]);

export const PAYMENT_PROVIDERS = Object.freeze([
  "none",
  "bank_transfer",
  "mercadopago_terminal",
  "mercadopago_checkout",
]);

export const PAYMENT_STATUSES = Object.freeze([
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);

const LEGACY_METHOD_MAP = Object.freeze({
  online_card: "online_checkout",
  online_wallet: "online_checkout",
});

const LEGACY_PROVIDER_MAP = Object.freeze({
  mercadopago_point: "mercadopago_terminal",
});

const nullableStringFields = [
  "providerPreferenceId",
  "providerPaymentId",
  "externalReference",
  "providerStatus",
  "providerStatusDetail",
  "idempotencyKey",
  "reference",
];

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

    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    planId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment:
        "LEGACY: relacion directa con MembershipPlan. Mantener temporalmente hasta migrar a OrderItem.",
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment:
        "LEGACY: relacion directa con UserSubscription. Mantener temporalmente hasta migrar a OrderItem.",
    },

    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment:
        "LEGACY: relacion directa con SubscriptionGroup. Mantener temporalmente hasta migrar a OrderItem.",
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
      comment: "cash, transfer, card_terminal, online_checkout",
      validate: {
        isIn: [PAYMENT_METHODS],
      },
    },

    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "admin_manual",
      comment: "admin_manual, online_checkout",
      validate: {
        isIn: [PAYMENT_SOURCES],
      },
    },

    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "none",
      comment:
        "none, bank_transfer, mercadopago_terminal, mercadopago_checkout",
      validate: {
        isIn: [PAYMENT_PROVIDERS],
      },
    },

    providerPreferenceId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    providerPaymentId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    externalReference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    providerStatus: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    providerStatusDetail: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    idempotencyKey: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "pending",
      comment: "pending, paid, failed, cancelled, refunded",
      validate: {
        isIn: [PAYMENT_STATUSES],
      },
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "MXN",
      validate: {
        len: [3, 3],
      },
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

    approvedAt: {
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

    metadata: {
      type: DataTypes.JSONB,
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
        name: "payments_order_id",
        fields: ["orderId"],
      },
      {
        name: "payments_user_id",
        fields: ["userId"],
      },
      {
        name: "payments_plan_id",
        fields: ["planId"],
      },
      {
        name: "payments_subscription_id",
        fields: ["subscriptionId"],
      },
      {
        name: "payments_group_id",
        fields: ["groupId"],
      },
      {
        name: "payments_status",
        fields: ["status"],
      },
      {
        name: "payments_method",
        fields: ["method"],
      },
      {
        name: "payments_source",
        fields: ["source"],
      },
      {
        name: "payments_provider",
        fields: ["provider"],
      },
      {
        name: "payments_created_at",
        fields: ["createdAt"],
      },
      {
        name: "payments_external_reference_unique",
        fields: ["externalReference"],
        unique: true,
        where: {
          externalReference: {
            [Op.ne]: null,
          },
        },
      },
      {
        name: "payments_idempotency_key_unique",
        fields: ["idempotencyKey"],
        unique: true,
        where: {
          idempotencyKey: {
            [Op.ne]: null,
          },
        },
      },
      {
        name: "payments_provider_payment_id_unique",
        fields: ["provider", "providerPaymentId"],
        unique: true,
        where: {
          providerPaymentId: {
            [Op.ne]: null,
          },
        },
      },
    ],
  }
);

Payment.beforeValidate((payment) => {
  if (payment.method && LEGACY_METHOD_MAP[payment.method]) {
    payment.method = LEGACY_METHOD_MAP[payment.method];
  }

  if (payment.provider && LEGACY_PROVIDER_MAP[payment.provider]) {
    payment.provider = LEGACY_PROVIDER_MAP[payment.provider];
  }

  if (payment.currency) {
    payment.currency = String(payment.currency).trim().toUpperCase();
  }

  for (const field of nullableStringFields) {
    const value = payment[field];

    if (typeof value === "string") {
      const trimmed = value.trim();
      payment[field] = trimmed.length > 0 ? trimmed : null;
    }
  }

  if (payment.status === "paid" && !payment.approvedAt && payment.paidAt) {
    payment.approvedAt = payment.paidAt;
  }
});
