import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const SubscriptionGroup = sequelize.define(
  "SubscriptionGroup",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "Usuario titular que compró o solicitó el paquete",
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    memberLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },

    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    pricePerPerson: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    startsAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    endsAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "pending_members",
      comment:
        "pending_members, pending_admin_approval, active, expired, cancelled",
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin si el paquete fue registrado manualmente",
    },

    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "SubscriptionGroups",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["planId"],
      },
      {
        fields: ["ownerUserId"],
      },
      {
        fields: ["paymentId"],
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