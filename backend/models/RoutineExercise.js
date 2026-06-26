import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const RoutineExercise = sequelize.define(
  "RoutineExercise",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    routineId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    dayNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    sets: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    reps: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    restSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "RoutineExercises",
    schema: "core",
    timestamps: true,
  }
);