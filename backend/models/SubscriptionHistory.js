import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const SubscriptionHistory = sequelize.define(
  "SubscriptionHistory",
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

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },

    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    planName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    planType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    amountPaid: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    startsAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    endsAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    subscriptionStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    paymentMethod: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isGroupSubscription: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    renewedNextPeriod: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    tableName: "SubscriptionHistories",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "subscription_histories_subscription_id_unique",
        fields: ["subscriptionId"],
        unique: true,
      },
      {
        name: "subscription_histories_user_id_idx",
        fields: ["userId"],
      },
      {
        name: "subscription_histories_plan_id_idx",
        fields: ["planId"],
      },
      {
        name: "subscription_histories_payment_id_idx",
        fields: ["paymentId"],
      },
      {
        name: "subscription_histories_plan_type_idx",
        fields: ["planType"],
      },
      {
        name: "subscription_histories_starts_at_idx",
        fields: ["startsAt"],
      },
      {
        name: "subscription_histories_ends_at_idx",
        fields: ["endsAt"],
      },
      {
        name: "subscription_histories_renewed_next_period_idx",
        fields: ["renewedNextPeriod"],
      },
    ],
  }
);

SubscriptionHistory.beforeValidate((history) => {
  for (const field of [
    "planName",
    "planType",
    "subscriptionStatus",
    "source",
    "paymentMethod",
  ]) {
    if (typeof history[field] === "string") {
      const trimmed = history[field].trim();
      history[field] = trimmed.length > 0 ? trimmed : null;
    }
  }
});
