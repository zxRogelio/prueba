import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const SubscriptionGroupMember = sequelize.define(
  "SubscriptionGroupMember",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Se llena si el correo invitado ya tiene cuenta o se registra",
    },

    invitedEmail: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "member",
      comment: "owner, member",
    },

    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "pending_invitation",
      comment:
        "pending_invitation, accepted, approved, active, rejected, removed",
    },

    priceShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    rejectedReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    removedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "SubscriptionGroupMembers",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["groupId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["invitedEmail"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["groupId", "invitedEmail"],
        unique: true,
      },
    ],
  }
);