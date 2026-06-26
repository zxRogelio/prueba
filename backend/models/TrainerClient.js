import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const TrainerClient = sequelize.define(
  "TrainerClient",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    trainerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "active",
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "TrainerClients",
    schema: "core",
    timestamps: true,
  }
);