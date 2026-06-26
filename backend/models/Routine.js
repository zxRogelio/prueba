import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Routine = sequelize.define(
  "Routine",
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

    objective: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "principiante",
    },

    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "general",
    },

    durationWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
    },

    daysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },

    estimatedMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 45,
    },

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    imagePublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    videoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    videoPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    videoType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "none",
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
  },
  {
    tableName: "Routines",
    schema: "core",
    timestamps: true,
  }
);