import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const TrainerAgendaItem = sequelize.define(
  "TrainerAgendaItem",
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

    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    mode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "presencial",
    },

    location: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "scheduled",
    },
  },
  {
    tableName: "TrainerAgendaItems",
    schema: "core",
    timestamps: true,
  }
);