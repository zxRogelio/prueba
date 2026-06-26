import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const UserSubscription = sequelize.define(
  "UserSubscription",
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
      allowNull: false,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    groupId: {
      type: DataTypes.UUID,
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

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "active",
      comment: "pending, active, expired, cancelled",
    },

    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "admin_manual",
      comment: "admin_manual, online_checkout, group_package",
    },

    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin que creó o activó la suscripción",
    },

    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "UserSubscriptions",
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
        fields: ["paymentId"],
      },
      {
        fields: ["groupId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["startsAt"],
      },
      {
        fields: ["endsAt"],
      },
    ],
  }
);